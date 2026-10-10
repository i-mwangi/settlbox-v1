"use client";

import { useState, type FormEvent } from "react";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { formatAmount } from "@/services/arc/amount";
import { createArcReader } from "@/services/arc/client";
import type { EvmAddress, TransactionHash } from "@/types/finance";

export function ArcTransferForm() {
  const wallet = useArcWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<TransactionHash | null>(null);
  const [settlementStatus, setSettlementStatus] = useState<"submitted" | "confirmed" | "failed">("submitted");
  const [checking, setChecking] = useState(false);

  async function checkSettlement() {
    if (!hash || checking) return;
    setChecking(true);
    setError(null);
    try {
      const receipt = await createArcReader().getReceipt(hash);
      setSettlementStatus(receipt.status === "success" ? "confirmed" : "failed");
      await wallet.refreshBalance();
    } catch {
      setError("Settlement is not available yet. Check again or view the explorer.");
    } finally {
      setChecking(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setHash(null);
    setSettlementStatus("submitted");
    try {
      const transactionHash = await wallet.sendUsdc(recipient as EvmAddress, amount);
      setHash(transactionHash);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Payment submission failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-xl space-y-5 p-8 text-text-primary">
      <h1 className="text-2xl font-semibold">Send USDC</h1>
      <p className="text-text-secondary">Send from your connected wallet on {wallet.chainName}. Your wallet will ask you to approve the transfer.</p>
      <p>Wallet balance: {wallet.balanceBaseUnits === null ? "Unavailable" : `${formatAmount(BigInt(wallet.balanceBaseUnits))} USDC`}</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">Recipient address
          <input required value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="0x…" className="mt-1 w-full rounded-lg border p-3" />
        </label>
        <label className="block">Amount in USDC
          <input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className="mt-1 w-full rounded-lg border p-3" />
        </label>
        <button disabled={pending || !wallet.address} className="rounded-lg bg-blue-600 px-4 py-3 text-white disabled:opacity-50">
          {pending ? "Awaiting wallet…" : "Review in wallet"}
        </button>
      </form>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {hash && <div className="space-y-3">
        <p role="status">Transfer {settlementStatus}. <a className="text-blue-600" target="_blank" rel="noreferrer" href={`${createArcReader().chain.blockExplorers.default.url}/tx/${hash}`}>View in explorer</a></p>
        {settlementStatus === "submitted" && <button type="button" disabled={checking} onClick={() => void checkSettlement()} className="rounded-lg border px-4 py-2 disabled:opacity-50">
          {checking ? "Checking…" : "Check settlement"}
        </button>}
      </div>}
    </section>
  );
}

