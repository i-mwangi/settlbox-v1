import assert from "node:assert/strict";

const base = process.env.SETTLBOX_VERIFY_URL || "http://127.0.0.1:3002";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const unauthenticated = await fetch(`${base}/api/seeded-workspace`);
assert.equal(unauthenticated.status, 401);
const invalid = await fetch(`${base}/api/auth/password`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ email: "invalid@example.test", password: "invalid-password" }) });
assert.equal(invalid.status, 401);
const session = await fetch(`${base}/api/operator/session`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ token: process.env.SETTLBOX_OPERATOR_TOKEN }) });
assert.equal(session.status, 200);
const cookie = session.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);
const headers = { Cookie: cookie, Origin: base, "Content-Type": "application/json" };
for (const entity of ["primary", "entity-2", "entity-3"]) {
  const response = await fetch(`${base}/api/seeded-workspace?entity=${entity}`, { headers });
  assert.equal(response.status, 200, `Load ${entity}: ${await response.clone().text()}`);
  const workspace = await response.json();
  const contracts = await fetch(`${base}/api/payroll-contracts?entity=${entity}`, { headers });
  assert.equal(contracts.status, 200);
  assert.ok(Array.isArray(await contracts.json()));
  assert.equal(workspace.entityId, entity);
  assert.ok(workspace.data.invoices.length);
  assert.ok(workspace.data.employees.length);
  if (entity === "entity-3") assert.match(workspace.treasuryAddress, /^0x[0-9a-f]{40}$/i);
  const forbidden = await fetch(`${base}/api/seeded-workspace`, { method: "PATCH", headers, body: JSON.stringify({ entity, revision: workspace.revision, changes: [{ field: "totalBalance", value: 999999 }] }) });
  assert.equal(forbidden.status, 409);
  console.log(`${entity}: seeded records loaded; financial write protection passed`);
}
await fetch(`${base}/api/operator/session`, { method: "DELETE", headers });
const unauthorizedContracts = await fetch(`${base}/api/payroll-contracts`);
assert.equal(unauthorizedContracts.status, 401);
console.log("Authentication rejection and seeded workspace HTTP checks passed");
