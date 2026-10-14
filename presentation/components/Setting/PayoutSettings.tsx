"use client";
import FinanceButton from "../Common/FinanceButton";
import { useEffect, useState } from "react";
type Destination = { name: string; code: string; slug: string };
export default function PayoutSettings() {
  const [keyEnv, setKeyEnv] = useState("SETTLBOX_KORA_COMPANY_TEST_KEY");
  const [connected, setConnected] = useState(false);
  const [country, setCountry] = useState("KE");
  const [channel, setChannel] = useState("mobile_money");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; fetch("/api/payout-provider", { cache: "no-store" }).then(async response => {
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    if (active && data.connection) { setConnected(true); setKeyEnv(data.connection.keyEnv); }
  }).catch(error => { if (active) setMessage(error.message); }); return () => { active = false; }; }, []);
  async function act(action: string) {
    setBusy(true); setMessage(""); setDestinations([]);
    try {
      const response = await fetch("/api/payout-provider", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, keyEnv, country, channel }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (action === "destinations") { setDestinations(data); setMessage("Available destinations returned by Kora. No payment was sent."); }
      else { setConnected(action === "save"); setMessage(action === "save" ? "Sandbox account assigned to this business." : "Sandbox account disconnected."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Provider request failed"); }
    finally { setBusy(false); }
  }
  const input = "border border-border rounded-lg p-3 text-[14px] bg-background";
  const button = "border border-border rounded-lg px-4 py-2 text-[14px] disabled:opacity-50";
  return <section className="flex flex-col gap-4 text-[14px]">
    <h2 className="text-[18px] font-semibold"><img src="/sidebar/crypto-ramp.svg" alt="" className="inline-block w-8 h-8 mr-3"/>Fiat payouts</h2>
    <p className="text-text-secondary">Connect this business’s Kora sandbox account to check available bank and mobile-money destinations.</p>
    <p>Sandbox setup · Live payouts are unavailable</p>
    <label className="flex flex-col gap-2">Test key environment variable
      <input className={input} value={keyEnv} onChange={event => setKeyEnv(event.target.value)} maxLength={100} placeholder="SETTLBOX_KORA_COMPANY_TEST_KEY" />
    </label>
    <p className="text-[12px] text-text-secondary">Store the secret key on the server. Enter only its environment variable name here. Destination checks also require its matching test public key in the same variable name ending in _PUBLIC_KEY.</p>
    <div className="flex gap-2"><FinanceButton className={button} disabled={busy} onClick={() => act("save")}>Save sandbox account</FinanceButton>{connected && <FinanceButton className={button} disabled={busy} onClick={() => act("disconnect")}>Disconnect</FinanceButton>}</div>
    <div className="flex gap-3 flex-wrap">
      <label className="flex flex-col gap-2">Country<select className={input} value={country} onChange={event => { const value = event.target.value; setCountry(value); setChannel(value === "NG" ? "bank_account" : "mobile_money"); setDestinations([]); }}><option value="KE">Kenya · KES</option><option value="NG">Nigeria · NGN</option><option value="GH">Ghana · GHS</option></select></label>
      <label className="flex flex-col gap-2">Destination<select className={input} value={channel} onChange={event => { setChannel(event.target.value); setDestinations([]); }}>{country !== "GH" && <option value="bank_account">Bank account</option>}{country !== "NG" && <option value="mobile_money">Mobile money</option>}</select></label>
    </div>
    <FinanceButton className={`${button} self-start`} disabled={busy || !connected} onClick={() => act("destinations")}>{busy ? "Checking…" : "Check available destinations"}</FinanceButton>
    {message && <p role="status">{message}</p>}
    {!!destinations.length && <ul className="max-h-80 overflow-y-auto border border-border rounded-lg divide-y divide-border">{destinations.map(item => <li className="p-3" key={`${item.code}-${item.slug}`}>{item.name}</li>)}</ul>}

  </section>;
}
