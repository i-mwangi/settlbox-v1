import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createPublicClient, decodeFunctionData, formatUnits, http, keccak256, parseUnits } from "viem";
import { arcTestnet } from "../arc/network.ts";
import { giftEscrowAbi, validateGiftId } from "../arc/gift-escrow.ts";
import type { ArcGift, GiftEscrowConfiguration } from "../../types/arc-gift";

export async function openGiftEscrow() {
  const config = JSON.parse(readFileSync(resolve(process.env.SETTLBOX_GIFT_ESCROW_CONFIG || ".data/gift-escrow.json"), "utf8")) as GiftEscrowConfiguration;
  if (config.chainId !== arcTestnet.id || !/^0x[0-9a-f]{40}$/i.test(config.address) || !/^0x[0-9a-f]{64}$/i.test(config.runtimeHash)) throw new Error("Arc Testnet gift escrow is not configured");
  const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0], { batch: true }) });
  const [chainId, code] = await Promise.all([reader.getChainId(), reader.getCode({ address: config.address })]);
  if (chainId !== arcTestnet.id || !code || keccak256(code) !== config.runtimeHash) throw new Error("Gift escrow verification failed");
  async function read(id: string): Promise<ArcGift> {
    validateGiftId(id);
    const identifier = id.toLowerCase() as ArcGift["id"];
    const [sender, recipient, amount, expiresAt, status] = await reader.readContract({ address: config.address, abi: giftEscrowAbi, functionName: "gifts", args: [identifier] });
    if (status === 0) throw new Error("Gift not found");
    return { id: identifier, sender, recipient, amount: formatUnits(amount, 18), expiresAt: Number(expiresAt), status: status === 2 ? "claimed" : status === 3 ? "refunded" : Number(expiresAt) <= Math.floor(Date.now() / 1000) ? "expired" : "active" };
  }
  async function verifyFunding(id: string, hash: string): Promise<ArcGift> {
    validateGiftId(hash);
    const [receipt, transaction, gift] = await Promise.all([reader.getTransactionReceipt({ hash }), reader.getTransaction({ hash }), read(id)]);
    if (receipt.status !== "success" || transaction.to?.toLowerCase() !== config.address.toLowerCase() || transaction.from.toLowerCase() !== gift.sender.toLowerCase()) throw new Error("Gift funding transaction does not match the escrow");
    const decoded = decodeFunctionData({ abi: giftEscrowAbi, data: transaction.input });
    if (decoded.functionName !== "createGift" || decoded.args[0].toLowerCase() !== id.toLowerCase() || transaction.value !== parseUnits(gift.amount, 18)) throw new Error("Gift funding instructions do not match");
    return { ...gift, transactionHash: hash };
  }
  return { config, read, verifyFunding };
}

export class GiftRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS arc_gifts(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,transaction_hash TEXT UNIQUE,record TEXT NOT NULL); CREATE INDEX IF NOT EXISTS arc_gift_listing ON arc_gifts(company_id);");
  }
  save(companyId: string, gift: ArcGift): ArcGift {
    validateGiftId(gift.id);
    const canonical = { ...gift, id: gift.id.toLowerCase() as ArcGift["id"] };
    this.database.prepare("INSERT OR IGNORE INTO arc_gifts(id,company_id,transaction_hash,record) VALUES(?,?,?,?)").run(canonical.id, companyId, gift.transactionHash?.toLowerCase() || null, JSON.stringify(canonical));
    const row = this.database.prepare("SELECT record FROM arc_gifts WHERE id=? AND company_id=?").get(canonical.id, companyId);
    if (!row) throw new Error("Gift already belongs to another record");
    return JSON.parse(String(row.record)) as ArcGift;
  }
  list(companyId: string): ArcGift[] { return this.database.prepare("SELECT record FROM arc_gifts WHERE company_id=? ORDER BY rowid DESC LIMIT 50").all(companyId).map(row => JSON.parse(String(row.record)) as ArcGift); }
  close() { this.database.close(); }
}

export function openGifts() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new GiftRepository(path);
}
