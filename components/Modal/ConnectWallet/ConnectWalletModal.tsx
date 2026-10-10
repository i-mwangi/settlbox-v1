"use client";

import Link from "next/link";
import { useState } from "react";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import type { OverlayProps } from "@/types/overlay";
import BaseModal from "./BaseModal";

export function ConnectWalletModal({ isOpen, onClose, zIndex }: OverlayProps) {
  const wallet = useArcWallet();
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex} title="Connect Arc wallet"><div className="w-[min(420px,90vw)] space-y-4 rounded-b-xl bg-background p-6 text-text-primary"><img src="/logo/settlbox-icon.svg" alt="Settlbox" className="h-12 w-12" /><p>Connect your EVM wallet to send and receive USDC on Arc Testnet.</p><button disabled={wallet.isConnecting} className="w-full rounded-lg bg-blue-600 p-3 text-white disabled:opacity-50" onClick={() => { setError(null); void wallet.connect().then(onClose).catch(failure => setError(failure instanceof Error ? failure.message : "Wallet connection failed")); }}>{wallet.isConnecting ? "Connecting…" : "Connect wallet"}</button>{error && <p role="alert" className="text-red-600">{error}</p>}<Link href="/testnet-treasury" onClick={onClose}>Open company treasury</Link></div></BaseModal>;
}
export default ConnectWalletModal;
