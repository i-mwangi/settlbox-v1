import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BusinessRecordRepository } from "../services/server/business-records.ts";
import { nextPaymentDate, validateCalendarDate } from "../services/server/payment-schedules.ts";

const payment = { kind: "bill", title: "Hosting", counterparty: "Vendor", recipient: `0x${"1".repeat(40)}`, amount: "0.001", dueDate: "2026-01-31", description: "Monthly hosting" };

test("calendar recurrence preserves month-end and leap-day anchors", () => {
  assert.equal(nextPaymentDate("2026-01-31", "monthly", "2026-01-31"), "2026-02-28");
  assert.equal(nextPaymentDate("2026-02-28", "monthly", "2026-01-31"), "2026-03-31");
  assert.equal(nextPaymentDate("2027-02-28", "yearly", "2024-02-29"), "2028-02-29");
  assert.equal(nextPaymentDate("2026-12-31", "daily", "2026-12-31"), "2027-01-01");
  assert.equal(nextPaymentDate("2026-12-31", "weekly", "2026-12-31"), "2027-01-07");
  assert.throws(() => validateCalendarDate("2026-02-30"));
});

test("durable schedules prepare each occurrence once and preserve existing drafts when paused", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-schedules-"));
  const path = join(directory, "records.sqlite");
  const first = new BusinessRecordRepository(path);
  const second = new BusinessRecordRepository(path);
  try {
    const id = randomUUID();
    const input = { payment, frequency: "monthly", endDate: "2026-03-31" };
    first.createSchedule("company", id, input);
    assert.equal(first.createSchedule("company", id, input).id, id);
    assert.throws(() => first.createSchedule("company", id, { ...input, frequency: "weekly" }));
    assert.throws(() => first.createSchedule("other", id, input));
    assert.deepEqual(first.prepareDuePayments("other", "2026-03-31"), []);
    const initial = first.prepareDuePayments("company", "2026-02-28");
    assert.deepEqual(initial.map(record => record.dueDate), ["2026-01-31", "2026-02-28"]);
    assert.ok(initial.every(record => record.scheduleId === id && record.status === "draft"));
    assert.deepEqual(second.prepareDuePayments("company", "2026-02-28"), []);
    first.setScheduleStatus("company", id, "paused");
    assert.deepEqual(second.prepareDuePayments("company", "2026-03-31"), []);
    assert.equal(first.list("company").length, 2);
    second.setScheduleStatus("company", id, "active");
    assert.equal(first.prepareDuePayments("company", "2026-03-31").length, 1);
    assert.equal(second.getSchedule("company", id).status, "completed");
    assert.throws(() => first.setScheduleStatus("company", id, "active"));
    assert.deepEqual(second.prepareDuePayments("company", "2027-01-01"), []);
  } finally { first.close(); second.close(); rmSync(directory, { recursive: true }); }
});

test("schedule backlog is bounded and cancellation stops future preparation", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-backlog-"));
  const repository = new BusinessRecordRepository(join(directory, "records.sqlite"));
  try {
    const id = randomUUID();
    repository.createSchedule("company", id, { payment: { ...payment, dueDate: "2026-01-01" }, frequency: "daily", endDate: null });
    assert.equal(repository.prepareDuePayments("company", "2026-05-01").length, 100);
    assert.equal(repository.prepareDuePayments("company", "2026-05-01").length, 21);
    assert.equal(new Set(repository.list("company").map(record => record.id)).size, 121);
    repository.setScheduleStatus("company", id, "cancelled");
    assert.deepEqual(repository.prepareDuePayments("company", "2027-01-01"), []);
    assert.throws(() => repository.setScheduleStatus("company", id, "active"));
    assert.throws(() => repository.createSchedule("company", randomUUID(), { payment: { ...payment, kind: "invoice" }, frequency: "once", endDate: null }));
    assert.throws(() => repository.createSchedule("company", randomUUID(), { payment, frequency: "once", endDate: "2026-01-01" }));
    const once = repository.createSchedule("company", randomUUID(), { payment, frequency: "once", endDate: null });
    assert.equal(repository.prepareDuePayments("company", "2026-05-01").length, 1);
    assert.equal(repository.getSchedule("company", once.id).status, "completed");
  } finally { repository.close(); rmSync(directory, { recursive: true }); }
});
