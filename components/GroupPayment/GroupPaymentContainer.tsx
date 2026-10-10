"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useGetAllGroups, useGetGroupPayments, useCreateGroupPayment } from "@/services/api/group-payment";
import { useModal } from "@/contexts/ModalManagerProvider";
import toast from "react-hot-toast";

export default function GroupPaymentContainer() {
  const groups = useGetAllGroups();
  const collections = useGetGroupPayments();
  const create = useCreateGroupPayment();
  const { openModal } = useModal();
  const [groupId, setGroupId] = useState<number | null>(null);
  const id = useRef<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    id.current ||= crypto.randomUUID();
    try { await create.mutateAsync({ id: id.current, title: String(data.get("title")), amount: String(data.get("amount")), groupId, memberCount: Number(data.get("memberCount")) }); id.current = null; form.reset(); toast.success("Collection links created"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Collection could not be created"); }
  }
  return <section className="w-full space-y-5 p-6 text-text-primary"><header className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Group collections</h1><button onClick={() => openModal("CREATE_NEW_GROUP")} className="rounded-lg border p-3">New group</button></header><p>Split a USDC collection into exact contributions. Each contribution has its own single-use Arc payment link.</p>{groups.error && <p role="alert">{groups.error.message}</p>}<div className="flex flex-wrap gap-3">{groups.data?.map(group => <button key={group.id} onClick={() => openModal("EDIT_GROUP", { group })} className="rounded-lg border p-3">{group.name} · {group.members.length} members · Edit</button>)}</div><form onSubmit={submit} className="grid max-w-xl gap-4 rounded-xl border border-primary-divider p-4"><label>Collection title<input name="title" required maxLength={160} className="mt-1 w-full rounded-lg border bg-background p-3" /></label><label>Total (USDC)<input name="amount" required inputMode="decimal" className="mt-1 w-full rounded-lg border bg-background p-3" /></label><label>Group<select value={groupId || ""} onChange={event => { setGroupId(event.target.value ? Number(event.target.value) : null); id.current = null; }} className="mt-1 w-full rounded-lg border bg-background p-3"><option value="">Quick share</option>{groups.data?.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>{groupId === null && <label>Number of contributors<input name="memberCount" type="number" min={1} max={100} defaultValue={2} required className="mt-1 w-full rounded-lg border bg-background p-3" /></label>}<button disabled={create.isPending || !!groups.error} className="rounded-lg bg-primary-blue p-3 text-white">{create.isPending ? "Creating…" : "Create collection"}</button></form><div className="flex items-center justify-between"><h2 className="text-xl">Collections</h2><button onClick={() => { void collections.refetch(); }}>Refresh settlement</button></div>{collections.error ? <p role="alert">{collections.error.message}</p> : collections.isLoading ? <p>Loading collections…</p> : !collections.data.payments.length ? <p>No collections created.</p> : collections.data.payments.map(collection => <article key={collection.id} className="space-y-3 rounded-xl border border-primary-divider p-4"><h3 className="font-semibold">{collection.title} · {collection.amount} USDC</h3><p>{collection.members.filter(member => member.paid).length}/{collection.members.length} paid</p>{collection.members.map(member => <div key={member.linkCode} className="flex flex-wrap items-center justify-between gap-3"><span>{member.name} · {member.amount} USDC · {member.paid ? "Paid" : "Pending"}</span><Link href={`/payment/${member.linkCode}`}>Open payment link</Link><button onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/payment/${member.linkCode}`); toast.success("Link copied"); } catch { toast.error("Copy the payment link from your browser address bar"); } }}>Copy link</button></div>)}</article>)}</section>;
}
