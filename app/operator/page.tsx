"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import AuthCanvas from "@/components/Login/AuthCanvas";

export default function OperatorPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/operator/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error("Workspace access token was rejected");
      setToken("");
      setAuthenticated(true);
      queryClient.setQueryData(["operator-session"], true);
      await queryClient.invalidateQueries();
      const returnTo = new URLSearchParams(window.location.search).get(
        "returnTo",
      );
      let redirectPath = "/";
      if (
        returnTo?.startsWith("/") &&
        !returnTo.startsWith("//") &&
        !returnTo.includes("\\")
      ) {
        const destination = new URL(returnTo, window.location.origin);
        if (
          destination.origin === window.location.origin &&
          !["/operator", "/login"].includes(destination.pathname)
        )
          redirectPath = `${destination.pathname}${destination.search}${destination.hash}`;
      }
      router.replace(redirectPath);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCanvas>
      <section className="w-full max-w-[460px] space-y-5 rounded-[24px] border border-primary-divider bg-background p-8 text-text-primary shadow-[0_20px_80px_-30px_rgba(0,0,0,0.18)]">
        <img
          src="/logo/settlbox-icon.svg"
          alt="Settlbox"
          width={36}
          height={36}
          className="mx-auto block h-9 w-9 object-contain"
        />
        <div className="text-center">
          <h1 className="text-[26px] font-semibold tracking-tight">
            Welcome to Settlbox
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in to your company workspace.
          </p>
        </div>
        {authenticated ? (
          <div className="space-y-3"><p role="status">Opening your workspace…</p><a href="/" className="block text-center text-sm text-primary-blue">Continue to dashboard</a></div>
        ) : (
          <form onSubmit={signIn} className="space-y-4">
            <label className="block">
              Workspace access token
              <input
                required
                type="password"
                autoComplete="off"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="mt-2 w-full rounded-lg border p-3"
              />
            </label>
            <button
              disabled={pending}
              className="w-full rounded-lg bg-text-primary px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? "Signing in…" : "Continue to workspace"}
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-text-secondary">
          Arc Testnet · Company funds stay protected by workspace permissions.
        </p>
      </section>
    </AuthCanvas>
  );
}
