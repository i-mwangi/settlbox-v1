"use client";
import { useEffect, useRef, useState } from "react";
import type { FiatRecipient, FiatPayout } from "@/types/fiat-payout";
type Destination = { name: string; code: string; slug: string };
type Snapshot = { recipients: FiatRecipient[]; payouts: FiatPayout[]; events: { at: string; event: string; payout: string }[]; connection: unknown; statusWorkerConfigured: boolean };
export default function PayoutWorkflow() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [country, setCountry] = useState("KE"); const [channel, setChannel] = useState("mobile_money");
  const [choices, setChoices] = useState<Destination[]>([]); const [code, setCode] = useState("");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [account, setAccount] = useState("");
  const [recipientId, setRecipientId] = useState(""); const [amount, setAmount] = useState(""); const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [review, setReview] = useState<FiatPayout>();
  const dialog = useRef<HTMLDialogElement>(null); const attempt = useRef<{ payload: string; id: string } | null>(null);
  const input = "w-full rounded-lg border border-primary-divider bg-background p-3 text-[14px]";
  const button = "rounded-lg border border-primary-divider px-4 py-2 text-[14px] disabled:opacity-50";
  async function reload() {
    const response = await fetch("/api/payout-provider", { cache: "no-store" }); const data = await response.json();
    if (!response.ok) throw new Error(data.error); setSnapshot(data);
    setReview(current => current && current.status !== "pending_review" ? data.payouts.find((row: FiatPayout) => row.id === current.id) || current : current);
  }
  useEffect(() => { void reload().catch(error => setMessage(error.message)); }, []);
  useEffect(() => {
    if (busy) return;
    const timer = setInterval(() => { void reload().catch(() => {}); }, 60000);
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => { if (review && !dialog.current?.open) dialog.current?.showModal(); }, [review]);
  async function action(body: Record<string, unknown>, stable = false) {
    setBusy(true); setMessage("");
    try {
      const payload = JSON.stringify(body);
      if (stable && attempt.current?.payload !== payload) attempt.current = { payload, id: crypto.randomUUID() };
      const response = await fetch("/api/payout-provider", { method: "POST", headers: { "Content-Type": "application/json", ...(stable ? { "Idempotency-Key": attempt.current!.id } : {}) }, body: payload });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      await reload(); return data;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Request failed. Check saved payouts before trying again."); return null; }
    finally { setBusy(false); }
  }
  const selected = snapshot?.recipients.find(row => row.id === recipientId);
  return <section className="mt-6 flex flex-col gap-4 text-[14px]">
    <h2 className="text-[20px] font-semibold">Sandbox recipients and payouts</h2>
    <p className="text-text-secondary">Test delivery to a saved bank or mobile-money account. Amounts use local currency and the company’s simulated Kora balance.</p>
    {!snapshot?.connection && <p>Connect a Kora sandbox account in Settings → Fiat payouts first.</p>}
    <details className="rounded-xl border border-primary-divider p-4"><summary className="cursor-pointer font-medium">Add a recipient</summary>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>Country<select className={input} value={country} onChange={event => { setCountry(event.target.value); setChannel(event.target.value === "NG" ? "bank_account" : "mobile_money"); setChoices([]); setCode(""); }}><option value="KE">Kenya · KES</option><option value="NG">Nigeria · NGN</option><option value="GH">Ghana · GHS</option></select></label>
        <label>Destination type<select className={input} value={channel} onChange={event => { setChannel(event.target.value); setChoices([]); setCode(""); }}>{country !== "NG" && <option value="mobile_money">Mobile money</option>}{country !== "GH" && <option value="bank_account">Bank account</option>}</select></label>
        <button className={`${button} sm:col-span-2 justify-self-start`} disabled={busy || !snapshot?.connection} onClick={async () => { const rows = await action({ action: "destinations", country, channel }); if (rows) { setChoices(rows); setCode(""); } }}>Load banks or operators</button>
        <label>Bank or operator<select className={input} value={code} onChange={event => setCode(event.target.value)}><option value="">Choose a destination</option>{choices.map(row => <option value={row.code} key={`${row.code}-${row.slug}`}>{row.name}</option>)}</select></label>
        <label>{channel === "mobile_money" ? "International mobile number" : "Bank account number"}<input className={input} value={account} onChange={event => setAccount(event.target.value)} maxLength={20} placeholder={channel === "mobile_money" ? (country === "KE" ? "254…" : "233…") : "Account number"} /></label>
        <label>Recipient name<input className={input} value={name} onChange={event => setName(event.target.value)} maxLength={100} /></label>
        <label>Recipient email<input type="email" className={input} value={email} onChange={event => setEmail(event.target.value)} maxLength={254} /></label>
        <button className={`${button} justify-self-start`} disabled={busy || !code || !snapshot?.connection} onClick={async () => { const row = await action({ action: "recipient", recipient: { name, email, country, channel, accountNumber: account, destinationCode: code } }, true); if (row) { setRecipientId(row.id); setMessage("Recipient saved. Verify its account details before preparing a payout."); } }}>Save recipient</button>
      </div>
    </details>
    <label>Saved recipient<select className={input} value={recipientId} onChange={event => setRecipientId(event.target.value)}><option value="">Choose a recipient</option>{snapshot?.recipients.map(row => <option key={row.id} value={row.id}>{row.name} · {row.currency} · {row.accountNumber.slice(-4)}</option>)}</select></label>
    {selected && <div className="rounded-xl border border-primary-divider p-4"><p>{selected.destinationName} · {selected.accountNumber}</p><p>{selected.verification === "unsupported" ? "Account-name verification is unavailable for Kenyan mobile money. Check the exact number and operator yourself; sandbox only." : selected.verification === "sandbox_verified" ? `Sandbox resolved name: ${selected.resolvedName}` : "Account not yet verified"}</p>{selected.verification === "unverified" && <button className={`${button} mt-3`} disabled={busy} onClick={() => void action({ action: "verify", id: selected.id })}>Verify recipient</button>}</div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label>Amount ({selected?.currency || "local currency"})<input inputMode="decimal" className={input} value={amount} onChange={event => setAmount(event.target.value)} /></label><label>Payment description<input className={input} value={narration} onChange={event => setNarration(event.target.value)} maxLength={140} /></label></div>
    {selected?.currency === "NGN" && <p className="text-[12px] text-text-secondary">Minimum sandbox bank payout: 1,000 NGN.</p>}
    <button className={`${button} self-start`} disabled={busy || !selected || selected.verification === "unverified"} onClick={async () => { const row = await action({ action: "prepare", recipientId, amount, narration }, true); if (row) setReview(row); }}>Prepare sandbox payout</button>
    {message && <p role="status">{message}</p>}
    <h3 className="font-semibold">Saved sandbox payouts</h3>
    {snapshot?.statusWorkerConfigured && <p className="text-[12px] text-text-secondary">Submitted payouts are checked automatically while the server is running.</p>}
    {!snapshot?.payouts.length && <p className="text-text-secondary">No sandbox payouts yet.</p>}
    {snapshot?.payouts.map(row => <article key={row.id} className="rounded-xl border border-primary-divider p-4"><p>{row.amount} {row.currency} · {row.recipient.name} · {row.status.replaceAll("_", " ")}</p><p className="text-[12px] text-text-secondary break-all">{row.reference}</p>{row.error && <p>{row.error}</p>}<div className="mt-3 flex gap-2">{row.status === "pending_review" ? <><button className={button} disabled={busy} onClick={() => setReview(row)}>Review sandbox payout</button><button className={button} disabled={busy} onClick={() => void action({ action: "cancel", id: row.id })}>Cancel draft</button></> : <button className={button} disabled={busy} onClick={() => void action({ action: "status", id: row.id })}>Check provider status</button>}</div></article>)}
    <details><summary className="cursor-pointer">Payout audit trail</summary><ul className="mt-3 max-h-64 overflow-y-auto space-y-2">{snapshot?.events.map((event, index) => <li key={index} className="text-[12px]">{event.at} · {event.event}</li>)}</ul></details>
    <dialog ref={dialog} onCancel={event => { if (busy) event.preventDefault(); else setReview(undefined); }} className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-primary-divider bg-background p-6 text-[14px] text-text-primary backdrop:bg-black/40">
      {review && <><h2 className="text-[20px] font-semibold">Review sandbox payout</h2><p className="mt-3">{review.amount} {review.currency} to {review.recipient.name}</p><p>{review.recipient.destinationName} · {review.recipient.accountNumber}</p><p>{review.recipient.email}</p><p className="mt-3">{review.narration}</p><p className="mt-3">Simulated funds only. Fees are unknown until Kora responds. This does not convert Arc USDC or pay a real business obligation.</p>{review.recipient.verification === "unsupported" && <p className="mt-3">Recipient identity is unverified. Check the operator and mobile number before authorizing.</p>}<p className="mt-3">Status: {review.status.replaceAll("_", " ")}</p>{review.fee && <p>Provider-reported fee: {review.fee} {review.currency}</p>}{review.error && <p role="alert">{review.error}</p>}{message && <p role="alert">{message}</p>}<div className="mt-5 flex flex-wrap gap-3">{review.status === "pending_review" && <button className={`${button} bg-[#1b1b1b] text-white`} disabled={busy} onClick={async () => { const result = await action({ action: "submit", id: review.id, confirmSandbox: true }); if (result) setReview(result); }}>{busy ? "Submitting…" : "Authorize sandbox payout"}</button>}<button className={button} disabled={busy} onClick={() => { dialog.current?.close(); setReview(undefined); }}>Close</button></div></>}
    </dialog>
  </section>;
}
