"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";

async function authorize(
  input: unknown,
): Promise<{ id: string; message: string; authenticated?: boolean }> {
  const response = await fetch("/api/team/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Invitation authorization failed");
  return result;
}
export default function TeamInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const wallet = useArcWallet();
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = async () => {
    if (!token || !wallet.address) return;
    setPending(true);
    setError(null);
    try {
      const challenge = await authorize({
        action: "challenge",
        address: wallet.address,
        token,
      });
      const signature = await wallet.signMessage(challenge.message);
      const result = await authorize({
        action: "verify",
        id: challenge.id,
        signature,
      });
      if (!result.authenticated)
        throw new Error("Workspace authorization was not completed");
      setAccepted(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Invitation authorization failed",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="bg-app-background px-10 py-8 rounded-[24px] w-[510px] space-y-6 text-center">
        <img
          src="/logo/settlbox-icon-dark.svg"
          alt="Settlbox"
          className="h-10 mx-auto"
        />
        <h1 className="text-2xl font-semibold">
          {accepted ? "Welcome to the team" : "Join your Settlbox team"}
        </h1>
        <p className="text-sm text-text-secondary">
          {accepted
            ? "Your invitation is saved and workspace access is active."
            : "Accept your private invitation by proving ownership of the wallet you will use for team approvals. This signs an authorization message and does not transfer funds."}
        </p>
        {!token && (
          <p role="alert">
            Invalid invitation link. Ask the workspace owner for a new link.
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}
        {accepted ? (
          <PrimaryButton
            text="Continue to workspace"
            onClick={() => {
              window.location.assign("/");
            }}
          />
        ) : (
          token &&
          (wallet.address ? (
            <>
              <p className="text-sm break-all">{wallet.address}</p>
              <PrimaryButton
                text="Accept invitation"
                onClick={accept}
                loading={pending}
              />
            </>
          ) : (
            <PrimaryButton
              text="Connect team wallet"
              loading={wallet.isConnecting}
              onClick={async () => {
                try {
                  await wallet.connect();
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Could not connect wallet",
                  );
                }
              }}
            />
          ))
        )}
        <button
          type="button"
          className="text-sm text-text-secondary"
          onClick={() => router.push("/login")}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
