"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function InvoiceCheckoutRedirect() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("uuid");
  const valid = code !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);

  useEffect(() => {
    if (valid) router.replace(`/payment/${encodeURIComponent(code)}`);
  }, [code, valid, router]);

  return <main className="p-8 text-text-primary"><img src="/logo/settlbox-wordmark.svg" alt="Settlbox" className="mb-6 w-28" /><p role={valid ? "status" : "alert"}>{valid ? "Opening invoice checkout…" : "This invoice link is invalid. Ask the sender for the issued invoice payment link."}</p></main>;
}
