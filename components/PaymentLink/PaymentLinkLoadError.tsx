"use client";

import Link from "next/link";
import { PaymentLinkRequestError } from "@/services/api/payment-link";

export function PaymentLinkLoadError({ error, retry, returnTo = "/payment-link" }: { error: Error; retry: () => void; returnTo?: string }) {
  const requiresSignIn = error instanceof PaymentLinkRequestError && error.status === 401;
  return <div role="alert" className="flex h-64 flex-col items-center justify-center gap-4 p-6 text-center">
    <h2 className="font-semibold text-text-primary">{requiresSignIn ? "Authorize workspace access" : "Workspace records could not be loaded"}</h2>
    <p className="max-w-md text-sm text-text-secondary">{requiresSignIn ? "Server-backed business records require operator authorization." : error.message}</p>
    {requiresSignIn ? <Link href={`/operator?returnTo=${encodeURIComponent(returnTo)}`} className="rounded-lg bg-primary-blue px-4 py-2 text-white">Authorize workspace</Link> : <button type="button" onClick={retry} className="rounded-lg border border-primary-divider px-4 py-2 text-text-primary">Try again</button>}
  </div>;
}
