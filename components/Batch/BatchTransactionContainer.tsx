"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BusinessRecord, BusinessRecordInput } from "@/types/business";
import { useAuth } from "@/services/auth/context";
import toast from "react-hot-toast";

export function BatchTransactionContainer() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [payments, setPayments] = useState<BusinessRecordInput[]>([]);
  const [saved, setSaved] = useState<BusinessRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const submitted = useRef<{ id: string; payments: BusinessRecordInput[] } | null>(null);
  const saving = useRef(false);
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (payments.length >= 100) return;
    setPayments(previous => [...previous, { kind: "bill", title: String(form.get("title")), counterparty: String(form.get("counterparty")), amount: String(form.get("amount")), recipient: String(form.get("recipient")) as `0x${string}`, dueDate: String(form.get("dueDate")), description: String(form.get("description")) }]);
    event.currentTarget.reset();
  }

  async function save() {
    if (saving.current || !payments.length) return;
    saving.current = true; setBusy(true);
    submitted.current ||= { id: crypto.randomUUID(), payments };
    try {
      const response = await fetch("/api/business-records/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(submitted.current) });
      const result: unknown = await response.json();
      if (!response.ok) { if (response.status === 400) submitted.current = null; throw new Error(result && typeof result === "object" && "error" in result ? String(result.error) : "Batch could not be saved; retry the same request"); }
      setSaved(result as BusinessRecord[]);
      setPayments([]); submitted.current = null;
      await client.invalidateQueries({ queryKey: ["business-records"] });
      toast.success("Batch drafts saved. Review each payment before release.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Batch could not be saved"); }
    finally { saving.current = false; setBusy(false); }
  }

  const field = "w-full rounded-lg border border-primary-divider bg-background p-3";
  return <section className="space-y-5 p-6 text-text-primary"><header><h1 className="text-2xl font-semibold">Batch payments</h1><p>Prepare up to 100 USDC payments. Each saved bill uses treasury limits, approvals, and verified Arc settlement.</p></header>
    {canManage && <form onSubmit={add} className="grid gap-3 rounded-xl border border-primary-divider p-5 md:grid-cols-2"><fieldset disabled={busy || !!submitted.current} className="contents">
      <label>Title<input name="title" required maxLength={160} className={field} /></label><label>Vendor<input name="counterparty" required maxLength={160} className={field} /></label>
      <label>USDC amount<input name="amount" required pattern="[0-9]+(\.[0-9]{1,6})?" inputMode="decimal" className={field} /></label><label>Due date<input name="dueDate" type="date" required className={field} /></label>
      <label className="md:col-span-2">Arc wallet<input name="recipient" required pattern="0x[0-9a-fA-F]{40}" className={field} /></label><label className="md:col-span-2">Description<textarea name="description" required maxLength={4000} className={field} /></label>
      <button type="submit" disabled={payments.length >= 100} className="rounded-lg border border-primary-divider p-3">Add to batch</button>
    </fieldset></form>}
    {payments.map((payment, index) => <article key={index} className="flex flex-wrap justify-between gap-3 rounded-lg border border-primary-divider p-4"><span>{payment.title} · {payment.amount} USDC</span><span className="break-all">{payment.recipient}</span><button disabled={busy || !!submitted.current} onClick={() => setPayments(previous => previous.filter((_, row) => row !== index))}>Remove</button></article>)}
    {!!payments.length && canManage && <button onClick={() => { void save(); }} disabled={busy} className="rounded-lg bg-primary-blue px-5 py-3 text-white">{busy ? "Saving…" : submitted.current ? "Retry saving batch" : `Save ${payments.length} payment drafts`}</button>}
    {saved.map(record => <Link key={record.id} href={`/bill/detail?id=${record.id}`} className="block rounded-lg border border-primary-divider p-4">Review {record.title} · {record.amount} USDC</Link>)}
    <Link href="/bill" className="block text-primary-blue">View all saved bills</Link>
  </section>;
}

export default BatchTransactionContainer;
