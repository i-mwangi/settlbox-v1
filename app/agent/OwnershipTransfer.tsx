"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData, parseAbi } from "viem";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";

interface Ownership { address: string; owner: string; target: string; accepted: boolean; nominated: boolean; chainId: number }
interface Provider { isRabby?: boolean; providers?: Provider[]; request(input: { method: string; params?: unknown[] }): Promise<unknown> }
export default function OwnershipTransfer({ address, onChallenge }: { address: string; onChallenge: (id: string) => void }) {
  const queries = useQueryClient();
  const [state, setState] = useState<Ownership | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = <T,>(action: string) => workspaceFetch<T>("/api/treasury/human-wallet", "POST", { action, address, requestId: crypto.randomUUID() });
  const perform = async (action: "check" | "nominate" | "accept") => {
    setBusy(true); setMessage("");
    try {
      const current = await request<Ownership>("ownership"); setState(current);
      if (current.accepted) { await queries.invalidateQueries({ queryKey: ["treasury-vault"] }); setMessage("Circle wallet ownership is confirmed on Arc. Settlbox configuration has been updated."); return; }
      if (action === "nominate") {
        const injected = (window as Window & { ethereum?: Provider }).ethereum;
        const rabby = injected?.providers?.find(provider => provider.isRabby) || (injected?.isRabby ? injected : undefined);
        if (!rabby) throw new Error("Open Settlbox in the browser where Rabby is installed to sign the nomination.");
        const accounts = await rabby.request({ method: "eth_requestAccounts" }) as string[];
        if (accounts[0]?.toLowerCase() !== current.owner.toLowerCase()) throw new Error(`Select the current administrator in Rabby: ${current.owner}`);
        await rabby.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${current.chainId.toString(16)}` }] });
        const chain = await rabby.request({ method: "eth_chainId" });
        if (Number(chain) !== current.chainId) throw new Error("Rabby must be connected to Arc Testnet");
        const data = encodeFunctionData({ abi: parseAbi(["function proposeOwner(address value)"]), functionName: "proposeOwner", args: [address as `0x${string}`] });
        const hash = await rabby.request({ method: "eth_sendTransaction", params: [{ from: accounts[0], to: current.address, data, value: "0x0" }] });
        setMessage(`Nomination submitted: ${String(hash)}. Check ownership after it confirms.`);
      } else if (action === "accept") {
        if (!current.nominated) throw new Error("Wait for the Rabby nomination to confirm first");
        const result = await request<{ challengeId: string }>("accept_ownership"); onChallenge(result.challengeId);
        setMessage("Use Review and authorize accept ownership above to sign with Circle. Then check ownership after confirmation.");
      } else setMessage(current.nominated ? "Nomination confirmed. You can now accept with Circle." : "The current administrator must nominate this wallet using Rabby.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ownership request failed"); }
    finally { setBusy(false); }
  };
  return <div className="space-y-2 rounded-lg border border-primary-divider p-3">
    <p className="font-medium">Transfer vault administration</p>
    <p className="text-text-secondary">1. Sign the nomination with the current administrator in Rabby. 2. Accept with your Circle PIN. 3. Check ownership to verify and update Settlbox. Keep the vault paused.</p>
    <div className="flex flex-wrap gap-2">{([['nominate', 'Nominate with Rabby'], ['accept', 'Accept with Circle'], ['check', 'Check ownership']] as const).map(([action, label]) => <button key={action} disabled={busy || (action === 'accept' && !state?.nominated)} onClick={() => void perform(action)} className="rounded-lg border border-primary-divider px-3 py-2 disabled:opacity-50">{label}</button>)}</div>
    {message && <p role="status" className="break-all">{message}</p>}
  </div>;
}
