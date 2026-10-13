export interface FiatRecipient {
  id: string;
  name: string;
  email: string;
  country: "KE" | "NG" | "GH";
  currency: "KES" | "NGN" | "GHS";
  channel: "bank_account" | "mobile_money";
  destinationCode: string;
  destinationSlug: string;
  destinationName: string;
  accountNumber: string;
  verification: "unverified" | "sandbox_verified" | "unsupported";
  resolvedName?: string;
  verifiedAt?: string;
}
export interface FiatPayout {
  id: string;
  reference: string;
  recipient: FiatRecipient;
  amount: string;
  currency: FiatRecipient["currency"];
  narration: string;
  status: "pending_review" | "submitting" | "processing" | "sandbox_success" | "failed" | "uncertain" | "cancelled";
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  fee?: string;
  error?: string;
}
