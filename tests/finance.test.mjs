import test from "node:test";
import assert from "node:assert/strict";
import { parseAmount, formatAmount } from "../services/arc/amount.ts";
import { authorizePayment } from "../services/arc/policy.ts";
import { createPaymentService } from "../services/arc/payment-service.ts";

const recipient = `0x${"1".repeat(40)}`;
const payment = {
  id: "payment-1", companyId: "company-1", walletId: "wallet-1", recipient,
  amount: { symbol: "USDC", baseUnits: "100", decimals: 18 },
  purpose: "payroll", idempotencyKey: "payroll-1-recipient-1",
};
const authorization = {
  wallet: { id: "wallet-1", companyId: "company-1", address: recipient, chainId: 5042002 },
  availableBaseUnits: "1000", spentTodayBaseUnits: "0", reservedTodayBaseUnits: "0", approvedBy: [],
  policy: { allowedRecipients: [recipient], maxPaymentBaseUnits: "500", dailyLimitBaseUnits: "1000", approvalThresholdBaseUnits: "100", requiredApprovals: 2 },
};

test("amounts preserve precision beyond JavaScript safe integers", () => {
  const amount = "9007199254740993.000000000000000001";
  assert.equal(formatAmount(parseAmount(amount)), amount);
  assert.throws(() => parseAmount("1.0000000000000000001"));
  assert.throws(() => parseAmount("1e3"));
  assert.throws(() => parseAmount("-1"));
});

test("approvals count distinct identities at the threshold", () => {
  assert.equal(authorizePayment(payment, authorization), "awaiting_approval");
  assert.equal(authorizePayment(payment, { ...authorization, approvedBy: ["a", "a"] }), "awaiting_approval");
  assert.equal(authorizePayment(payment, { ...authorization, approvedBy: ["a", "b"] }), "ready");
});

test("policy includes reserved payments in the daily limit", () => {
  assert.throws(() => authorizePayment(payment, { ...authorization, reservedTodayBaseUnits: "950" }), /daily limit/);
  assert.throws(() => authorizePayment({ ...payment, companyId: "another-company" }, authorization), /account mismatch/);
  assert.throws(() => authorizePayment({ ...payment, recipient: `0x${"2".repeat(40)}` }, authorization), /not authorized/);
});

test("existing reservations do not submit another payment", async () => {
  let submissions = 0;
  const execution = { paymentId: payment.id, status: "submitted" };
  const service = createPaymentService({
    repository: {
      reserveAuthorizedAtomically: async () => ({ created: false, execution }),
      markSubmitted: async () => assert.fail("Unexpected write"),
    },
    executor: { submit: async () => { submissions += 1; return execution; } },
  });
  assert.deepEqual(await service.submit(payment), execution);
  assert.equal(submissions, 0);
});

test("pending approvals never invoke the payment executor", async () => {
  const service = createPaymentService({
    repository: {
      reserveAuthorizedAtomically: async (intent, evaluate) => ({ created: true, execution: { paymentId: intent.id, status: evaluate(authorization) } }),
      markSubmitted: async () => assert.fail("Unexpected write"),
    },
    executor: { submit: async () => assert.fail("Unexpected submission") },
  });
  assert.equal((await service.submit(payment)).status, "awaiting_approval");
});

test("invalid executor responses cannot become submitted records", async () => {
  const service = createPaymentService({
    repository: {
      reserveAuthorizedAtomically: async () => ({ created: true, execution: { paymentId: payment.id, status: "ready" } }),
      markSubmitted: async () => assert.fail("Unexpected write"),
    },
    executor: { submit: async () => ({ paymentId: payment.id, status: "submitted" }) },
  });
  await assert.rejects(service.submit(payment), /Invalid payment submission/);
});

test("uncertain submission retains its reservation", async () => {
  let reserved = false;
  let attempts = 0;
  const service = createPaymentService({
    repository: {
      reserveAuthorizedAtomically: async () => {
        const created = !reserved;
        reserved = true;
        return { created, execution: { paymentId: payment.id, status: "ready" } };
      },
      markSubmitted: async () => assert.fail("Unexpected write"),
    },
    executor: { submit: async () => { attempts += 1; throw new Error("Connection interrupted"); } },
  });
  await assert.rejects(service.submit(payment), /Connection interrupted/);
  await service.submit(payment);
  assert.equal(attempts, 1);
});
