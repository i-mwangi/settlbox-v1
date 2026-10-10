"use client";
import { useCallback, useEffect, useState } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { workspaceFetch } from "./seeded-workspace";
import type { Reimbursement } from "@/types/reimbursement";

export function useReimbursements() {
  const { activeEntityId } = useDemo();
  const [records, setRecords] = useState<Reimbursement[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const data = await workspaceFetch<Reimbursement[]>(`/api/reimbursements?entity=${encodeURIComponent(activeEntityId)}`);
    setRecords(data);
    setError("");
  }, [activeEntityId]);
  useEffect(() => {
    let active = true;
    setRecords([]);
    workspaceFetch<Reimbursement[]>(`/api/reimbursements?entity=${encodeURIComponent(activeEntityId)}`).then(data => { if (active) { setRecords(data); setError(""); } }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load expenses"); });
    return () => { active = false; };
  }, [activeEntityId]);
  const action = useCallback(async (input: { action: "create"; record: Reimbursement } | { action: "approve" | "reject" | "pay" | "refresh" | "authorize"; id: string; note?: string }) => {
    setBusy(true);
    try {
      const result = await workspaceFetch<Reimbursement>("/api/reimbursements", "POST", { ...input, entity: activeEntityId });
      await load().catch(reason => setError(reason instanceof Error ? reason.message : "Saved; refresh to reload expenses"));
      window.dispatchEvent(new Event("settlbox-workspace-refresh"));
      return result;
    } finally { setBusy(false); }
  }, [activeEntityId, load]);
  return { records, error, busy, action, reload: load };
}
