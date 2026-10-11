import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NotificationRepository } from "../services/server/notifications.ts";

test("notification preferences persist, isolate companies and reject stale edits",()=>{
  const directory=mkdtempSync(join(tmpdir(),"settlbox-preferences-"));const path=join(directory,"preferences.sqlite");let repository=new NotificationRepository(path);
  try {
    assert.deepEqual(repository.preferences("a"),{enabled:false,emails:[],revision:0});
    const saved=repository.savePreferences("a",{enabled:true,emails:[" Finance@Example.com "],revision:0});
    assert.deepEqual(saved,{enabled:true,emails:["finance@example.com"],revision:1});
    assert.deepEqual(repository.preferences("b").emails,[]);
    assert.throws(()=>repository.savePreferences("a",{enabled:false,emails:[],revision:0}),/changed elsewhere/);
    repository.close();repository=new NotificationRepository(path);
    assert.deepEqual(repository.preferences("a"),saved);
    for(const emails of [["invalid"],["a@example.com","A@example.com"],Array(26).fill("a@example.com")])assert.throws(()=>repository.savePreferences("a",{enabled:false,emails,revision:1}));
    assert.equal(repository.preferences("a").revision,1);
    const disabled=repository.savePreferences("a",{enabled:false,emails:[],revision:1});assert.equal(disabled.revision,2);assert.equal(disabled.enabled,false);
  }finally{repository.close();rmSync(directory,{recursive:true});}
});

test("notifications deduplicate events and persist company-scoped read state", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-notifications-"));
  const path = join(directory, "business.sqlite");
  let repository = new NotificationRepository(path);
  const events = [{ key: "invoice:paid", title: "Invoice paid", message: "0.001 USDC", actionUrl: "/invoice" }];
  try {
    repository.publish("company", events);
    repository.publish("company", events);
    assert.equal(repository.list("company").length, 1);
    assert.deepEqual(repository.list("another"), []);
    const id = repository.list("company")[0].id;
    assert.equal(repository.markRead("another", id), 0);
    assert.equal(repository.markRead("company", id), 1);
    repository.close();
    repository = new NotificationRepository(path);
    assert.ok(repository.list("company")[0].readAt);
    assert.equal(repository.markRead("company"), 0);
    assert.equal(repository.markUnread("another", id), 0);
    assert.equal(repository.markUnread("company", id), 1);
    assert.equal(repository.list("company")[0].readAt, null);
    assert.equal(repository.delete("another", id), 0);
    assert.equal(repository.delete("company", id), 1);
    repository.publish("company", events);
    assert.equal(repository.list("company").length, 0);
  } finally { repository.close(); rmSync(directory, { recursive: true }); }
});
