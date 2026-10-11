import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyMessage } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { TeamMemberRepository } from "../services/server/team-members.ts";
import {
  createOperatorSession,
  requireOperatorSession,
  sessionCookie,
} from "../services/server/operator-session.ts";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-team-"));
  const path = join(directory, "business.sqlite");
  const repository = new TeamMemberRepository(path);
  return {
    repository,
    path,
    directory,
    close() {
      repository.close();
      rmSync(directory, { recursive: true });
    },
  };
}

test("wallet invitations require a valid, single-use authorization challenge", async () => {
  const fixtureData = fixture();
  const { repository } = fixtureData;
  const account = privateKeyToAccount(generatePrivateKey());
  try {
    const invitation = repository.invite("company", {
      firstName: "Reviewer",
      email: "reviewer@example.com",
      role: "REVIEWER",
    });
    assert.equal(invitation.member.status, "PENDING");
    assert.deepEqual(repository.list("another"), []);
    assert.throws(
      () =>
        repository.invite("company", {
          firstName: "Duplicate",
          email: "reviewer@example.com",
          role: "ADMIN",
        }),
      /already belongs/,
    );
    assert.throws(
      () =>
        repository.invite("company", {
          firstName: "Owner",
          email: "owner@example.com",
          role: "OWNER",
        }),
      /Select/,
    );
    assert.throws(
      () =>
        repository.challenge(
          "another",
          account.address,
          "http://localhost",
          invitation.token,
        ),
      /unavailable/,
    );
    const challenge = repository.challenge(
      "company",
      account.address,
      "http://localhost",
      invitation.token,
    );
    const signature = await account.signMessage({ message: challenge.message });
    assert.equal(
      await verifyMessage({
        address: account.address,
        message: challenge.message,
        signature,
      }),
      true,
    );
    const another = privateKeyToAccount(generatePrivateKey());
    assert.equal(
      await verifyMessage({
        address: account.address,
        message: challenge.message,
        signature: await another.signMessage({ message: challenge.message }),
      }),
      false,
    );
    const accepted = repository.consumeChallenge("company", challenge.id);
    assert.equal(accepted.status, "ACTIVE");
    assert.equal(accepted.walletAddress, account.address.toLowerCase());
    assert.throws(
      () => repository.consumeChallenge("company", challenge.id),
      /already used/,
    );
    assert.throws(
      () =>
        repository.challenge(
          "company",
          account.address,
          "http://localhost",
          invitation.token,
        ),
      /unavailable/,
    );
    assert.ok(
      repository
        .challenge("company", account.address, "http://localhost")
        .message.includes("Purpose: login"),
    );
  } finally {
    fixtureData.close();
  }
});

test("renewing an invitation invalidates its previous token and outstanding challenges", () => {
  const fixtureData = fixture();
  try {
    const invite = fixtureData.repository.invite("company", {
      firstName: "Viewer",
      email: "viewer@example.com",
      role: "VIEWER",
    });
    const account = privateKeyToAccount(generatePrivateKey());
    const old = fixtureData.repository.challenge(
      "company",
      account.address,
      "http://localhost",
      invite.token,
    );
    const renewed = fixtureData.repository.resend("company", invite.member.id);
    assert.notEqual(renewed.token, invite.token);
    assert.throws(
      () => fixtureData.repository.readChallenge("company", old.id),
      /expired/,
    );
    assert.throws(
      () =>
        fixtureData.repository.challenge(
          "company",
          account.address,
          "http://localhost",
          invite.token,
        ),
      /unavailable/,
    );
    assert.ok(
      fixtureData.repository.challenge(
        "company",
        account.address,
        "http://localhost",
        renewed.token,
      ),
    );
    assert.throws(() => fixtureData.repository.remove("another", invite.member.id), /not found/);
  } finally {
    fixtureData.close();
  }
});

test("member sessions enforce current roles and lose access immediately after suspension or removal", () => {
  const fixtureData = fixture();
  const variables = [
    "SETTLBOX_BUSINESS_DATABASE",
    "SETTLBOX_SESSION_DATABASE",
    "SETTLBOX_TREASURY_CONFIG",
  ];
  const previous = Object.fromEntries(
    variables.map((key) => [key, process.env[key]]),
  );
  process.env.SETTLBOX_BUSINESS_DATABASE = fixtureData.path;
  process.env.SETTLBOX_SESSION_DATABASE = join(
    fixtureData.directory,
    "sessions.sqlite",
  );
  process.env.SETTLBOX_TREASURY_CONFIG = join(
    fixtureData.directory,
    "config.json",
  );
  writeFileSync(
    process.env.SETTLBOX_TREASURY_CONFIG,
    JSON.stringify({ wallet: { companyId: "company" } }),
  );
  try {
    const account = privateKeyToAccount(generatePrivateKey());
    const invite = fixtureData.repository.invite("company", {
      firstName: "Viewer",
      email: "viewer@example.com",
      role: "VIEWER",
    });
    const challenge = fixtureData.repository.challenge(
      "company",
      account.address,
      "http://localhost",
      invite.token,
    );
    const member = fixtureData.repository.consumeChallenge(
      "company",
      challenge.id,
    );
    const session = createOperatorSession({
      id: `member:${member.uuid}`,
      memberId: member.id,
      companyId: "company",
      role: member.role,
    });
    const cookie = sessionCookie(session.token, false);
    const request = (path, method = "GET") =>
      new Request(`http://localhost${path}`, { method, headers: { cookie } });
    assert.equal(
      requireOperatorSession(request("/api/treasury")).role,
      "VIEWER",
    );
    assert.throws(
      () => requireOperatorSession(request("/api/business-records", "POST")),
      /role/,
    );
    assert.equal(
      requireOperatorSession(request("/api/team/profile", "PATCH"), "profile")
        .memberId,
      member.id,
    );
    fixtureData.repository.update("company", member.id, { role: "REVIEWER" });
    assert.equal(
      requireOperatorSession(
        request("/api/treasury/payments/payment-id/approve", "POST"),
      ).role,
      "REVIEWER",
    );
    assert.throws(
      () => requireOperatorSession(request("/api/business-records", "POST")),
      /role/,
    );
    fixtureData.repository.update("company", member.id, {
      status: "SUSPENDED",
    });
    assert.throws(
      () => requireOperatorSession(request("/api/treasury")),
      /Authentication/,
    );
    fixtureData.repository.update("company", member.id, {
      status: "ACTIVE",
      role: "ADMIN",
    });
    assert.equal(
      requireOperatorSession(request("/api/business-records", "POST")).role,
      "ADMIN",
    );
    fixtureData.repository.remove("company", member.id);
    assert.throws(
      () => requireOperatorSession(request("/api/treasury")),
      /Authentication/,
    );
  } finally {
    for (const key of variables) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    fixtureData.close();
  }
});

test("bulk invitations persist together and roll back on a conflicting email", () => {
  const data = fixture();
  const invite = (email) => ({
    email,
    firstName: "Colleague",
    role: "REVIEWER",
  });
  try {
    const saved = data.repository.inviteMany("company", [
      invite("one@example.com"),
      invite("two@example.com"),
    ]);
    assert.equal(saved.length, 2);
    assert.notEqual(saved[0].token, saved[1].token);
    assert.throws(
      () =>
        data.repository.inviteMany("company", [
          invite("three@example.com"),
          invite("ONE@example.com"),
        ]),
      /already belongs/,
    );
    assert.equal(data.repository.list("company").length, 2);
    assert.throws(
      () =>
        data.repository.inviteMany("company", [
          invite("repeat@example.com"),
          invite("REPEAT@example.com"),
        ]),
      /unique/,
    );
    assert.throws(() => data.repository.inviteMany("company", []), /between/);
    assert.equal(
      data.repository.inviteMany("another", [invite("one@example.com")]).length,
      1,
    );
  } finally {
    data.close();
  }
});

test("member profile and role updates validate together and reject unsupported changes", () => {
  const data = fixture();
  try {
    const { member } = data.repository.invite("company", {
      firstName: "Reviewer",
      email: "update@example.com",
      role: "REVIEWER",
    });
    assert.throws(
      () =>
        data.repository.update("company", member.id, {
          role: "ADMIN",
          position: "x".repeat(161),
        }),
      /position/,
    );
    assert.equal(data.repository.get("company", member.id).role, "REVIEWER");
    const updated = data.repository.update("company", member.id, {
      role: "ADMIN",
      position: "Finance",
    });
    assert.equal(updated.role, "ADMIN");
    assert.equal(updated.position, "Finance");
    assert.throws(
      () =>
        data.repository.update("company", member.id, {
          email: "changed@example.com",
        }),
      /Unsupported/,
    );
    assert.throws(
      () => data.repository.remove("another", member.id),
      /not found/,
    );
    assert.ok(data.repository.get("company", member.id));
  } finally {
    data.close();
  }
});
