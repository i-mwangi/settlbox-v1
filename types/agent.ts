import type { BusinessRecord, BusinessRecordKind } from "./business";
import type { ApprovalPolicy } from "./finance";

export interface AgentPlanRequest {
  requestId: string;
  throughDate: string;
  reserveUsdc: string;
}

export interface AgentAction {
  recordId: string;
  kind: BusinessRecordKind;
  title: string;
  amountUsdc: string;
  dueDate: string;
  tool: "review_payment" | "review_receivable";
  disposition: "review" | "blocked";
  reasons: string[];
}

export interface AgentPlan {
  fundingSource?: "treasury_vault";
  mode: "proposal_only";
  engine: "deterministic";
  balanceUsdc: string;
  reserveUsdc: string;
  obligationsUsdc: string;
  unallocatedUsdc: string;
  actions: AgentAction[];
  aiReview?: {
    provider: "azure";
    model: string;
    responseId: string;
    summary: string;
    createdAt: string;
  };
}

export interface AgentRun extends AgentPlan {
  id: string;
  companyId: string;
  requestedBy: string;
  request: AgentPlanRequest;
  createdAt: string;
}

export interface AgentPlanningContext {
  companyId: string;
  balanceBaseUnits: string;
  reservedBaseUnits: string;
  committedTodayBaseUnits: string;
  policy: ApprovalPolicy;
  records: readonly BusinessRecord[];
}
