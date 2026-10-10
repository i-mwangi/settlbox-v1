"use client";

import Link from "next/link";
import { useGetMyCompany } from "@/services/api/company";
import { useGetTeamStats } from "@/services/api/team-member";
import { useTreasury } from "@/services/api/treasury";
import { useAuth } from "@/services/auth/context";
import { useModal } from "@/contexts/ModalManagerProvider";
import { formatAmount } from "@/services/arc/amount";

export default function TeamSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const company = useGetMyCompany({ enabled: isOpen });
  const team = useGetTeamStats(undefined, { enabled: isOpen });
  const treasury = useTreasury();
  const { user } = useAuth();
  const { openModal } = useModal();
  if (!isOpen) return null;
  return <><button aria-label="Close team panel" onClick={onClose} className="fixed inset-0 z-[55] bg-transparent" /><aside className="absolute top-0 z-[60] flex h-full w-[400px] max-w-[90vw] flex-col gap-5 overflow-y-auto rounded-r-lg bg-background p-5 text-text-primary">
    <header className="flex justify-between gap-3"><h2 className="text-xl font-semibold">{company.data?.companyName || "Company workspace"}</h2><button onClick={onClose} aria-label="Close">×</button></header>
    <p>{team.data?.total || 0} team members</p>
    {user?.role === "OWNER" && <button onClick={() => openModal("INVITE_TEAM_MEMBER")} className="rounded-lg bg-primary-blue px-4 py-3 text-white">Invite member</button>}
    {treasury.error ? <p role="alert">Treasury could not be loaded.</p> : treasury.data ? <article className="space-y-3 rounded-xl border border-primary-divider p-4"><h3 className="font-semibold">Company treasury</h3><p>{formatAmount(BigInt(treasury.data.balanceBaseUnits))} USDC</p><p className="break-all text-sm">{treasury.data.wallet.address}</p><p className="text-sm text-text-secondary">Arc Testnet · Circle wallet · {treasury.data.policy.requiredApprovals} required approvals above the configured threshold.</p><Link href="/testnet-treasury" onClick={onClose} className="block text-primary-blue">Review treasury and approvals</Link></article> : <p>Loading treasury…</p>}
    <Link href="/setting" onClick={onClose}>Workspace settings</Link>
  </aside></>;
}
