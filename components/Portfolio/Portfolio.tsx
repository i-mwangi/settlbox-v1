"use client";

import Link from "next/link";
import BaseModal from "@/components/Modal/BaseModal";
import { ModalHeader } from "@/components/Common/ModalHeader";
import { useTreasury } from "@/services/api/treasury";
import { formatAmount } from "@/services/arc/amount";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import type { PortfolioModalProps } from "@/types/modal";

export default function Portfolio({ isOpen, onClose, zIndex }: ModalProp<PortfolioModalProps>) {
  const query = useTreasury();
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}><div className="w-[min(90vw,470px)] rounded-xl bg-background p-5 text-text-primary"><ModalHeader title="Company portfolio" onClose={onClose} /><div className="space-y-4 p-4">{query.isLoading && <p>Loading balance…</p>}{query.error && <p role="alert">{query.error.message} <button onClick={() => { void query.refetch(); }}>Retry</button></p>}{query.data && <><p className="text-3xl font-semibold">{formatAmount(BigInt(query.data.balanceBaseUnits))} USDC</p><p className="break-all text-sm">Arc Testnet · {query.data.wallet.address}</p><p>This balance belongs to the Circle company treasury. Your connected wallet has a separate balance.</p><div className="flex gap-4"><Link onClick={onClose} href="/treasury">Open treasury</Link><Link onClick={onClose} href="/bill/create">Prepare payment</Link></div></>}</div></div></BaseModal>;
}
