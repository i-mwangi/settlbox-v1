"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { ArcNetworkIcon } from "./ArcNetworkIcon";

export function ArcWalletControl() {
  const { address, chainName, isConnecting, connect } = useArcWallet();
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 px-4 py-2 text-sm">
      <span className="mr-auto text-text-secondary">
        Settlbox · Arc Testnet
      </span>
      <Link href="/testnet-treasury" className="text-blue-600">
        Company treasury
      </Link>
      <span className="flex items-center gap-2 text-text-secondary">
        <ArcNetworkIcon />
        {chainName}
      </span>
      {address ? (
        <Link href="/transfer" className="text-blue-600">
          {address.slice(0, 6)}…{address.slice(-4)} · Send USDC
        </Link>
      ) : (
        <button
          type="button"
          disabled={isConnecting}
          className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          onClick={() =>
            void connect().catch((error) =>
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Wallet connection failed",
              ),
            )
          }
        >
          {isConnecting ? "Connecting…" : "Connect Arc wallet"}
        </button>
      )}
    </div>
  );
}
