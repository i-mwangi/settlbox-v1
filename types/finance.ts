export type EvmAddress = `0x${string}`;
export type TransactionHash = `0x${string}`;
export type ArcEnvironment = "testnet" | "mainnet";
export type PaymentStatus = "awaiting_approval" | "ready" | "processing" | "submitted" | "confirmed" | "failed";

export interface WalletReference {
  id: string;
  companyId: string;
  address: EvmAddress;
  chainId: number;
}

export interface AssetAmount {
  symbol: "USDC";
  baseUnits: string;
  decimals: 18;
}

export interface PaymentIntent {
  id: string;
  companyId: string;
  walletId: string;
  recipient: EvmAddress;
  amount: AssetAmount;
  purpose: "payroll" | "invoice" | "bill" | "transfer";
  idempotencyKey: string;
}

export interface PaymentExecution {
  paymentId: string;
  status: PaymentStatus;
  transactionHash?: TransactionHash;
  providerTransactionId?: string;
  failureReason?: string;
}

export interface ApprovalPolicy {
  allowedRecipients: readonly EvmAddress[];
  maxPaymentBaseUnits: string;
  dailyLimitBaseUnits: string;
  approvalThresholdBaseUnits: string;
  requiredApprovals: number;
}

export interface PaymentAuthorization {
  wallet: WalletReference;
  availableBaseUnits: string;
  spentTodayBaseUnits: string;
  reservedTodayBaseUnits: string;
  approvedBy: readonly string[];
  policy: ApprovalPolicy;
}
