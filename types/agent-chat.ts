import type { AgentRun } from "./agent";
import type { AgentProposal } from "./agent-operation";

export interface AgentChatTurn {
  proposal?: AgentProposal;
  id: string;
  recordIds?: string[];
  message: string;
  answer: string;
  run: AgentRun;
  createdAt: string;
}
