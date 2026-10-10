import type { PaymentAuthorization, PaymentExecution, PaymentIntent } from "../../types/finance";
import { authorizePayment } from "./policy.ts";

export interface PaymentRepository {
  reserveAuthorizedAtomically(
    payment: PaymentIntent,
    authorize: (authorization: PaymentAuthorization) => "ready" | "awaiting_approval",
  ): Promise<{ created: boolean; execution: PaymentExecution }>;
  markSubmitted(paymentId: string, execution: PaymentExecution): Promise<void>;
}

export interface PaymentExecutor {
  submit(payment: PaymentIntent): Promise<PaymentExecution>;
}

export function createPaymentService(dependencies: {
  repository: PaymentRepository;
  executor: PaymentExecutor;
}) {
  return {
    async submit(payment: PaymentIntent): Promise<PaymentExecution> {
      const reservation = await dependencies.repository.reserveAuthorizedAtomically(
        payment,
        authorization => authorizePayment(payment, authorization),
      );
      if (!reservation.created || reservation.execution.status !== "ready") return reservation.execution;
      const execution = await dependencies.executor.submit(payment);
      const submitted = execution.status === "submitted" && /^0x[0-9a-fA-F]{64}$/.test(execution.transactionHash ?? "");
      const processing = execution.status === "processing" && Boolean(execution.providerTransactionId?.trim());
      if (execution.paymentId !== payment.id || !(submitted || processing)) {
        throw new Error("Invalid payment submission response");
      }
      await dependencies.repository.markSubmitted(payment.id, execution);
      return execution;
    },
  };
}
