import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import type { PaymentAuthorization, PaymentExecution, PaymentIntent, WalletReference, ApprovalPolicy } from "../../types/finance";
import type { PaymentRepository } from "../arc/payment-service";
import { parseBaseUnits } from "../arc/amount.ts";

export interface TreasuryAccount {
  wallet: WalletReference;
  policy: ApprovalPolicy;
  balanceBaseUnits: string;
  gasReserveBaseUnits: string;
}

function paymentFingerprint(payment: PaymentIntent): string {
  return createHash("sha256").update(JSON.stringify([
    payment.companyId, payment.walletId, payment.recipient.toLowerCase(), payment.amount.symbol,
    payment.amount.baseUnits, payment.amount.decimals, payment.purpose,
  ])).digest("hex");
}

function readJson<T>(value: unknown): T {
  if (typeof value !== "string") throw new Error("Invalid treasury record");
  return JSON.parse(value) as T;
}

export class SqlitePaymentRepository implements PaymentRepository {
  private readonly database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS treasury_accounts (id TEXT PRIMARY KEY, company_id TEXT NOT NULL, record TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS treasury_payments (
        id TEXT PRIMARY KEY, wallet_id TEXT NOT NULL, company_id TEXT NOT NULL, idempotency_key TEXT NOT NULL,
        fingerprint TEXT NOT NULL, intent TEXT NOT NULL, execution TEXT NOT NULL, created_at TEXT NOT NULL, reserved_at TEXT,
        UNIQUE(wallet_id, idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS treasury_approvals (payment_id TEXT NOT NULL, principal_id TEXT NOT NULL, PRIMARY KEY(payment_id, principal_id));
      CREATE INDEX IF NOT EXISTS treasury_company_history ON treasury_payments(company_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS treasury_wallet_status ON treasury_payments(wallet_id, json_extract(execution, '$.status'), reserved_at);
    `);
  }

  saveAccount(account: TreasuryAccount): void {
    parseBaseUnits(account.balanceBaseUnits);
    parseBaseUnits(account.gasReserveBaseUnits);
    this.database.prepare("INSERT INTO treasury_accounts(id, company_id, record) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET record=excluded.record WHERE company_id=excluded.company_id")
      .run(account.wallet.id, account.wallet.companyId, JSON.stringify(account));
  }

  getAccount(walletId: string, companyId: string): TreasuryAccount {
    const row = this.database.prepare("SELECT record FROM treasury_accounts WHERE id=? AND company_id=?").get(walletId, companyId);
    if (!row) throw new Error("Treasury account not found");
    return readJson<TreasuryAccount>(row.record);
  }

  approve(paymentId: string, companyId: string, principalId: string): void {
    if (!principalId.trim()) throw new Error("Approver identity is required");
    const payment = this.database.prepare("SELECT id FROM treasury_payments WHERE id=? AND company_id=?").get(paymentId, companyId);
    if (!payment) throw new Error("Payment not found");
    this.database.prepare("INSERT OR IGNORE INTO treasury_approvals(payment_id, principal_id) VALUES(?, ?)").run(paymentId, principalId);
  }

  planningCommitments(companyId: string, walletId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = this.database.prepare("SELECT intent,execution,reserved_at FROM treasury_payments WHERE company_id=? AND wallet_id=? AND json_extract(execution,'$.status') IN ('ready','processing','submitted','confirmed')").all(companyId, walletId);
    let reserved = 0n;
    let committedToday = 0n;
    for (const row of rows) {
      const execution = readJson<PaymentExecution>(row.execution);
      const amount = parseBaseUnits(readJson<PaymentIntent>(row.intent).amount.baseUnits);
      if (execution.status !== "confirmed") reserved += amount;
      if (String(row.reserved_at).startsWith(today)) committedToday += amount;
    }
    return { reservedBaseUnits: reserved.toString(), committedTodayBaseUnits: committedToday.toString() };
  }

  async reserveAuthorizedAtomically(payment: PaymentIntent, authorize: (authorization: PaymentAuthorization) => "ready" | "awaiting_approval") {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const fingerprint = paymentFingerprint(payment);
      const existing = this.database.prepare("SELECT id, fingerprint, execution FROM treasury_payments WHERE id=? OR (wallet_id=? AND idempotency_key=?)")
        .get(payment.id, payment.walletId, payment.idempotencyKey);
      if (existing && (existing.id !== payment.id || existing.fingerprint !== fingerprint)) throw new Error("Idempotency key conflicts with another payment");
      const previous = existing ? readJson<PaymentExecution>(existing.execution) : undefined;
      if (previous && previous.status !== "awaiting_approval") {
        this.database.exec("COMMIT");
        return { created: false, execution: previous };
      }
      const account = this.getAccount(payment.walletId, payment.companyId);
      const today = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const rows = this.database.prepare("SELECT intent, execution, reserved_at FROM treasury_payments WHERE wallet_id=? AND id<>? AND (json_extract(execution,'$.status') IN ('ready','processing','submitted') OR (json_extract(execution,'$.status')='confirmed' AND reserved_at>=? AND reserved_at<?))")
        .all(payment.walletId, payment.id, today, tomorrow);
      let reserved = 0n;
      let reservedToday = 0n;
      let spentToday = 0n;
      for (const row of rows) {
        const execution = readJson<PaymentExecution>(row.execution);
        const intent = readJson<PaymentIntent>(row.intent);
        const amount = parseBaseUnits(intent.amount.baseUnits);
        const currentDay = String(row.reserved_at).startsWith(today);
        if (["ready", "processing", "submitted"].includes(execution.status)) {
          reserved += amount;
          if (currentDay) reservedToday += amount;
        }
        if (execution.status === "confirmed" && currentDay) spentToday += amount;
      }
      const available = parseBaseUnits(account.balanceBaseUnits) - reserved - parseBaseUnits(account.gasReserveBaseUnits);
      const approvedBy = this.database.prepare("SELECT principal_id FROM treasury_approvals WHERE payment_id=?").all(payment.id).map(row => String(row.principal_id));
      const status = authorize({
        wallet: account.wallet, policy: account.policy, availableBaseUnits: (available > 0n ? available : 0n).toString(),
        spentTodayBaseUnits: spentToday.toString(), reservedTodayBaseUnits: reservedToday.toString(), approvedBy,
      });
      const execution: PaymentExecution = { paymentId: payment.id, status };
      const now = new Date().toISOString();
      this.database.prepare("INSERT INTO treasury_payments(id,wallet_id,company_id,idempotency_key,fingerprint,intent,execution,created_at,reserved_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET execution=excluded.execution,reserved_at=excluded.reserved_at")
        .run(payment.id, payment.walletId, payment.companyId, payment.idempotencyKey, fingerprint, JSON.stringify(payment), JSON.stringify(execution), now, status === "ready" ? now : null);
      this.database.exec("COMMIT");
      return { created: status === "ready", execution };
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  async markSubmitted(paymentId: string, execution: PaymentExecution): Promise<void> {
    const row = this.database.prepare("SELECT execution FROM treasury_payments WHERE id=?").get(paymentId);
    if (!row || readJson<PaymentExecution>(row.execution).status !== "ready") throw new Error("Payment has no active reservation");
    if (execution.paymentId !== paymentId) throw new Error("Payment identity mismatch");
    const result = this.database.prepare("UPDATE treasury_payments SET execution=? WHERE id=? AND execution=?").run(JSON.stringify(execution), paymentId, String(row.execution));
    if (Number(result.changes) !== 1) throw new Error("Payment reservation changed during submission");
  }

  recordSettlement(companyId: string, execution: PaymentExecution): void {
    if (execution.status !== "confirmed" && execution.status !== "failed") throw new Error("Settlement must be terminal");
    if (execution.status === "confirmed" && !/^0x[0-9a-fA-F]{64}$/.test(execution.transactionHash ?? "")) throw new Error("Settlement hash is required");
    const row = this.database.prepare("SELECT execution FROM treasury_payments WHERE id=? AND company_id=?").get(execution.paymentId, companyId);
    if (!row) throw new Error("Payment not found");
    const previous = readJson<PaymentExecution>(row.execution);
    if (!previous.providerTransactionId || previous.providerTransactionId !== execution.providerTransactionId) throw new Error("Settlement provider identity mismatch");
    if (["confirmed", "failed"].includes(previous.status)) {
      if (JSON.stringify(previous) !== JSON.stringify(execution)) throw new Error("Payment already has a different settlement");
      return;
    }
    const result = this.database.prepare("UPDATE treasury_payments SET execution=? WHERE id=? AND execution=?")
      .run(JSON.stringify(execution), execution.paymentId, String(row.execution));
    if (Number(result.changes) !== 1) throw new Error("Payment changed during settlement");
  }

  list(companyId: string): { intent: PaymentIntent; execution: PaymentExecution }[] {
    return this.database.prepare("SELECT intent, execution FROM treasury_payments WHERE company_id=? ORDER BY created_at DESC LIMIT 100")
      .all(companyId).map(row => ({ intent: readJson<PaymentIntent>(row.intent), execution: readJson<PaymentExecution>(row.execution) }));
  }

  find(paymentId: string, companyId: string): { intent: PaymentIntent; execution: PaymentExecution } | undefined {
    const row = this.database.prepare("SELECT intent, execution FROM treasury_payments WHERE id=? AND company_id=?").get(paymentId, companyId);
    return row ? { intent: readJson<PaymentIntent>(row.intent), execution: readJson<PaymentExecution>(row.execution) } : undefined;
  }

  close(): void {
    this.database.close();
  }
}
