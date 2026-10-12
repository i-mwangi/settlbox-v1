export interface TreasuryVaultPolicyInput {
  paymentLimitUsdc: string;
  dailyLimitUsdc: string;
  lifetimeLimitUsdc: string;
  approvalThresholdUsdc: string;
  liquidityFloorUsdc: string;
  requiredApprovals: number;
}

export interface TreasuryVaultDeploymentInput {
  chainId: number;
  administrator: string;
  executor: string;
  policy: TreasuryVaultPolicyInput;
}

export interface TreasuryVaultConfiguration {
  chainId: number;
  companyId: string;
  address: `0x${string}`;
  administrator: `0x${string}`;
  executor: `0x${string}`;
}

export type TreasuryVaultStatus =
  | { state: "not_configured"; message: string }
  | {
      state: "verified";
      chainId: number;
      address: string;
      administrator: string;
      executor: string;
      paused: boolean;
      approvalCapacityReady: boolean;
      balanceUsdc: string;
      lifetimeSpentUsdc: string;
      policyVersion: string;
      policy: TreasuryVaultPolicyInput;
      blockNumber: string;
      observedAt: string;
    };
