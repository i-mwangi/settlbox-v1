import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const base = process.env.SETTLBOX_VERIFY_URL || "http://127.0.0.1:3002";
const url = new URL(base);
assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol === "http:");
const marker = randomUUID();
const session = await fetch(`${base}/api/operator/session`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ token: process.env.SETTLBOX_OPERATOR_TOKEN }) });
assert.equal(session.status, 200);
const ownerCookie = session.headers.get("set-cookie")?.split(";")[0];
assert.ok(ownerCookie);
async function request(path, method = "GET", body, expected = 200, cookie = ownerCookie) {
  const response = await fetch(`${base}${path}`, { method, headers: { Cookie: cookie || "", Origin: base, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(response.status, expected, `${method} ${path}`);
  return response.json();
}
const cleanup = [];
try {
  for (const path of ["/api/team", "/api/workspace/employees", "/api/group-collections"]) await request(path, "GET", undefined, 401, "");
  const group = await request("/api/workspace/employee-groups", "POST", { name: `Verification ${marker}`, shape: "CIRCLE", color: "#306bff" }, 201);
  cleanup.push(() => request("/api/workspace/employee-groups", "DELETE", { ids: [group.id] }));
  const employee = await request("/api/workspace/employees", "POST", { name: `Employee ${marker}`, email: "employee@example.test", walletAddress: `0x${"1".repeat(40)}`, groupIds: [group.id] }, 201);
  cleanup.push(() => request("/api/workspace/employees", "DELETE", { ids: [employee.id] }));
  await request("/api/workspace/employee-groups", "DELETE", { ids: [group.id] }, 400);
  const updated = await request("/api/workspace/employees", "PATCH", { id: employee.id, data: { description: "Saved over HTTP", companyId: "unauthorized", id: 1 } });
  assert.equal(updated.id, employee.id);
  assert.equal(updated.companyId, employee.companyId);
  assert.equal((await request("/api/workspace/employees")).find(item => item.id === employee.id).description, "Saved over HTTP");
  await request("/api/workspace/employees", "POST", { name: "Invalid wallet", walletAddress: "0x1234" }, 400);

  const treasury = await request("/api/treasury");
  const originalPresentation = (await request("/api/workspace/invoice-settings"))[0];
  const presentation = { accentColor: "#123456", footerText: `Footer ${marker} <safe>`, companyTaxId: `TAX-${marker}`, showTaxId: true };
  if (originalPresentation) {
    await request("/api/workspace/invoice-settings", "PATCH", { id: originalPresentation.id, data: presentation });
    cleanup.push(() => request("/api/workspace/invoice-settings", "PATCH", { id: originalPresentation.id, data: originalPresentation }));
  } else {
    const saved = await request("/api/workspace/invoice-settings", "POST", presentation, 201);
    cleanup.push(() => request("/api/workspace/invoice-settings", "DELETE", { ids: [saved.id] }));
  }
  await request("/api/workspace/invoice-settings", "POST", presentation, 400);
  const printableInvoice = await request("/api/business-records", "POST", { kind: "invoice", title: `Print verification ${marker}`, counterparty: "Test client", recipient: treasury.wallet.address, amount: "0.001", dueDate: new Date().toISOString().slice(0, 10), description: "Invoice presentation verification" }, 201);
  cleanup.push(() => request(`/api/business-records/${printableInvoice.id}`, "PATCH", { action: "cancel" }));
  const invoiceDocument = await fetch(`${base}/api/business-records/${printableInvoice.id}/document`, { headers: { Cookie: ownerCookie } });
  assert.equal(invoiceDocument.status, 200);
  const printed = await invoiceDocument.text();
  assert.ok(printed.includes("border-bottom:2px solid #123456"));
  assert.ok(printed.includes(`TAX-${marker}`));
  assert.ok(printed.includes(`Footer ${marker} &lt;safe&gt;`));
  if (existsSync(".data/gift-verification.json")) {
    const gifts = JSON.parse(readFileSync(".data/gift-verification.json", "utf8"));
    assert.equal((await request("/api/gifts/config", "GET", undefined, 200, "")).chainId, 5042002);
    await request("/api/gifts/invalid", "GET", undefined, 400, "");
    await request("/api/gifts", "GET", undefined, 401, "");
    for (const [id, step, status] of [[gifts.claimId, "fundClaim", "claimed"], [gifts.refundId, "fundRefund", "refunded"]]) {
      assert.equal((await request(`/api/gifts/${id}`, "GET", undefined, 200, "")).status, status);
      const funding = { id, transactionHash: gifts.transactions[step].hash };
      assert.equal((await request("/api/gifts", "POST", funding, 201)).status, status);
      await request("/api/gifts", "POST", funding, 201);
      assert.equal((await request("/api/gifts")).filter(gift => gift.id === id).length, 1);
    }
    await request("/api/gifts", "POST", { id: gifts.claimId, transactionHash: gifts.transactions.refund.hash }, 400);
  }
  const scheduleInput = { id: randomUUID(), frequency: "once", endDate: null, payment: { kind: "bill", title: `Schedule ${marker}`, counterparty: "Verification vendor", amount: "0.001", recipient: treasury.policy.allowedRecipients[0], dueDate: new Date().toISOString().slice(0, 10), description: "Scheduled draft verification" } };
  const schedule = await request("/api/payment-schedules", "POST", scheduleInput, 201);
  assert.equal((await request("/api/payment-schedules", "POST", scheduleInput, 201)).id, schedule.id);
  await request("/api/payment-schedules", "POST", { ...scheduleInput, frequency: "weekly" }, 400);
  await request("/api/payment-schedules", "POST", { action: "prepare" });
  const scheduledDrafts = (await request("/api/business-records")).filter(record => record.scheduleId === schedule.id);
  assert.equal(scheduledDrafts.length, 1);
  assert.equal(scheduledDrafts[0].status, "draft");
  assert.equal(scheduledDrafts[0].amount, "0.001");
  cleanup.push(() => request(`/api/business-records/${scheduledDrafts[0].id}`, "PATCH", { action: "cancel" }));
  await request("/api/payment-schedules", "POST", { action: "prepare" });
  assert.equal((await request("/api/business-records")).filter(record => record.scheduleId === schedule.id).length, 1);
  assert.equal((await request("/api/payment-schedules")).find(record => record.id === schedule.id).status, "completed");
  const reimbursement = await request("/api/business-records", "POST", { kind: "reimbursement", title: `Verification ${marker}`, counterparty: "Employee", amount: "0.001", recipient: treasury.policy.allowedRecipients[0], dueDate: new Date().toISOString().slice(0, 10), description: "Receipt workflow verification" }, 201);
  cleanup.push(() => request(`/api/business-records/${reimbursement.id}`, "PATCH", { action: "cancel" }));
  const document = await fetch(`${base}/api/business-records/${reimbursement.id}/document`, { headers: { Cookie: ownerCookie } });
  assert.equal(document.status, 200);
  assert.ok((await document.text()).includes("0.001 USDC"));
  assert.ok(document.headers.get("content-security-policy").includes("default-src 'none'"));
  const batchInput = { id: randomUUID(), payments: [{ kind: "bill", title: `Batch verification ${marker}`, counterparty: "Vendor", amount: "0.001", recipient: treasury.policy.allowedRecipients[0], dueDate: new Date().toISOString().slice(0, 10), description: "Batch draft verification" }] };
  const draftId = randomUUID();
  const draftHeaders = { Cookie: ownerCookie, Origin: base, "Content-Type": "application/json", "Idempotency-Key": draftId };
  const draftPayload = JSON.stringify(batchInput.payments[0]);
  const firstDraft = await fetch(`${base}/api/business-records`, { method: "POST", headers: draftHeaders, body: draftPayload });
  assert.equal(firstDraft.status, 201);
  const draft = await firstDraft.json();
  cleanup.push(() => request(`/api/business-records/${draft.id}`, "PATCH", { action: "cancel" }));
  const repeatedDraft = await fetch(`${base}/api/business-records`, { method: "POST", headers: draftHeaders, body: draftPayload });
  assert.equal(repeatedDraft.status, 201);
  assert.equal((await repeatedDraft.json()).id, draft.id);
  assert.equal((await fetch(`${base}/api/business-records`, { method: "POST", headers: draftHeaders, body: JSON.stringify({ ...batchInput.payments[0], amount: "2" }) })).status, 400);
  const batch = await request("/api/business-records/batch", "POST", batchInput, 201);
  cleanup.push(() => request(`/api/business-records/${batch[0].id}`, "PATCH", { action: "cancel" }));
  assert.equal((await request("/api/business-records/batch", "POST", batchInput, 201))[0].id, batch[0].id);
  await request("/api/business-records/batch", "POST", { ...batchInput, payments: [{ ...batchInput.payments[0], amount: "0.002" }] }, 400);

  const collectionInput = { id: randomUUID(), title: `Verification ${marker}`, amount: "0.001", memberCount: 3 };
  const collection = await request("/api/group-collections", "POST", collectionInput, 201);
  const repeated = await request("/api/group-collections", "POST", collectionInput, 201);
  assert.deepEqual(repeated.members.map(member => member.linkCode), collection.members.map(member => member.linkCode));
  assert.equal(collection.members.length, 3);
  assert.equal(collection.members.filter(member => member.paid).length, 0);
  await request(`/api/payment-links/${collection.members[0].linkCode}`, "PATCH", { amount: "2" }, 400);

  const account = privateKeyToAccount(generatePrivateKey());
  const invitation = await request("/api/team", "POST", { firstName: "Verification", lastName: "Member", email: `verify-${marker}@example.test`, role: "VIEWER" }, 201);
  cleanup.push(() => request("/api/team", "DELETE", { id: invitation.member.id }));
  const challenge = await request("/api/team/auth", "POST", { action: "challenge", token: invitation.token, address: account.address }, 200, "");
  const signature = await account.signMessage({ message: challenge.message });
  const authentication = await fetch(`${base}/api/team/auth`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", id: challenge.id, signature }) });
  assert.equal(authentication.status, 200);
  const memberCookie = authentication.headers.get("set-cookie")?.split(";")[0];
  assert.ok(memberCookie);
  await request("/api/team/auth", "POST", { action: "verify", id: challenge.id, signature }, 401, "");
  assert.equal((await request("/api/operator/session", "GET", undefined, 200, memberCookie)).principal.role, "VIEWER");
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6CQAAAABJRU5ErkJggg==", "base64");
  const form = new FormData();
  form.set("file", new File([image], "receipt.png", { type: "image/png" }));
  const upload = await fetch(`${base}/api/uploads`, { method: "POST", headers: { Cookie: memberCookie, Origin: base }, body: form });
  assert.equal(upload.status, 201);
  const receipt = await upload.json();
  const receiptResponse = await fetch(`${base}${receipt.url}`, { headers: { Cookie: memberCookie } });
  assert.equal(receiptResponse.status, 200);
  assert.deepEqual(Buffer.from(await receiptResponse.arrayBuffer()), image);
  assert.equal((await fetch(`${base}${receipt.url}`)).status, 401);
  const invalidForm = new FormData();
  invalidForm.set("file", new File(["<script>alert(1)</script>"], "fake.png", { type: "image/png" }));
  assert.equal((await fetch(`${base}/api/uploads`, { method: "POST", headers: { Cookie: memberCookie, Origin: base }, body: invalidForm })).status, 400);
  await request("/api/workspace/employees", "GET", undefined, 200, memberCookie);
  await request("/api/workspace/employees", "POST", { name: "Denied" }, 401, memberCookie);
  await request("/api/payment-schedules", "POST", { action: "prepare" }, 401, memberCookie);
  await request("/api/gifts", "POST", { id: "denied" }, 401, memberCookie);
  await request("/api/team/profile", "PATCH", { firstName: "Updated", role: "ADMIN", id: 1 }, 200, memberCookie);
  assert.equal((await request("/api/operator/session", "GET", undefined, 200, memberCookie)).principal.role, "VIEWER");
  await request("/api/team", "PATCH", { id: invitation.member.id, data: { status: "SUSPENDED" } });
  await request("/api/workspace/employees", "GET", undefined, 401, memberCookie);
  console.log("Workspace HTTP verification passed: persistence, validation, reimbursement documents, invoice presentation, collection retries, scheduled drafts, gift records, signed invitations, private uploads, role restrictions, and immediate session revocation.");
} finally {
  for (const operation of cleanup.reverse()) await operation();
}
