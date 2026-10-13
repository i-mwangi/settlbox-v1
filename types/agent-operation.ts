export interface AgentOperation {
  tool: string;
  arguments: Record<string, unknown>;
  precondition?: string;
}
export interface AgentProposal {
  id: string;
  turnId: string;
  operation: AgentOperation;
  before?: unknown;
  status: "pending" | "running" | "awaiting_signature" | "completed" | "failed" | "uncertain" | "cancelled";
  createdAt: string;
  expiresAt: string;
  result?: unknown;
  error?: string;
}
