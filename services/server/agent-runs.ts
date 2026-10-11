import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AgentPlan, AgentPlanRequest, AgentRun } from "../../types/agent";
import { validateAgentPlanRequest } from "../arc/agent-planner.ts";

export class AgentRunRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS agent_runs(company_id TEXT NOT NULL,id TEXT NOT NULL,request TEXT NOT NULL,record TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(company_id,id)); CREATE INDEX IF NOT EXISTS agent_company_history ON agent_runs(company_id,created_at DESC)");
  }
  find(companyId: string, request: AgentPlanRequest): AgentRun | undefined {
    const canonical = validateAgentPlanRequest(request);
    const row = this.database.prepare("SELECT request,record FROM agent_runs WHERE company_id=? AND id=?").get(companyId, canonical.requestId);
    if (!row) return undefined;
    if (row.request !== JSON.stringify(canonical)) throw new Error("Request ID belongs to different planning terms");
    return JSON.parse(String(row.record)) as AgentRun;
  }
  save(companyId: string, requestedBy: string, request: AgentPlanRequest, plan: AgentPlan): AgentRun {
    if (!companyId.trim() || !requestedBy.trim()) throw new Error("A company and requesting principal are required");
    const canonical = validateAgentPlanRequest(request);
    const existing = this.find(companyId, canonical);
    if (existing) return existing;
    const run: AgentRun = { ...plan, id: canonical.requestId, companyId, requestedBy, request: canonical, createdAt: new Date().toISOString() };
    this.database.prepare("INSERT OR IGNORE INTO agent_runs VALUES(?,?,?,?,?)").run(companyId, run.id, JSON.stringify(canonical), JSON.stringify(run), run.createdAt);
    return this.find(companyId, canonical)!;
  }
  list(companyId: string): AgentRun[] {
    return this.database.prepare("SELECT record FROM agent_runs WHERE company_id=? ORDER BY created_at DESC LIMIT 50").all(companyId).map(row => JSON.parse(String(row.record)) as AgentRun);
  }
  close() { this.database.close(); }
}

export function openAgentRuns() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new AgentRunRepository(path);
}
