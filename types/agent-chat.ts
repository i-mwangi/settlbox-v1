import type { AgentRun } from "./agent";

export interface AgentChatTurn {
  id: string;
  recordIds?: string[];
  message: string;
  answer: string;
  run: AgentRun;
  createdAt: string;
}
