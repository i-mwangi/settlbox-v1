export interface VirtualAccount {
  id: string;
  currency: string;
  method: string;
  bankName: string;
  status: "active" | "pending";
  details: { label: string; value: string }[];
}
export interface GlobalAccountHistory {
  accounts: VirtualAccount[];
  deposits: { id: string; currency: string; method: string; amount: number; sender: string; date: string; status: string }[];
}
export interface YieldHistory {
  apy: number;
  monthly: { date: string; earned: number }[];
  activity: { id: string; type: "deposit" | "withdraw" | "yield"; amount: number; date: string; wallet: string; status: string }[];
}
