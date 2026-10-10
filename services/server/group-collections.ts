import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { parseAmount, formatAmount } from "../arc/amount.ts";
import type { GroupCollection } from "../../types/collections";
import type { EvmAddress } from "../../types/finance";
import type { PaymentLinkRepository } from "./payment-links";

export function splitCollectionAmount(amount: string, count: number): string[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error("Between 1 and 100 contributors are required");
  const units = parseAmount(amount);
  if (units < BigInt(count)) throw new Error("Amount is too small to split");
  const share = units / BigInt(count);
  const remainder = units % BigInt(count);
  return Array.from({ length: count }, (_, index) => formatAmount(share + (BigInt(index) < remainder ? 1n : 0n)));
}

export class GroupCollectionRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS group_collections(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,record TEXT NOT NULL); CREATE INDEX IF NOT EXISTS group_collection_history ON group_collections(company_id,id);");
  }
  create(companyId: string, id: string, title: string, amount: string, groupId: number | null, members: { name: string; address: string | null }[], collectionWallet?: EvmAddress): GroupCollection {
    if (!/^[0-9a-f-]{36}$/i.test(id) || !title.trim() || title.length > 160) throw new Error("Collection ID and title are required");
    const amounts = splitCollectionAmount(amount, members.length);
    const existing = this.database.prepare("SELECT record FROM group_collections WHERE id=? AND company_id=?").get(id, companyId);
    if (existing) {
      const record = JSON.parse(String(existing.record)) as GroupCollection;
      if (record.amount !== amount || record.groupId !== groupId || record.title !== title.trim() || record.members.length !== members.length || record.members.some((member, index) => member.name !== members[index].name || member.address?.toLowerCase() !== members[index].address?.toLowerCase())) throw new Error("Collection ID already belongs to a different request");
      return record;
    }
    const record: GroupCollection = { id, companyId, groupId, title: title.trim(), amount, ...(collectionWallet ? { collectionWallet } : {}), members: members.map((member, index) => ({ ...member, amount: amounts[index], linkCode: randomUUID(), paid: false, transactionHash: null })), createdAt: new Date().toISOString() };
    this.database.prepare("INSERT INTO group_collections(id,company_id,record) VALUES(?,?,?)").run(id, companyId, JSON.stringify(record));
    return record;
  }
  list(companyId: string): GroupCollection[] { return this.database.prepare("SELECT record FROM group_collections WHERE company_id=? ORDER BY rowid DESC LIMIT 500").all(companyId).map(row => JSON.parse(String(row.record)) as GroupCollection); }
  hydrate(record: GroupCollection, wallet: EvmAddress, links: PaymentLinkRepository): GroupCollection {
    const collectionWallet = record.collectionWallet || links.get(record.members[0].linkCode)?.paymentWalletAddress || wallet;
    return { ...record, members: record.members.map(member => {
      const link = links.create({ title: `${record.title} · ${member.name}`.slice(0, 160), description: `Contribution to ${record.title}`, amount: member.amount, paymentWalletAddress: collectionWallet }, member.linkCode, { singleUse: true, managed: true });
      return { ...member, paid: link.records.length > 0, transactionHash: link.records[0]?.txid || null };
    }) };
  }
  close() { this.database.close(); }
}
