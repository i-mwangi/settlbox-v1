import test from "node:test";
import assert from "node:assert/strict";
import { KoraSandboxRepository, sandboxCredential, payoutMarkets, listKoraDestinations } from "../services/server/kora-sandbox.ts";

test("Kora connections reject raw credentials and live keys", () => {
  assert.throws(() => sandboxCredential("sk_test_secret"));
  assert.throws(() => sandboxCredential("SETTLBOX_KORA_A_KEY", { SETTLBOX_KORA_A_KEY: "sk_live_secret" }));
  assert.throws(() => sandboxCredential("SETTLBOX_KORA_A_KEY", {}));
  assert.equal(sandboxCredential("SETTLBOX_KORA_A_KEY", { SETTLBOX_KORA_A_KEY: "sk_test_example" }), "sk_test_example");
});
test("Provider accounts cannot be shared across businesses, even through different environment aliases", () => {
  const store = new KoraSandboxRepository(":memory:");
  const env = { SETTLBOX_KORA_A_KEY: "sk_test_first", SETTLBOX_KORA_ALIAS_KEY: "sk_test_first", SETTLBOX_KORA_B_KEY: "sk_test_second" };
  try {
    store.save("company-a", "SETTLBOX_KORA_A_KEY", env);
    assert.equal(store.get("company-b"), null);
    assert.throws(() => store.save("company-b", "SETTLBOX_KORA_ALIAS_KEY", env), /another business/);
    store.save("company-b", "SETTLBOX_KORA_B_KEY", env);
    store.remove("company-b");
    assert.equal(store.get("company-a").keyEnv, "SETTLBOX_KORA_A_KEY");
    assert.equal(JSON.stringify(store.get("company-a")).includes("sk_test"), false);
  } finally { store.close(); }
});
test("Unsupported country and channel combinations fail before provider access", async () => {
  assert.equal(payoutMarkets.KE.currency, "KES");
  await assert.rejects(listKoraDestinations("unused", "GH", "bank_account"), /not supported/);
  await assert.rejects(listKoraDestinations("unused", "NG", "mobile_money"), /not supported/);
  await assert.rejects(listKoraDestinations("unused", "US", "bank_account"), /Choose/);
  await assert.rejects(listKoraDestinations("unused", "__proto__", "bank_account"), /Choose/);
});
test("Destination discovery uses a fixed host, test credential, and rejects invalid responses", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.SETTLBOX_KORA_FIXTURE_KEY;
  const originalPublic = process.env.SETTLBOX_KORA_FIXTURE_PUBLIC_KEY;
  process.env.SETTLBOX_KORA_FIXTURE_KEY = "sk_test_fixture";
  process.env.SETTLBOX_KORA_FIXTURE_PUBLIC_KEY = "pk_test_fixture";
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.korapay.com/merchant/api/v1/misc/mobile-money?countryCode=KE");
      assert.equal(options.headers.Authorization, "Bearer pk_test_fixture");
      assert.equal(options.redirect, "error");
      return Response.json({ status: true, data: [{ name: "Fixture operator", code: "fixture", slug: "fixture-ke", internal: "not exposed" }] });
    };
    assert.deepEqual(await listKoraDestinations("SETTLBOX_KORA_FIXTURE_KEY", "KE", "mobile_money"), [{ name: "Fixture operator", code: "fixture", slug: "fixture-ke" }]);
    globalThis.fetch = async () => Response.json({ status: true, data: [{ name: "Invalid" }] });
    await assert.rejects(listKoraDestinations("SETTLBOX_KORA_FIXTURE_KEY", "KE", "mobile_money"), /invalid/);
    globalThis.fetch = async () => new Response("x".repeat(256001));
    await assert.rejects(listKoraDestinations("SETTLBOX_KORA_FIXTURE_KEY", "KE", "mobile_money"), /oversized/);
    globalThis.fetch = async () => new Response("sensitive upstream body", { status: 401 });
    await assert.rejects(listKoraDestinations("SETTLBOX_KORA_FIXTURE_KEY", "KE", "mobile_money"), /rejected the connection/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SETTLBOX_KORA_FIXTURE_KEY;
    else process.env.SETTLBOX_KORA_FIXTURE_KEY = originalKey;
    if (originalPublic === undefined) delete process.env.SETTLBOX_KORA_FIXTURE_PUBLIC_KEY;
    else process.env.SETTLBOX_KORA_FIXTURE_PUBLIC_KEY = originalPublic;
  }
});
