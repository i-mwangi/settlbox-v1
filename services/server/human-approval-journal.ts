import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export class HumanApprovalJournal {
  private database: DatabaseSync;
  constructor(path: string) {
    mkdirSync(dirname(resolve(path)), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS human_wallet_challenges(user_id TEXT NOT NULL,request_id TEXT NOT NULL,request TEXT NOT NULL,challenge_id TEXT,created_at TEXT NOT NULL,PRIMARY KEY(user_id,request_id))");
  }
  reserve(userId: string, requestId: string, request: unknown): string | undefined {
    const encoded = JSON.stringify(request);
    this.database.prepare("INSERT OR IGNORE INTO human_wallet_challenges VALUES(?,?,?,NULL,?)").run(userId, requestId, encoded, new Date().toISOString());
    const row = this.database.prepare("SELECT request,challenge_id FROM human_wallet_challenges WHERE user_id=? AND request_id=?").get(userId, requestId)!;
    if (row.request !== encoded) throw new Error("Approval request ID belongs to another action");
    return typeof row.challenge_id === "string" ? row.challenge_id : undefined;
  }
  save(userId: string, requestId: string, challengeId: string) {
    this.database.prepare("UPDATE human_wallet_challenges SET challenge_id=? WHERE user_id=? AND request_id=? AND challenge_id IS NULL").run(challengeId, userId, requestId);
  }
  close() { this.database.close(); }
}
