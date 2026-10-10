import assert from "node:assert/strict";

const base = process.env.SETTLBOX_VERIFY_URL || "http://127.0.0.1:3002";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const session = await fetch(`${base}/api/operator/session`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ token: process.env.SETTLBOX_OPERATOR_TOKEN }) });
assert.equal(session.status, 200);
const cookie = session.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);
const headers = { Cookie: cookie, Origin: base, "Content-Type": "application/json" };
async function request(path, method = "GET", body) {
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json();
  assert.ok(response.ok, typeof value.error === "string" ? value.error : `Request failed: ${response.status}`);
  return value;
}
try {
  const workspace = await request("/api/seeded-workspace?entity=entity-3");
  const name = "Arc workflow test";
  let employee = workspace.data.employees.find(employee => employee.name === name);
  if (!employee) {
    const now = new Date().toISOString();
    employee = { ...workspace.data.employees[0], id: Math.max(...workspace.data.employees.map(employee => employee.id)) + 1, uuid: crypto.randomUUID(), name, email: "arc-workflow@example.test", walletAddress: "0x6672ad05c24f1e111e0d5354a8bb4e74053395f5", paymentMethod: "crypto", isActive: true, token: { address: "native-usdc", name: "USD Coin", symbol: "USDC", decimals: 18 }, network: { name: "Arc Testnet", chainId: 5042002 }, createdAt: now, updatedAt: now };
    await request("/api/seeded-workspace", "PATCH", { entity: "entity-3", revision: workspace.revision, changes: [{ field: "employees", value: [...workspace.data.employees, employee] }] });
  }
  const contracts = await request("/api/payroll-contracts?entity=entity-3");
  let contract = contracts.find(contract => contract.employeeId === employee.id && contract.status === "ACTIVE");
  if (!contract) {
    const today = new Date().toISOString().slice(0, 10);
    contract = await request("/api/payroll-contracts?entity=entity-3", "POST", { employeeId: employee.id, amount: "0.001", payday: Number(today.slice(-2)), payrollCycle: 1, joiningDate: today, contractTerm: "CONTRACTOR", description: "Arc Testnet workflow verification", generateDaysBefore: 0 });
  }
  const prepare = { action: "prepare", id: contract.id, period: 0 };
  const invoice = await request("/api/payroll-contracts?entity=entity-3", "PATCH", prepare);
  assert.equal((await request("/api/payroll-contracts?entity=entity-3", "PATCH", prepare)).uuid, invoice.uuid);
  const confirm = { action: "confirm", invoiceId: invoice.uuid };
  const bill = await request("/api/payroll-contracts?entity=entity-3", "PATCH", confirm);
  assert.equal((await request("/api/payroll-contracts?entity=entity-3", "PATCH", confirm)).uuid, bill.uuid);
  assert.equal(bill.amountExact, "0.001");
  let saved = await request("/api/seeded-workspace?entity=entity-3");
  assert.equal(saved.data.bills.filter(item => item.invoiceUuid === invoice.uuid).length, 1);
  let transactionHash = null;
  if (process.argv.includes("--settle")) {
    const treasury = await request("/api/treasury");
    assert.equal(treasury.wallet.chainId, 5042002);
    assert.equal(contract.amount, "0.001");
    assert.equal(bill.recipient.toLowerCase(), "0x6672ad05c24f1e111e0d5354a8bb4e74053395f5");
    assert.ok(treasury.policy.allowedRecipients.some(address => address.toLowerCase() === bill.recipient.toLowerCase()));
    const action = { entity: "entity-3", field: "bills", id: bill.uuid, action: "pay", recipient: bill.recipient };
    saved = await request("/api/seeded-workspace/action", "POST", action);
    const proposed = (await request("/api/business-records")).find(record => record.id === bill.businessRecordId);
    if (proposed.status === "awaiting_approval") await request(`/api/treasury/payments/${bill.businessRecordId}/approve`, "POST", {});
    for (let attempt = 0; attempt < 20 && saved.data.bills.find(item => item.uuid === bill.uuid)?.status !== "PAID"; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      saved = await request("/api/seeded-workspace/action", "POST", { ...action, action: "refresh" });
      assert.notEqual(saved.data.bills.find(item => item.uuid === bill.uuid)?.status, "FAILED");
    }
    assert.equal(saved.data.bills.find(item => item.uuid === bill.uuid)?.status, "PAID");
    assert.equal(saved.data.invoices.find(item => item.uuid === invoice.uuid)?.status, "PAID");
    const transactions = saved.data.transactions.filter(transaction => transaction.id === bill.businessRecordId);
    assert.equal(transactions.length, 1);
    transactionHash = transactions[0].txHash;
    assert.match(transactionHash, /^0x[0-9a-f]{64}$/i);
    saved = await request("/api/seeded-workspace/action", "POST", action);
    assert.equal(saved.data.transactions.filter(transaction => transaction.id === bill.businessRecordId).length, 1);
  }
  const document = await fetch(`${base}/api/seeded-workspace/document?entity=entity-3&id=${invoice.uuid}`, { headers });
  assert.equal(document.status, 200);
  assert.equal(document.headers.get("content-type"), "application/pdf");
  assert.equal(Buffer.from(await document.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  const outbox = await request("/api/email-outbox?entity=entity-3");
  assert.equal(outbox.deliveryConfigured, false);
  assert.ok(Array.isArray(await request("/api/notifications")));
  console.log(JSON.stringify({ contractId: contract.id, invoiceNumber: invoice.invoiceNumber, billId: bill.uuid, status: saved.data.bills.find(item => item.uuid === bill.uuid)?.status, amount: bill.amountExact, currency: "USDC", transactionHash, paymentSubmitted: process.argv.includes("--settle"), pdfVerified: true }));
} finally {
  await fetch(`${base}/api/operator/session`, { method: "DELETE", headers });
}
