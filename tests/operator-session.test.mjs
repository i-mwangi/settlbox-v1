import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createOperatorSession, requireOperatorSession, requireSameOrigin, revokeOperatorSession, sessionCookie, verifyOperatorToken } from "../services/server/operator-session.ts";

test("operator sessions persist, reject invalid cookies, and are revoked on logout", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-session-"));
  const previous = process.env.SETTLBOX_SESSION_DATABASE;
  process.env.SETTLBOX_SESSION_DATABASE = join(directory, "sessions.sqlite");
  try {
    const session = createOperatorSession();
    const cookie = sessionCookie(session.token, false);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    const request = new Request("http://127.0.0.1/api/treasury", { headers: { cookie } });
    assert.doesNotThrow(() => requireOperatorSession(request));
    assert.throws(() => requireOperatorSession(new Request(request.url)), /Authentication/);
    revokeOperatorSession(request);
    assert.throws(() => requireOperatorSession(request), /Authentication/);
  } finally {
    if (previous === undefined) delete process.env.SETTLBOX_SESSION_DATABASE;
    else process.env.SETTLBOX_SESSION_DATABASE = previous;
    rmSync(directory, { recursive: true });
  }
});

test("operator authentication rejects missing, short, and incorrect configured secrets", () => {
  const previous = process.env.SETTLBOX_OPERATOR_TOKEN;
  try {
    delete process.env.SETTLBOX_OPERATOR_TOKEN;
    assert.equal(verifyOperatorToken("anything"), false);
    process.env.SETTLBOX_OPERATOR_TOKEN = "short";
    assert.equal(verifyOperatorToken("short"), false);
    process.env.SETTLBOX_OPERATOR_TOKEN = "a".repeat(64);
    assert.equal(verifyOperatorToken("b".repeat(64)), false);
    assert.equal(verifyOperatorToken("a".repeat(64)), true);
  } finally {
    if (previous === undefined) delete process.env.SETTLBOX_OPERATOR_TOKEN;
    else process.env.SETTLBOX_OPERATOR_TOKEN = previous;
  }
});

test("cross-origin and originless payment requests are rejected", () => {
  const url = "http://127.0.0.1:3002/api/treasury/payments";
  assert.throws(() => requireSameOrigin(new Request(url)), /origin/);
  assert.throws(() => requireSameOrigin(new Request(url, { headers: { origin: "https://untrusted.example" } })), /origin/);
  assert.doesNotThrow(() => requireSameOrigin(new Request(url, { headers: { origin: "http://127.0.0.1:3002" } })));
});
