"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { giftRequest, useGiftEscrow } from "@/services/api/gift";
import { giftEscrowAbi } from "@/services/arc/gift-escrow";
import { arcTestnet } from "@/services/arc/network";
import { parseAmount } from "@/services/arc/amount";
import type { EvmAddress, TransactionHash } from "@/types/finance";
import toast from "react-hot-toast";

type PendingGift = {
  id: TransactionHash;
  contract: EvmAddress;
  recipient: EvmAddress;
  amount: string;
  expiresAt: number;
  hash?: TransactionHash;
};
const reader = createPublicClient({
  chain: arcTestnet,
  transport: http(
    process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0],
  ),
});

export function GiftCreationForm() {
  const wallet = useArcWallet();
  const escrow = useGiftEscrow();
  const client = useQueryClient();
  const [pending, setPending] = useState<PendingGift | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const storageKey = wallet.address
    ? `settlbox-pending-gift:${wallet.address.toLowerCase()}`
    : null;
  useEffect(() => {
    setPending(null);
    if (!storageKey) return;
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(storageKey) || "null",
      );
      if (
        value &&
        typeof value === "object" &&
        "id" in value &&
        typeof value.id === "string" &&
        /^0x[0-9a-f]{64}$/i.test(value.id) &&
        "recipient" in value &&
        typeof value.recipient === "string" &&
        /^0x[0-9a-f]{40}$/i.test(value.recipient) &&
        "amount" in value &&
        typeof value.amount === "string" &&
        "expiresAt" in value &&
        typeof value.expiresAt === "number"
      )
        setPending(value as PendingGift);
    } catch {
      toast.error("Saved gift request could not be read");
    }
  }, [storageKey]);

  async function fund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || !wallet.address || !storageKey || !escrow.data)
      return;
    sending.current = true;
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const request = pending || {
        id: `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("")}` as TransactionHash,
        contract: escrow.data.address,
        recipient: String(form.get("recipient")) as EvmAddress,
        amount: String(form.get("amount")),
        expiresAt: Math.floor(
          new Date(String(form.get("expiresAt"))).getTime() / 1000,
        ),
      };
      if (request.contract?.toLowerCase() !== escrow.data.address.toLowerCase())
        throw new Error("The saved gift belongs to another escrow contract");
      if (
        !Number.isSafeInteger(request.expiresAt) ||
        !/^0x[0-9a-f]{40}$/i.test(request.recipient) ||
        /^0x0{40}$/i.test(request.recipient) ||
        parseAmount(request.amount) <= 0n
      )
        throw new Error("Enter a valid recipient, amount, and expiry");
      localStorage.setItem(storageKey, JSON.stringify(request));
      setPending(request);
      const existing = await reader.readContract({
        address: escrow.data.address,
        abi: giftEscrowAbi,
        functionName: "gifts",
        args: [request.id],
      });
      if (existing[4] === 0 && !request.hash) {
        if (request.expiresAt <= Date.now() / 1000) {
          localStorage.removeItem(storageKey);
          setPending(null);
          throw new Error("Choose a future expiry before funding");
        }
        request.hash = await wallet.sendContractTransaction(
          escrow.data.address,
          encodeFunctionData({
            abi: giftEscrowAbi,
            functionName: "createGift",
            args: [request.id, request.recipient, BigInt(request.expiresAt)],
          }),
          parseAmount(request.amount),
        );
        localStorage.setItem(storageKey, JSON.stringify(request));
        setPending({ ...request });
      }
      if (request.hash) {
        const receipt = await reader.waitForTransactionReceipt({
          hash: request.hash,
          timeout: 60000,
        });
        if (receipt.status !== "success") {
          localStorage.removeItem(storageKey);
          setPending(null);
          throw new Error("Gift funding reverted; no gift was created");
        }
      }
      await giftRequest("", "POST", {
        id: request.id,
        ...(request.hash ? { transactionHash: request.hash } : {}),
      });
      localStorage.removeItem(storageKey);
      setPending(null);
      await client.invalidateQueries({ queryKey: ["gifts"] });
      await wallet.refreshBalance();
      toast.success("Gift funding confirmed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gift could not be funded",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="relative space-y-4 overflow-hidden rounded-2xl border border-primary-divider bg-background p-6">
      <img
        src="/gift/generate-box-gift.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute right-6 top-4 h-20 opacity-20"
      />
      <h2 className="relative text-xl font-semibold">Create a Gift</h2>
      <p className="relative max-w-xl text-sm leading-5 text-text-secondary">
        USDC comes from your connected wallet. Only the selected recipient can
        claim. The sender can refund an unclaimed gift after expiry.
      </p>
      {escrow.error && (
        <p role="alert">
          {escrow.error.message}{" "}
          <button
            onClick={() => {
              void escrow.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {!wallet.address ? (
        <button
          onClick={() => {
            void wallet.connect().catch((error) => toast.error(error.message));
          }}
        >
          Connect Arc wallet
        </button>
      ) : (
        <form onSubmit={fund} className="relative max-w-xl space-y-4">
          <fieldset disabled={busy || !!pending} className="space-y-4">
            <label className="block">
              Recipient wallet
              <input
                name="recipient"
                required
                pattern="0x[0-9a-fA-F]{40}"
                className="block w-full rounded-lg border p-3"
              />
            </label>
            <label className="block">
              Amount (USDC)
              <input
                name="amount"
                required
                inputMode="decimal"
                pattern="[0-9]+(\.[0-9]{1,18})?"
                className="block w-full rounded-lg border p-3"
              />
            </label>
            <label className="block">
              Expiry (your local time)
              <input
                name="expiresAt"
                type="datetime-local"
                required
                className="block w-full rounded-lg border p-3"
              />
            </label>
          </fieldset>
          {pending && (
            <p className="break-all">
              Saved request: {pending.amount} USDC to {pending.recipient}.
              Retrying checks this gift before funding again.
            </p>
          )}
          <button
            disabled={busy || !escrow.data}
            className="rounded-lg bg-primary-blue px-5 py-3 text-white"
          >
            {busy
              ? "Verifying gift…"
              : pending
                ? "Retry saved gift"
                : "Fund gift"}
          </button>
        </form>
      )}
    </div>
  );
}
