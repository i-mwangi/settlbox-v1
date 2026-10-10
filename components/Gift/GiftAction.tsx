"use client";

import { useState } from "react";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { useGiftEscrow } from "@/services/api/gift";
import { giftEscrowAbi } from "@/services/arc/gift-escrow";
import { arcTestnet } from "@/services/arc/network";
import type { ArcGift } from "@/types/arc-gift";
import toast from "react-hot-toast";

const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });

export function GiftAction({ gift }: { gift: ArcGift }) {
  const wallet = useArcWallet();
  const escrow = useGiftEscrow();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const claim = gift.status === "active" && wallet.address?.toLowerCase() === gift.recipient.toLowerCase();
  const refund = gift.status === "expired" && wallet.address?.toLowerCase() === gift.sender.toLowerCase();
  async function execute() {
    if (busy || !escrow.data || (!claim && !refund && !hash)) return;
    setBusy(true);
    try {
      const transactionHash = hash || await wallet.sendContractTransaction(escrow.data.address, encodeFunctionData({ abi: giftEscrowAbi, functionName: claim ? "claimGift" : "refundGift", args: [gift.id] }));
      setHash(transactionHash);
      const receipt = await reader.waitForTransactionReceipt({ hash: transactionHash, timeout: 60000 });
      if (receipt.status !== "success") { setHash(null); throw new Error("Gift transaction reverted"); }
      await Promise.all([client.invalidateQueries({ queryKey: ["gifts"] }), client.invalidateQueries({ queryKey: ["gift", gift.id] }), wallet.refreshBalance()]);
      setHash(null);
      toast.success("Gift transaction confirmed");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gift transaction failed"); }
    finally { setBusy(false); }
  }
  if (gift.status === "claimed" || gift.status === "refunded") return <span>{gift.status}</span>;
  if (!wallet.address) return <button onClick={() => { void wallet.connect().catch(error => toast.error(error.message)); }}>Connect recipient or sender wallet</button>;
  return <div className="space-y-2">{escrow.error && <p role="alert">{escrow.error.message}</p>}{claim || refund || hash ? <button disabled={busy || !escrow.data} onClick={() => { void execute(); }} className="rounded-lg bg-primary-blue px-4 py-2 text-white">{busy ? "Confirming…" : hash ? "Check submitted transaction" : claim ? "Claim gift" : "Refund expired gift"}</button> : <p className="text-sm">{gift.status === "expired" ? "The sender can refund this expired gift." : "Only the selected recipient wallet can claim this gift."}</p>}{hash && <a href={`${arcTestnet.blockExplorers.default.url}/tx/${hash}`} target="_blank" rel="noreferrer">View transaction</a>}</div>;
}
