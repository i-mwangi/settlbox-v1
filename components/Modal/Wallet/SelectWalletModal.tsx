"use client";

import { useState } from "react";
import Link from "next/link";
import type { SelectWalletModalProps } from "@/types/modal";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { ModalHeader } from "@/components/Common/ModalHeader";
import BaseModal from "../BaseModal";

export function SelectWalletModal({ isOpen, onClose, zIndex }: ModalProp<SelectWalletModalProps>) {
  const { connect, isConnecting, chainName } = useArcWallet();
  const [error, setError] = useState<string | null>(null);

  async function connectWallet() {
    setError(null);
    try { await connect(); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Wallet connection failed"); }
  }

  if (!isOpen) return null;
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <ModalHeader title="Connect Arc wallet" onClose={onClose} />
      <div className="flex w-[450px] max-w-full flex-col gap-4 rounded-b-2xl bg-background p-5">
        <button type="button" disabled={isConnecting} onClick={connectWallet} className="flex items-center gap-3 rounded-xl border border-primary-divider p-4 text-text-primary disabled:opacity-50">
          <img src="/chain/arc-testnet.svg" alt="Arc" className="h-8 w-8" />
          <span>{isConnecting ? "Connecting…" : `Connect EVM wallet · ${chainName}`}</span>
        </button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Link href="/testnet-treasury" onClick={onClose} className="text-sm text-primary-blue">Open company treasury</Link>
      </div>
    </BaseModal>
  );
}

export default SelectWalletModal;
