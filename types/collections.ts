export interface GroupCollection {
  id: string;
  companyId: string;
  groupId: number | null;
  title: string;
  amount: string;
  collectionWallet?: `0x${string}`;
  members: { name: string; address: string | null; amount: string; linkCode: string; paid: boolean; transactionHash: string | null }[];
  createdAt: string;
}
