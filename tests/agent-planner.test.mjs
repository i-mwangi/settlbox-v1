import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAmount } from "../services/arc/amount.ts";
import { planBusinessActions, validateAgentPlanRequest } from "../services/arc/agent-planner.ts";
import { AgentRunRepository } from "../services/server/agent-runs.ts";
import { SqlitePaymentRepository } from "../services/server/payment-repository.ts";

const address = `0x${"1".repeat(40)}`;
const request = { requestId: randomUUID(), throughDate: "2026-10-31", reserveUsdc: "1" };
const record = { id: "bill-a", companyId: "company", kind: "bill", title: "Hosting", counterparty: "Vendor", recipient: address, amount: "1", dueDate: "2026-10-15", description: "Hosting", status: "draft", transactionHash: null, paymentLinkCode: null, createdAt: "2026-10-10", updatedAt: "2026-10-10" };
const context = { companyId: "company", balanceBaseUnits: parseAmount("10").toString(), reservedBaseUnits: "0", committedTodayBaseUnits: "0", policy: { allowedRecipients: [address], maxPaymentBaseUnits: parseAmount("2").toString(), dailyLimitBaseUnits: parseAmount("2").toString(), approvalThresholdBaseUnits: "0", requiredApprovals: 1 }, records: [record] };

test("planning preserves records and never counts receivables as available cash", () => {
  const input = structuredClone(context);
  input.records.push({ ...record, id: "invoice", kind: "invoice", amount: "1000" });
  const before = structuredClone(input);
  const result = planBusinessActions(request, input);
  assert.equal(result.mode, "proposal_only");
  assert.equal(result.engine, "deterministic");
  assert.equal(result.balanceUsdc, "10");
  assert.equal(result.obligationsUsdc, "1");
  assert.equal(result.unallocatedUsdc, "8");
  assert.deepEqual(result.cashPosition,{protectedUsdc:"0",availableBeforePaymentsUsdc:"9",reviewablePaymentsUsdc:"1",blockedPaymentsUsdc:"0",receivablesUsdc:"1000",priorityRule:"earliest_due_first"});
  assert.deepEqual(input, before);
});

test("decision evidence prioritizes due dates and distinguishes protected cash from blocked debt",()=>{
 const result=planBusinessActions(request,{...context,reservedBaseUnits:parseAmount("7").toString(),records:[{...record,id:"later",dueDate:"2026-10-30",amount:"2"},{...record,id:"earlier",dueDate:"2026-10-14",amount:"1"}]});
 assert.deepEqual(result.actions.map(row=>row.recordId),["earlier","later"]);
 assert.equal(result.actions[0].disposition,"review");
 assert.equal(result.actions[1].disposition,"blocked");
 assert.match(result.actions[1].reasons.join(),/reserved liquidity/);
 assert.deepEqual(result.cashPosition,{protectedUsdc:"7",availableBeforePaymentsUsdc:"2",reviewablePaymentsUsdc:"1",blockedPaymentsUsdc:"2",receivablesUsdc:"0",priorityRule:"earliest_due_first"});
 assert.equal(result.unallocatedUsdc,"1");
});

test("planning respects cumulative daily commitments, reserved cash and recipient restrictions", () => {
  const result = planBusinessActions(request, { ...context, committedTodayBaseUnits: parseAmount("1").toString(), records: [record, { ...record, id: "bill-b" }, { ...record, id: "bill-c", recipient: `0x${"2".repeat(40)}` }] });
  assert.equal(result.actions[0].disposition, "review");
  assert.equal(result.actions[1].disposition, "blocked");
  assert.match(result.actions[1].reasons.join(), /daily limit/);
  assert.match(result.actions[2].reasons.join(), /allowlist/);
  const lowCash = planBusinessActions(request, { ...context, reservedBaseUnits: parseAmount("9").toString() });
  assert.equal(lowCash.actions[0].disposition, "blocked");
});

test("planning excludes terminal and future records and blocks active payments", () => {
  const result = planBusinessActions(request, { ...context, records: [ { ...record, status: "paid" }, { ...record, id: "later", dueDate: "2026-11-01" }, { ...record, id: "active", status: "processing" } ] });
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].disposition, "blocked");
  assert.match(result.actions[0].reasons.join(), /active workflow/);
});

test("planning rejects foreign or incomplete records and unsupported parameters", () => {
  assert.throws(() => planBusinessActions(request, { ...context, records: [{ ...record, companyId: "another" }] }), /another company/);
  assert.throws(() => planBusinessActions(request, { ...context, records: Array(500).fill(record) }), /complete record set/);
  assert.throws(() => validateAgentPlanRequest({ ...request, execute: true }), /Unsupported/);
  assert.throws(() => validateAgentPlanRequest({ ...request, throughDate: "2026-02-30" }), /calendar/);
});

test("agent history survives reopening, isolates companies and binds retries to original terms", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-agent-"));
  const path = join(directory, "business.sqlite");
  let repository = new AgentRunRepository(path);
  try {
    const plan = planBusinessActions(request, context);
    const first = repository.save("company", "owner", request, plan);
    assert.deepEqual(repository.save("company", "owner", request, { ...plan, balanceUsdc: "999" }), first);
    assert.throws(() => repository.find("company", { ...request, reserveUsdc: "2" }), /different planning terms/);
    repository.close();
    repository = new AgentRunRepository(path);
    assert.deepEqual(repository.list("company"), [first]);
    assert.deepEqual(repository.list("another"), []);
  } finally { repository.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("planning commitments include active reservations and isolate company and wallet", async () => {
  const repository = new SqlitePaymentRepository(":memory:");
  try {
    const wallet = { id: "wallet", companyId: "company", address, chainId: 5042002 };
    repository.saveAccount({ wallet, policy: context.policy, balanceBaseUnits: context.balanceBaseUnits, gasReserveBaseUnits: "0" });
    const id = randomUUID();
    await repository.reserveAuthorizedAtomically({ id, companyId: "company", walletId: "wallet", recipient: address, purpose: "bill", idempotencyKey: id, amount: { symbol: "USDC", decimals: 18, baseUnits: parseAmount("1").toString() } }, () => "ready");
    assert.deepEqual(repository.planningCommitments("company", "wallet"), { reservedBaseUnits: parseAmount("1").toString(), committedTodayBaseUnits: parseAmount("1").toString() });
    assert.deepEqual(repository.planningCommitments("another", "wallet"), { reservedBaseUnits: "0", committedTodayBaseUnits: "0" });
    assert.deepEqual(repository.planningCommitments("company", "other-wallet"), { reservedBaseUnits: "0", committedTodayBaseUnits: "0" });
  } finally { repository.close(); }
});
