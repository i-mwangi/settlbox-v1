import { DatabaseSync } from "node:sqlite";
import { createHash, createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { sandboxCredential, listKoraDestinations, payoutMarkets } from "./kora-sandbox.ts";
import type { FiatRecipient, FiatPayout } from "../../types/fiat-payout.ts";

type StoredPayout = FiatPayout & { credentialHash: string; principal: string; requestId: string };
export const credentialHash = (keyEnv: string) => createHash("sha256").update(sandboxCredential(keyEnv)).digest("hex");
export function validKoraWebhook(keyEnv: string, data: unknown, signature: string) {
  if (!data || typeof data !== "object" || Array.isArray(data) || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", sandboxCredential(keyEnv)).update(JSON.stringify(data)).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function fiatChatResult(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(fiatChatResult);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !["email", "credentialHash", "principal", "requestId"].includes(key)).map(([key, item]) => key === "accountNumber" ? ["accountLastFour", String(item).slice(-4)] : [key, fiatChatResult(item)]));
}
function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) throw new Error(`Enter a valid ${label}`);
  return value.trim();
}
export function fiatAmount(value: unknown) {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,6})(\.\d{1,2})?$/.test(value)) throw new Error("Enter a positive fiat amount with at most two decimal places");
  const [whole, fraction = ""] = value.split(".");
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (minor <= 0n || minor > 100000000n) throw new Error("Sandbox payouts must be between 0.01 and 1,000,000 in local currency");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}
export function validateFiatRecipient(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Recipient details are required");
  const v = value as Record<string, unknown>;
  const country = text(v.country, "country", 2) as FiatRecipient["country"];
  if (!Object.hasOwn(payoutMarkets, country)) throw new Error("Choose Kenya, Nigeria or Ghana");
  const channel = text(v.channel, "destination type", 20) as FiatRecipient["channel"];
  if (!(payoutMarkets[country].channels as readonly string[]).includes(channel)) throw new Error("This destination type is not supported in the selected country");
  const email = text(v.email, "email", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid recipient email");
  let accountNumber = text(v.accountNumber, "account or mobile number", 20);
  if (channel === "mobile_money") {
    accountNumber = accountNumber.replace(/^\+/, "");
    const prefix = country === "KE" ? "254" : "233";
    if (!new RegExp(`^${prefix}\\d{9}$`).test(accountNumber)) throw new Error(`Use an international mobile number starting with ${prefix}, without spaces`);
  } else if (!/^\d{6,20}$/.test(accountNumber)) throw new Error("Enter a bank account number containing 6–20 digits");
  return { name: text(v.name, "recipient name", 100), email, country, channel, accountNumber, destinationCode: text(v.destinationCode, "bank or operator code", 100), currency: payoutMarkets[country].currency };
}
export class FiatPayoutRepository {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS fiat_recipients(company TEXT NOT NULL,id TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(company,id)); CREATE TABLE IF NOT EXISTS fiat_payouts(company TEXT NOT NULL,id TEXT NOT NULL,principal TEXT NOT NULL,request_id TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(company,id),UNIQUE(company,principal,request_id)); CREATE TABLE IF NOT EXISTS fiat_payout_events(id INTEGER PRIMARY KEY,company TEXT NOT NULL,payout TEXT NOT NULL,at TEXT NOT NULL,event TEXT NOT NULL,principal TEXT NOT NULL);");
  }
  close() { this.db.close(); }
  recipients(company: string): FiatRecipient[] { return this.db.prepare("SELECT record FROM fiat_recipients WHERE company=? ORDER BY rowid DESC LIMIT 200").all(company).map(row => JSON.parse(String(row.record))); }
  recipient(company: string, id: string): FiatRecipient | undefined { const row = this.db.prepare("SELECT record FROM fiat_recipients WHERE company=? AND id=?").get(company, id); return row ? JSON.parse(String(row.record)) : undefined; }
  saveRecipient(company: string, value: FiatRecipient) {
    if (this.recipients(company).length >= 200 && !this.recipient(company, value.id)) throw new Error("At most 200 recipients are supported");
    const existing = this.recipient(company, value.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(value)) throw new Error("Recipient already exists; create a new recipient for different account details");
    this.db.prepare("INSERT OR IGNORE INTO fiat_recipients VALUES(?,?,?)").run(company, value.id, JSON.stringify(value)); return existing || value;
  }
  verifyRecipient(company: string, before: FiatRecipient, after: FiatRecipient) {
    const result = this.db.prepare("UPDATE fiat_recipients SET record=? WHERE company=? AND id=? AND record=?").run(JSON.stringify(after), company, before.id, JSON.stringify(before));
    if (result.changes !== 1) throw new Error("Recipient changed. Refresh before verifying again");
    return after;
  }
  stored(company: string, id: string): StoredPayout | undefined { const row = this.db.prepare("SELECT record FROM fiat_payouts WHERE company=? AND id=?").get(company, id); return row ? JSON.parse(String(row.record)) : undefined; }
  public(value: StoredPayout): FiatPayout { const { credentialHash: _key, principal: _principal, requestId: _request, ...safe } = value; return safe; }
  list(company: string): FiatPayout[] { return this.db.prepare("SELECT record FROM fiat_payouts WHERE company=? ORDER BY rowid DESC LIMIT 100").all(company).map(row => this.public(JSON.parse(String(row.record)))); }
  events(company: string) { return this.db.prepare("SELECT payout,at,event,principal FROM fiat_payout_events WHERE company=? ORDER BY id DESC LIMIT 100").all(company); }
  private event(company: string, payout: string, event: string, principal: string) { this.db.prepare("INSERT INTO fiat_payout_events(company,payout,at,event,principal) VALUES(?,?,?,?,?)").run(company, payout, new Date().toISOString(), event, principal); }
  prepare(company: string, principal: string, requestId: string, recipientId: string, amount: unknown, narration: unknown, hash: string) {
    if (!/^[a-zA-Z0-9_-]{5,100}$/.test(requestId)) throw new Error("A stable request ID is required");
    const exact = fiatAmount(amount); const note = text(narration, "payment description", 140);
    const recipient = this.recipient(company, recipientId); if (!recipient) throw new Error("Saved recipient not found");
    // Confirmed by Kora's sandbox disbursement validation on 2026-10-13.
    if (recipient.currency === "NGN" && Number(exact) < 1000) throw new Error("Kora requires at least 1,000 NGN for a sandbox bank payout");
    if (recipient.verification !== "sandbox_verified" && recipient.verification !== "unsupported") throw new Error("Verify this recipient before preparing a payout");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const old = this.db.prepare("SELECT record FROM fiat_payouts WHERE company=? AND principal=? AND request_id=?").get(company, principal, requestId);
      if (old) {
        const saved = JSON.parse(String(old.record)) as StoredPayout;
        if (saved.recipient.id !== recipientId || saved.amount !== exact || saved.narration !== note) throw new Error("This request ID belongs to different payout details");
        this.db.exec("COMMIT"); return this.public(saved);
      }
      const duplicate = this.db.prepare("SELECT id FROM fiat_payouts WHERE company=? AND json_extract(record,'$.recipient.id')=? AND json_extract(record,'$.amount')=? AND json_extract(record,'$.narration')=? AND json_extract(record,'$.status') NOT IN ('failed','cancelled') LIMIT 1").get(company, recipientId, exact, note);
      if (duplicate) throw new Error("An identical payout already exists. Check its status instead of creating another");
      const now = new Date().toISOString(); const id = randomUUID();
      const payout: StoredPayout = { id, reference: `sbx_${id}`, recipient, amount: exact, currency: recipient.currency, narration: note, status: "pending_review", createdAt: now, updatedAt: now, expiresAt: new Date(Date.now() + 15 * 60000).toISOString(), credentialHash: hash, principal, requestId };
      this.db.prepare("INSERT INTO fiat_payouts VALUES(?,?,?,?,?)").run(company, id, principal, requestId, JSON.stringify(payout));
      this.event(company, id, "Sandbox payout prepared; no funds submitted", principal);
      this.db.exec("COMMIT"); return this.public(payout);
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  update(company: string, before: StoredPayout, changes: Partial<FiatPayout>, principal: string, event: string) {
    const after = { ...before, ...changes, updatedAt: new Date().toISOString() };
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.db.prepare("UPDATE fiat_payouts SET record=? WHERE company=? AND id=? AND record=?").run(JSON.stringify(after), company, before.id, JSON.stringify(before));
      if (result.changes !== 1) throw new Error("Payout changed. Refresh its status");
      this.event(company, before.id, event, principal); this.db.exec("COMMIT"); return after;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  claim(company: string, id: string, principal: string, hash: string) {
    const value = this.stored(company, id); if (!value) throw new Error("Payout not found");
    if (value.principal !== principal) throw new Error("Only the owner who prepared this payout can authorize it");
    if (value.status !== "pending_review") throw new Error("This payout was already submitted or cancelled. Check its status");
    if (Date.parse(value.expiresAt) <= Date.now()) throw new Error("Payout review expired. Cancel it and prepare a new request");
    if (value.credentialHash !== hash) throw new Error("The provider account changed. Cancel and prepare a new payout");
    return this.update(company, value, { status: "submitting" }, principal, "Owner authorized sandbox submission");
  }
}
export function openFiatPayouts() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite"); mkdirSync(dirname(path), { recursive: true }); return new FiatPayoutRepository(path);
}

// Only fixed Kora endpoints are callable. Provider bodies and credentials never enter errors.
export async function koraSecretRequest(keyEnv: string, path: string, payload?: unknown): Promise<Record<string, unknown>> {
  const key = sandboxCredential(keyEnv);
  if (!/^\/(balances|misc\/banks\/resolve|misc\/mobile-money\/resolve|transactions\/disburse|transactions\/[a-zA-Z0-9_-]{5,100})$/.test(path)) throw new Error("Unsupported Kora operation");
  const response = await fetch(`https://api.korapay.com/merchant/api/v1${path}`, { method: payload === undefined ? "GET" : "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), redirect: "error", signal: AbortSignal.timeout(20000), cache: "no-store" });
  const reader = response.body?.getReader(); if (!reader) throw new Error("Kora returned no response");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > 256000) { await reader.cancel(); throw new Error("Kora response exceeded the limit"); } chunks.push(item.value); } } finally { reader.releaseLock(); }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!response.ok || body.status !== true || !body.data || typeof body.data !== "object" || Array.isArray(body.data)) throw new Error("Kora did not return a verified result");
  return body.data;
}
export async function createFiatRecipient(store: FiatPayoutRepository, company: string, keyEnv: string, input: unknown, id: string = randomUUID()) {
  if (!/^[a-zA-Z0-9_-]{5,100}$/.test(id)) throw new Error("A valid recipient request ID is required");
  const value = validateFiatRecipient(input);
  const existing = store.recipient(company, id);
  if (existing) {
    if (Object.entries(value).some(([key, field]) => existing[key as keyof FiatRecipient] !== field)) throw new Error("This request ID belongs to a different recipient");
    return existing;
  }
  const choices = await listKoraDestinations(keyEnv, value.country, value.channel);
  const selected = choices.find(item => item.code === value.destinationCode); if (!selected) throw new Error("Select a destination returned by Kora for this country");
  return store.saveRecipient(company, { ...value, id, destinationName: selected.name, destinationSlug: selected.slug, verification: value.country === "KE" && value.channel === "mobile_money" ? "unsupported" : "unverified" });
}
export async function verifyFiatRecipient(store: FiatPayoutRepository, company: string, keyEnv: string, id: string) {
  const recipient = store.recipient(company, id); if (!recipient) throw new Error("Recipient not found");
  if (recipient.verification === "unsupported") return recipient;
  const bank = recipient.channel === "bank_account";
  const result = await koraSecretRequest(keyEnv, bank ? "/misc/banks/resolve" : "/misc/mobile-money/resolve", bank ? { bank: recipient.destinationCode, account: recipient.accountNumber, currency: recipient.currency } : { mobileMoneyCode: recipient.destinationCode, phoneNumber: recipient.accountNumber, currency: recipient.currency });
  if (String(result[bank ? "account_number" : "phone_number"]) !== recipient.accountNumber || String(result[bank ? "bank_code" : "mobile_money_code"]) !== recipient.destinationCode || typeof result.account_name !== "string" || !result.account_name.trim() || result.account_name.length > 200) throw new Error("Kora's resolved destination did not match the saved account");
  return store.verifyRecipient(company, recipient, { ...recipient, verification: "sandbox_verified", resolvedName: result.account_name, verifiedAt: new Date().toISOString() });
}
export function payoutPayload(payout: FiatPayout) {
  const r = payout.recipient;
  return { reference: payout.reference, destination: { type: r.channel, amount: Number(fiatAmount(payout.amount)), currency: payout.currency, narration: payout.narration, customer: { name: r.name, email: r.email }, ...(r.channel === "bank_account" ? { bank_account: { bank: r.destinationCode, account: r.accountNumber } } : { mobile_money: { operator: r.destinationSlug, mobile_number: r.accountNumber } }) } };
}
export function reconciledPayout(payout: FiatPayout, data: Record<string, unknown>): Partial<FiatPayout> {
  if (data.reference !== payout.reference || data.currency !== payout.currency || fiatAmount(String(data.amount)) !== payout.amount) throw new Error("Provider payout identity or amount did not match");
  const status = data.status === "success" ? "sandbox_success" : data.status === "failed" ? "failed" : ["processing", "pending"].includes(String(data.status)) ? "processing" : null;
  if (!status) throw new Error("Provider returned an unknown payout status");
  const fee = data.fee === undefined ? undefined : String(data.fee);
  if (fee !== undefined && !/^\d{1,9}(\.\d{1,2})?$/.test(fee)) throw new Error("Provider returned an invalid fee");
  return { status, ...(fee === undefined ? {} : { fee }), error: undefined };
}
export async function submitFiatPayout(store: FiatPayoutRepository, company: string, principal: string, keyEnv: string, id: string) {
  const payout = store.claim(company, id, principal, credentialHash(keyEnv));
  try {
    const result = await koraSecretRequest(keyEnv, "/transactions/disburse", payoutPayload(payout));
    return store.public(store.update(company, payout, reconciledPayout(payout, result), principal, "Kora sandbox submission response verified"));
  } catch {
    // A timeout or rejection may follow acceptance. Never automatically resubmit.
    return store.public(store.update(company, payout, { status: "uncertain", error: "Submission outcome is unresolved. Check status using this reference; do not submit another payout." }, principal, "Sandbox submission outcome uncertain; retry blocked"));
  }
}
export async function refreshFiatPayout(store: FiatPayoutRepository, company: string, principal: string, keyEnv: string, id: string) {
  const payout = store.stored(company, id); if (!payout) throw new Error("Payout not found");
  if (payout.credentialHash !== credentialHash(keyEnv)) throw new Error("Restore the original provider account before checking this payout");
  if (["pending_review", "cancelled", "sandbox_success", "failed"].includes(payout.status)) return store.public(payout);
  const result = await koraSecretRequest(keyEnv, `/transactions/${payout.reference}`);
  const changes = reconciledPayout(payout, result);
  if (changes.status === payout.status && (changes.fee ?? payout.fee) === payout.fee && !payout.error) return store.public(payout);
  return store.public(store.update(company, payout, changes, principal, "Kora sandbox payout status reconciled"));
}
