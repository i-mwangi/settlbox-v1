"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useArcWallet } from "@/contexts/ArcWalletProvider";

export function Connect() {
  const wallet = useArcWallet();
  return <div className="space-y-2 p-3 text-sm text-text-primary">{wallet.address ? <><p className="break-all">{wallet.address}</p><div className="flex gap-3"><Link href="/transfer">Send USDC</Link><button onClick={wallet.disconnect}>Disconnect</button></div></> : <button className="w-full rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50" disabled={wallet.isConnecting} onClick={() => { void wallet.connect().catch(error => toast.error(error instanceof Error ? error.message : "Wallet connection failed")); }}>{wallet.isConnecting ? "Connecting…" : "Connect Arc wallet"}</button>}</div>;
}
