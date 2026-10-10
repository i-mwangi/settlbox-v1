import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createPublicClient, http } from "viem";
import { createCircleWalletService } from "../services/server/circle-wallets.ts";

async function main() {
  const base = process.env.SETTLBOX_VERIFY_URL || "http://127.0.0.1:3002";
  const url = new URL(base);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.protocol !== "http:") throw new Error("Verification server must be local HTTP");
  assert.equal((await fetch(`${base}/api/business-records`)).status, 401);
  const session = await fetch(`${base}/api/operator/session`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ token: process.env.SETTLBOX_OPERATOR_TOKEN }) });
  assert.equal(session.status, 200);
  const cookie = session.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const headers = { Cookie: cookie, Origin: base, "Content-Type": "application/json" };
  async function request(path, method = "GET", body, expected = 200) {
    const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.equal(response.status, expected, `Unexpected status for ${method} ${path}`);
    return response.json();
  }
  const treasury = await request("/api/treasury");
  assert.equal(treasury.wallet.chainId, 5042002);
  const input = { kind: "invoice", title: "Verification invoice", counterparty: "Test customer", amount: "0.001", recipient: treasury.wallet.address, dueDate: new Date().toISOString().slice(0, 10), description: "Arc Testnet workflow verification" };
  assert.equal((await fetch(`${base}/api/business-records`, { method: "POST", headers: { ...headers, Origin: "http://untrusted.example" }, body: JSON.stringify(input) })).status, 401);
  await request("/api/business-records", "POST", { ...input, amount: "0" }, 400);
  await request("/api/business-records", "POST", { ...input, recipient: "0x1234" }, 400);
  const invoice = await request("/api/business-records", "POST", input, 201);
  const draft = await request(`/api/business-records/${invoice.id}`, "PATCH", { action: "edit", data: { ...input, title: "Verified invoice" } });
  assert.equal(draft.title, "Verified invoice");
  const issued = await request(`/api/business-records/${invoice.id}`, "PATCH", { action: "issue" });
  assert.equal(issued.status, "issued");
  assert.equal((await request(`/api/business-records/${invoice.id}`, "PATCH", { action: "issue" })).paymentLinkCode, issued.paymentLinkCode);
  await request(`/api/business-records/${invoice.id}`, "PATCH", { action: "edit", data: input }, 409);
  const lookup = await fetch(`${base}/api/payment-links/${issued.paymentLinkCode}`);
  assert.equal(lookup.status, 200);
  assert.equal((await lookup.json()).amount, input.amount);
  await request(`/api/payment-links/${issued.paymentLinkCode}`, "PATCH", { amount: "0.0001" }, 400);
  assert.equal((await request(`/api/business-records/${invoice.id}`, "PATCH", { action: "refresh" })).status, "issued");
  assert.equal((await request(`/api/business-records/${invoice.id}`, "PATCH", { action: "cancel" })).status, "cancelled");
  assert.equal((await request(`/api/payment-links/${issued.paymentLinkCode}`)).status, "DEACTIVATED");
  if (process.argv.includes("--settle")) {
    const path = ".data/business-verification.json";
    const journal = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
    for (const kind of ["bill", "payroll", "reimbursement"]) {
      if (!journal[kind]) {
        const record = await request("/api/business-records", "POST", { ...input, kind, title: `Verification ${kind}`, recipient: treasury.policy.allowedRecipients[0] }, 201);
        journal[kind] = record.id;
        writeFileSync(path, JSON.stringify(journal));
      }
      const id = journal[kind];
      let record = await request(`/api/business-records/${id}`, "PATCH", { action: "pay" });
      if (record.status === "awaiting_approval") await request(`/api/treasury/payments/${id}/approve`, "POST");
      for (let attempt = 0; attempt < 20 && record.status !== "paid"; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        record = await request(`/api/business-records/${id}`, "PATCH", { action: "refresh" });
        assert.notEqual(record.status, "failed");
      }
      assert.equal(record.status, "paid");
      assert.match(record.transactionHash, /^0x[0-9a-fA-F]{64}$/);
      assert.equal((await request(`/api/business-records/${id}`, "PATCH", { action: "pay" })).transactionHash, record.transactionHash);
      console.log(`${kind} settled on Arc Testnet: ${record.transactionHash}`);
    }
  }
  if (process.argv.includes("--settle-invoice")) {
    const path = ".data/business-verification.json";
    const journal = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
    const save = () => writeFileSync(path, JSON.stringify(journal));
    if (!journal.invoice) {
      journal.invoice = (await request("/api/business-records", "POST", { ...input, title: "Checkout settlement verification" }, 201)).id;
      save();
    }
    const invoice = await request(`/api/business-records/${journal.invoice}`, "PATCH", { action: "issue" });
    const payer = JSON.parse(readFileSync(".data/circle-testnet-verification.json", "utf8")).destination;
    assert.ok(payer?.id && payer.address && payer.address.toLowerCase() !== treasury.wallet.address.toLowerCase());
    const circle = createCircleWalletService();
    if (!journal.invoiceHash) {
      const reader = createPublicClient({ transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.io") });
      assert.equal(await reader.getChainId(), 5042002);
      if (await reader.getBalance({ address: payer.address }) < 100000000000000000n) throw new Error(`Invoice payer needs 0.1 test USDC for payment and Circle gas funding: ${payer.address}`);
      if (journal.invoiceProviderId) {
        const previous = await circle.inspect(journal.invoicePaymentId, journal.invoiceProviderId);
        if (previous.status === "failed") {
          journal.failedInvoiceAttempts ||= [];
          if (journal.failedInvoiceAttempts.length >= 2) throw new Error("Invoice verification needs manual review after repeated provider failures");
          journal.failedInvoiceAttempts.push({ paymentId: journal.invoicePaymentId, providerId: journal.invoiceProviderId, reason: previous.failureReason });
          delete journal.invoiceProviderId;
          journal.invoicePaymentId = randomUUID();
          save();
        }
      }
      journal.invoicePaymentId ||= randomUUID();
      save();
      if (!journal.invoiceProviderId) {
        const execution = await circle.submit({ id: journal.invoicePaymentId, idempotencyKey: journal.invoicePaymentId, companyId: "settlbox-checkout-verification", walletId: payer.id, recipient: treasury.wallet.address, amount: { symbol: "USDC", decimals: 18, baseUnits: "1000000000000000" }, purpose: "invoice" });
        journal.invoiceProviderId = execution.providerTransactionId;
        save();
      }
      assert.ok(journal.invoiceProviderId);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const execution = await circle.inspect(journal.invoicePaymentId, journal.invoiceProviderId);
        assert.notEqual(execution.status, "failed", execution.failureReason || "Invoice verification payment failed");
        if (execution.status === "confirmed") { journal.invoiceHash = execution.transactionHash; save(); break; }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    assert.ok(journal.invoiceHash);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const settlement = await request(`/api/payment-links/${invoice.paymentLinkCode}/payments`, "POST", { txid: journal.invoiceHash });
      assert.equal(settlement.paymentCount, 1);
    }
    assert.equal((await request("/api/business-records")).find(record => record.id === journal.invoice).status, "paid");
    assert.equal((await request(`/api/payment-links/${invoice.paymentLinkCode}`)).status, "DEACTIVATED");
    await request(`/api/business-records/${journal.invoice}`, "PATCH", { action: "cancel" }, 409);
    console.log(`Invoice collection settled on Arc Testnet: ${journal.invoiceHash}`);
  }
  const notifications = await request("/api/notifications");
  assert.ok(Array.isArray(notifications));
  if (notifications[0]) await request("/api/notifications", "PATCH", { action: "read", id: notifications[0].id });
  console.log("Business authentication, validation, draft editing, invoice issuance, and cancellation passed");
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Business verification failed"); process.exitCode = 1; });
