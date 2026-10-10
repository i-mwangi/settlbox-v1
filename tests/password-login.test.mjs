import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyWorkspacePassword } from "../services/server/password-login.ts";

test("workspace passwords verify hashes, reject incorrect identities, and throttle attempts", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-login-"));
  const names = ["SETTLBOX_LOGIN_EMAIL", "SETTLBOX_LOGIN_PASSWORD_HASH", "SETTLBOX_SESSION_DATABASE"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const password = "Verification-only-password-123";
  const salt = "1234567890abcdef1234567890abcdef";
  process.env.SETTLBOX_LOGIN_EMAIL = "owner@example.test";
  process.env.SETTLBOX_LOGIN_PASSWORD_HASH = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  process.env.SETTLBOX_SESSION_DATABASE = join(directory, "sessions.sqlite");
  try {
    assert.equal(verifyWorkspacePassword(" OWNER@example.test ", password, "owner"), true);
    assert.equal(verifyWorkspacePassword("other@example.test", password, "owner"), false);
    assert.equal(verifyWorkspacePassword("owner@example.test", "wrong", "owner"), false);
    assert.equal(verifyWorkspacePassword("owner@example.test", password, "owner"), true);
    for (let attempt = 0; attempt < 10; attempt++) assert.equal(verifyWorkspacePassword("owner@example.test", "wrong", "blocked"), false);
    assert.throws(() => verifyWorkspacePassword("owner@example.test", password, "blocked"), /Too many/);
    assert.equal(verifyWorkspacePassword({}, password, "owner"), false);
  } finally {
    for (const name of names) if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    rmSync(directory, { recursive: true });
  }
});
