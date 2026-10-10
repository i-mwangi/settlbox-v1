import assert from "node:assert/strict";

const base = process.env.SETTLBOX_VERIFY_URL || "http://127.0.0.1:3002";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const response = await fetch(`${base}/api/operator/session`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ token: process.env.SETTLBOX_OPERATOR_TOKEN }) });
assert.equal(response.status, 200);
const cookie = response.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);
const headers = { Cookie: cookie, Origin: base, "Content-Type": "application/json" };
async function read() {
  const response = await fetch(`${base}/api/seeded-workspace?entity=entity-3`, { headers });
  assert.equal(response.status, 200);
  return response.json();
}
async function change(field, update, expected = 200) {
  const current = await read();
  const response = await fetch(`${base}/api/seeded-workspace`, { method: "PATCH", headers, body: JSON.stringify({ entity: current.entityId, revision: current.revision, changes: [{ field, value: update(current.data[field], current.data) }] }) });
  const value = await response.json();
  assert.equal(response.status, expected, value.error || "Unexpected save response");
  return value;
}
const uuid = crypto.randomUUID();
let groupId;
let employeeId;
try {
  await change("clients", clients => [...clients, { uuid, companyName: "Workflow API fixture", email: "invalid" }], 409);
  await change("clients", clients => [...clients, { uuid, companyName: "Workflow API fixture", email: "fixture@example.test" }]);
  const edited = await change("clients", clients => clients.map(client => client.uuid === uuid ? { ...client, city: "Nairobi" } : client));
  assert.equal(edited.data.clients.find(client => client.uuid === uuid).city, "Nairobi");
  await change("employeeGroups", (groups, data) => {
    groupId = Math.max(0, ...groups.map(group => group.id)) + 1;
    const now = new Date().toISOString();
    return [...groups, { id: groupId, name: `Verification ${uuid}`, shape: "CIRCLE", color: "#306bff", order: groups.length, companyId: data.company.id, createdAt: now, updatedAt: now }];
  });
  await change("employees", (employees, data) => {
    employeeId = Math.max(0, ...employees.map(employee => employee.id)) + 1;
    const now = new Date().toISOString();
    return [...employees, { id: employeeId, name: `Verification ${uuid}`, walletAddress: "0x6672ad05c24f1e111e0d5354a8bb4e74053395f5", email: "fixture@example.test", groupId, groupIds: [groupId], companyId: data.company.id, paymentMethod: "crypto", isActive: true, token: { symbol: "USDC", decimals: 18, name: "USD Coin", address: "native-usdc" }, network: { chainId: 5042002, name: "Arc Testnet" }, createdAt: now, updatedAt: now }];
  });
  const disabled = await change("employees", employees => employees.map(employee => employee.id === employeeId ? { ...employee, isActive: false } : employee));
  assert.equal(disabled.data.employees.find(employee => employee.id === employeeId).isActive, false);
  console.log("Authenticated client create/edit, group create, employee create/disable and invalid input rejection passed");
} finally {
  if (employeeId) await change("employees", employees => employees.filter(employee => employee.id !== employeeId));
  if (groupId) await change("employeeGroups", groups => groups.filter(group => group.id !== groupId));
  await change("clients", clients => clients.filter(client => client.uuid !== uuid));
  await fetch(`${base}/api/operator/session`, { method: "DELETE", headers });
}
