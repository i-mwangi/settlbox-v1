import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseAmount } from "../arc/amount.ts";
import type { EvmAddress, TransactionHash } from "../../types/finance";

export interface BusinessPaymentLink {
  id: number;
  code: string;
  title: string;
  description: string;
  amount: string;
  paymentWalletAddress: EvmAddress;
  status: "ACTIVE" | "DEACTIVATED";
  order: number;
  acceptedTokens: { symbol: string; name: string; address: string; decimals: number }[];
  acceptedChains: { name: string; chainId: number }[];
  company: { companyName: string; companyLogo: string };
  records: { id: number; payer: EvmAddress; payerName: null; paymentMethod: "crypto" | "card"; txid: TransactionHash; createdAt: string; updatedAt: string }[];
  createdAt: string;
  updatedAt: string;
  singleUse?: boolean;
  managed?: boolean;
}

export function validatePaymentLink(input: unknown) {
  if (typeof input !== "object" || input === null) throw new Error("Payment link details are required");
  const value = input as Record<string, unknown>;
  if (value.acceptedTokens !== undefined && (!Array.isArray(value.acceptedTokens) || value.acceptedTokens.length !== 1 || value.acceptedTokens.some(token => typeof token !== "object" || token === null || !("symbol" in token) || token.symbol !== "USDC"))) throw new Error("Only USDC payments are supported");
  if (value.acceptedChains !== undefined && (!Array.isArray(value.acceptedChains) || value.acceptedChains.length !== 1 || value.acceptedChains.some(chain => typeof chain !== "object" || chain === null || !("chainId" in chain) || chain.chainId !== 5042002))) throw new Error("Only Arc Testnet is supported");
  if (typeof value.title !== "string" || !value.title.trim() || value.title.length > 160) throw new Error("A title of up to 160 characters is required");
  if (typeof value.description !== "string" || value.description.length > 4000) throw new Error("Description must be at most 4000 characters");
  if (typeof value.amount !== "string" || parseAmount(value.amount) <= 0n) throw new Error("A positive USDC amount is required");
  if (typeof value.paymentWalletAddress !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value.paymentWalletAddress) || /^0x0{40}$/i.test(value.paymentWalletAddress)) throw new Error("An Arc wallet address is required");
  return { title: value.title.trim(), description: value.description, amount: value.amount, paymentWalletAddress: value.paymentWalletAddress as EvmAddress };
}

export class PaymentLinkRepository {
  private readonly database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS business_payment_links (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, record TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS business_link_payments (id INTEGER PRIMARY KEY, code TEXT NOT NULL, hash TEXT UNIQUE NOT NULL, payer TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS business_link_history ON business_link_payments(code,id);`);
  }

  create(input: unknown, code: string = randomUUID(), options: { singleUse?: boolean; managed?: boolean } = {}): BusinessPaymentLink {
    const details = validatePaymentLink(input);
    const existing = this.get(code);
    if (existing) {
      if (existing.amount !== details.amount || existing.paymentWalletAddress !== details.paymentWalletAddress) throw new Error("Payment link identity conflicts with its existing details");
      return existing;
    }
    const now = new Date().toISOString();
    const link: BusinessPaymentLink = {
      ...details, ...options, id: 0, code, status: "ACTIVE", order: 0,
      acceptedTokens: [{ name: "USDC", symbol: "USDC", address: "0x3600000000000000000000000000000000000000", decimals: 6 }],
      acceptedChains: [{ name: "Arc Testnet", chainId: 5042002 }],
      company: { companyName: "Settlbox", companyLogo: "/logo/settlbox-icon.svg" }, records: [], createdAt: now, updatedAt: now,
    };
    this.database.prepare("INSERT OR IGNORE INTO business_payment_links(code,record) VALUES(?,?)").run(link.code, JSON.stringify(link));
    return this.get(link.code)!;
  }

  get(code: string): BusinessPaymentLink | undefined {
    const row = this.database.prepare("SELECT id,record FROM business_payment_links WHERE code=?").get(code);
    if (!row || typeof row.record !== "string") return undefined;
    const link = JSON.parse(row.record) as BusinessPaymentLink;
    const records = this.database.prepare("SELECT id,hash,payer,created_at FROM business_link_payments WHERE code=? ORDER BY id DESC").all(code);
    return { ...link, status: records.length && (link.singleUse || this.isInvoiceLink(code)) ? "DEACTIVATED" : link.status, id: Number(row.id), records: records.map(record => ({ id: Number(record.id), payer: String(record.payer) as EvmAddress, payerName: null, paymentMethod: "crypto", txid: String(record.hash) as TransactionHash, createdAt: String(record.created_at), updatedAt: String(record.created_at) })) };
  }

  list(): BusinessPaymentLink[] {
    return this.database.prepare("SELECT code FROM business_payment_links ORDER BY json_extract(record,'$.order'),id DESC LIMIT 500").all().map(row => this.get(String(row.code))!);
  }

  update(code: string, input: unknown): BusinessPaymentLink {
    this.requireIndependentLink(code);
    const link = this.get(code);
    if (!link) throw new Error("Payment link not found");
    if (typeof input !== "object" || input === null) throw new Error("Payment link details are required");
    const value = input as Record<string, unknown>;
    const details = validatePaymentLink({ ...link, ...value, paymentWalletAddress: link.paymentWalletAddress });
    const status = value.status ?? link.status;
    if (status !== "ACTIVE" && status !== "DEACTIVATED") throw new Error("Invalid payment link status");
    if (link.records.length && details.amount !== link.amount) throw new Error("A paid link's amount cannot be changed");
    const result = this.database.prepare("UPDATE business_payment_links SET record=? WHERE code=? AND (json_extract(record,'$.amount')=? OR NOT EXISTS(SELECT 1 FROM business_link_payments WHERE code=?))").run(JSON.stringify({ ...link, ...details, status, updatedAt: new Date().toISOString() }), code, details.amount, code);
    if (Number(result.changes) !== 1) throw new Error("Payment link changed during update");
    return this.get(code)!;
  }

  record(code: string, hash: TransactionHash, payer: EvmAddress, expectedAmount: string): BusinessPaymentLink {
    this.database.exec("BEGIN IMMEDIATE");
    try {
    const previous = this.database.prepare("SELECT code FROM business_link_payments WHERE hash=?").get(hash.toLowerCase());
    if (previous && previous.code !== code) throw new Error("Transaction already belongs to another payment link");
    const link = this.get(code);
    if (!link) throw new Error("Payment link not found");
    if (previous) { this.database.exec("COMMIT"); return link; }
    if (link.amount !== expectedAmount) throw new Error("Payment link changed during verification");
    if (link.status !== "ACTIVE") throw new Error("Payment link is inactive");
    this.database.prepare("INSERT INTO business_link_payments(code,hash,payer,created_at) VALUES(?,?,?,?)").run(code, hash.toLowerCase(), payer.toLowerCase(), new Date().toISOString());
    this.database.exec("COMMIT");
    return this.get(code)!;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }

  close() { this.database.close(); }

  private isInvoiceLink(code: string): boolean {
    return !!this.database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='business_records'").get() && !!this.database.prepare("SELECT 1 FROM business_records WHERE kind='invoice' AND (id=? OR json_extract(record,'$.paymentLinkCode')=?) LIMIT 1").get(code, code);
  }

  private requireIndependentLink(code: string) {
    if (this.get(code)?.managed) throw new Error("Manage this payment link through its collection");
    if (this.isInvoiceLink(code)) throw new Error("Manage this payment link through its invoice");
  }

  delete(codes: string[]) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      codes.forEach(code => this.requireIndependentLink(code));
      if (codes.some(code => this.get(code)?.records.length)) throw new Error("Paid links must be deactivated to retain their payment history");
      let deletedCount = 0;
      for (const code of codes) deletedCount += Number(this.database.prepare("DELETE FROM business_payment_links WHERE code=?").run(code).changes);
      this.database.exec("COMMIT");
      return deletedCount;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }

  reorder(ids: number[]) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      ids.forEach((id, order) => this.database.prepare("UPDATE business_payment_links SET record=json_set(record,'$.order',?) WHERE id=?").run(order, id));
      this.database.exec("COMMIT");
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
}

export function verifyLinkSettlement(
  link: Pick<BusinessPaymentLink, "paymentWalletAddress" | "amount" | "createdAt">,
  transaction: { to: string | null; value: bigint },
  receipt: { status: string },
  blockTimestamp: bigint,
) {
  if (receipt.status !== "success" || transaction.to?.toLowerCase() !== link.paymentWalletAddress.toLowerCase() || transaction.value !== parseAmount(link.amount)) throw new Error("Transaction does not settle this payment link");
  if (blockTimestamp < BigInt(Math.floor(Date.parse(link.createdAt) / 1000))) throw new Error("Transaction predates this payment link");
}

export function openPaymentLinks() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new PaymentLinkRepository(path);
}
