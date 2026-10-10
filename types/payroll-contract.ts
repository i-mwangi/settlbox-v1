import type { WorkspaceEntityId } from "./seeded-workspace";
import type { EvmAddress } from "./finance";

export interface PayrollContractInput {
  employeeId: number;
  amount: string;
  payday: number;
  payrollCycle: number;
  joiningDate: string;
  contractTerm: "PERMANENT" | "CONTRACTOR";
  description: string;
  note?: string;
  generateDaysBefore?: number;
}

export interface PayrollContract extends PayrollContractInput {
  id: number;
  uuid: string;
  companyId: string;
  entityId: WorkspaceEntityId;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "COMPLETED";
  payStartDate: string;
  payEndDate: string;
  createdAt: string;
  updatedAt: string;
  employee: { id: number; name: string; email: string; walletAddress: EvmAddress; groupId: number };
}
