"use client";

import { useState } from "react";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import type { ChooseAccountModalProps } from "@/types/modal";
import { useTreasury } from "@/services/api/treasury";
import BaseModal from "../BaseModal";

export function ChooseAccountModal({ isOpen, onClose, zIndex, onSelectAccount, onConfirm }: ModalProp<ChooseAccountModalProps>) {
  const query = useTreasury();
  const [selected, setSelected] = useState(false);
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex} title="Choose treasury wallet"><div className="max-w-lg space-y-4 p-6 text-text-primary">
    {query.isLoading && <p>Loading treasury wallet…</p>}
    {query.error && <p role="alert">Treasury could not be loaded. <button onClick={() => { void query.refetch(); }}>Retry</button></p>}
    {query.data && <><button aria-pressed={selected} onClick={() => { setSelected(true); onSelectAccount?.(query.data.wallet); }} className={`w-full space-y-2 rounded-xl border p-4 text-left ${selected ? "border-primary-blue" : "border-primary-divider"}`}><strong>Company treasury · Arc Testnet</strong><span className="block break-all text-sm">{query.data.wallet.address}</span><span className="block text-sm text-text-secondary">Circle wallet with configured treasury approvals and payment limits.</span></button><button disabled={!selected} onClick={() => { if (selected) { onConfirm?.(query.data.wallet); onClose(); } }} className="rounded-lg bg-primary-blue px-5 py-3 text-white disabled:opacity-50">Confirm wallet</button></>}
  </div></BaseModal>;
}

export default ChooseAccountModal;
