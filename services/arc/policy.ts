import type { PaymentAuthorization, PaymentIntent } from "../../types/finance";
import { parseBaseUnits } from "./amount.ts";

export function authorizePayment(payment: PaymentIntent, authorization: PaymentAuthorization) {
  const { wallet, policy } = authorization;
  if (wallet.chainId !== 5042002 && wallet.chainId !== 5042) throw new Error("Unsupported settlement network");
  if (!payment.id.trim() || !payment.idempotencyKey.trim()) throw new Error("Payment identity is required");
  if (payment.companyId !== wallet.companyId || payment.walletId !== wallet.id) throw new Error("Payment account mismatch");
  if (!/^0x[0-9a-fA-F]{40}$/.test(payment.recipient) || /^0x0{40}$/i.test(payment.recipient)) {
    throw new Error("Invalid recipient address");
  }
  if (payment.amount.symbol !== "USDC" || payment.amount.decimals !== 18) throw new Error("Unsupported settlement asset");
  const amount = parseBaseUnits(payment.amount.baseUnits);
  if (amount === 0n) throw new Error("Payment amount must be positive");
  if (amount > parseBaseUnits(authorization.availableBaseUnits)) throw new Error("Insufficient available funds");
  if (amount > parseBaseUnits(policy.maxPaymentBaseUnits)) throw new Error("Payment exceeds transaction limit");
  const committed = parseBaseUnits(authorization.spentTodayBaseUnits) + parseBaseUnits(authorization.reservedTodayBaseUnits);
  if (committed + amount > parseBaseUnits(policy.dailyLimitBaseUnits)) throw new Error("Payment exceeds daily limit");
  if (!policy.allowedRecipients.some(address => address.toLowerCase() === payment.recipient.toLowerCase())) {
    throw new Error("Recipient is not authorized");
  }
  if (!Number.isInteger(policy.requiredApprovals) || policy.requiredApprovals < 1) throw new Error("Invalid approval policy");
  const approvals = new Set(authorization.approvedBy.filter(id => id.trim().length > 0));
  return amount >= parseBaseUnits(policy.approvalThresholdBaseUnits) && approvals.size < policy.requiredApprovals
    ? "awaiting_approval" as const
    : "ready" as const;
}
