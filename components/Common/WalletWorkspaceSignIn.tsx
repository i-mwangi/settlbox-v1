"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { ArcNetworkIcon } from "@/components/Common/ArcNetworkIcon";

export function WalletWorkspaceSignIn({ token }: { token?: string }) {
  const wallet = useArcWallet();
  const router = useRouter();
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signIn() {
    if (!wallet.address || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/team/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "challenge",
          address: wallet.address,
          token,
        }),
      });
      if (!response.ok)
        throw new Error("Invitation or wallet access is unavailable");
      const challenge = (await response.json()) as {
        id: string;
        message: string;
      };
      const signature = await wallet.signMessage(challenge.message);
      const verified = await fetch("/api/team/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", id: challenge.id, signature }),
      });
      if (!verified.ok)
        throw new Error(
          "Wallet authorization failed. Renew the invitation or try again.",
        );
      client.clear();
      client.setQueryData(["operator-session"], true);
      router.replace("/");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Wallet sign-in failed",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="space-y-4 border-t border-primary-divider pt-5 text-text-primary">
      <h2 className="text-center text-sm font-medium">
        {token
          ? "Accept workspace invitation"
          : "Or continue with your team wallet"}
      </h2>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary-divider bg-app-background p-3">
        <span className="flex items-center gap-2 text-sm">
          <ArcNetworkIcon />
          Arc Testnet
        </span>
        {wallet.address ? (
          <span className="text-xs">
            {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
          </span>
        ) : (
          <button
            disabled={wallet.isConnecting}
            onClick={() => {
              void wallet
                .connect()
                .catch((failure) =>
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : "Wallet connection failed",
                  ),
                );
            }}
            className="text-sm font-medium text-primary-blue"
          >
            {wallet.isConnecting ? "Connecting…" : "Connect wallet"}
          </button>
        )}
      </div>
      <button
        disabled={!wallet.address || pending}
        onClick={() => {
          void signIn();
        }}
        className="w-full rounded-lg border border-primary-divider px-4 py-3 text-sm font-medium disabled:opacity-50"
      >
        {pending
          ? "Awaiting wallet authorization…"
          : token
            ? "Accept invitation"
            : "Sign in with wallet"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
