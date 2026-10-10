import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createEmailOutboxSchema, queueEmail } from "../services/server/email-outbox.ts";

test("email queue respects business transaction rollback and deduplicates by company and entity", () => {
  const database = new DatabaseSync(":memory:");
  const event = { companyId: "company", entityId: "entity-3", key: "invoice:issued", recipient: "client@example.test", subject: "Invoice issued", body: "0.001 USDC" };
  try {
    createEmailOutboxSchema(database);
    database.exec("BEGIN");
    assert.equal(queueEmail(database, event), true);
    database.exec("ROLLBACK");
    assert.equal(database.prepare("SELECT count(*) AS count FROM email_outbox").get().count, 0);
    assert.equal(queueEmail(database, event), true);
    assert.equal(queueEmail(database, event), false);
    assert.equal(queueEmail(database, { ...event, companyId: "other" }), true);
    assert.equal(queueEmail(database, { ...event, entityId: "primary" }), true);
    assert.equal(queueEmail(database, { ...event, recipient: "invalid", key: "invalid" }), false);
    assert.equal(database.prepare("SELECT count(*) AS count FROM email_outbox WHERE status='QUEUED'").get().count, 3);
  } finally { database.close(); }
});
