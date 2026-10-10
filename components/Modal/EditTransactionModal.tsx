"use client";

import { type FormEvent } from "react";
import BaseModal from "./BaseModal";
import type { EditTransactionModalProps } from "@/types/modal";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import { useBatchTransactions } from "@/services/store/batchTransactions";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { parseAmount } from "@/services/arc/amount";
import toast from "react-hot-toast";

export function EditTransactionModal({ isOpen, onClose, zIndex, transactionId, recipient = "", amount = "", message = "", onSaveChanges }: ModalProp<EditTransactionModalProps>) {
  const wallet = useArcWallet();
  const edit = useBatchTransactions(state => state.editTransaction);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const changes = { amount: String(values.get("amount")), recipient: String(values.get("recipient")), message: String(values.get("message")), isPrivate: false, recallableTime: 0 };
    try {
      if (!wallet.address || !/^0x[0-9a-f]{40}$/i.test(changes.recipient) || parseAmount(changes.amount) <= 0n) throw new Error("A connected wallet, valid recipient, and positive USDC amount are required");
      edit(wallet.address, transactionId, changes);
      onSaveChanges?.(changes);
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Draft could not be updated"); }
  }
  if (!isOpen) return null;
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}><form onSubmit={save} className="space-y-4 rounded-xl bg-background p-6 text-text-primary"><h2 className="text-xl">Edit payment draft</h2><p>Submitted Arc transactions cannot be edited.</p><label className="block">Recipient<input name="recipient" required defaultValue={recipient} className="mt-1 w-full rounded-lg border bg-background p-3" /></label><label className="block">Amount (USDC)<input name="amount" required defaultValue={amount} className="mt-1 w-full rounded-lg border bg-background p-3" /></label><label className="block">Description<input name="message" maxLength={2000} defaultValue={message} className="mt-1 w-full rounded-lg border bg-background p-3" /></label><button type="submit" className="rounded-lg bg-primary-blue p-3 text-white">Save draft</button></form></BaseModal>;
}
export default EditTransactionModal;
