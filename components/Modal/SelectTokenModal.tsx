"use client";

import BaseModal from "./BaseModal";
import { ModalHeader } from "../Common/ModalHeader";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { formatAmount } from "@/services/arc/amount";
import { SETTLBOX_TOKEN_ADDRESS } from "@/services/utils/constant";
import type { SelectTokenModalProps } from "@/types/modal";
import type { ModalProp } from "@/contexts/ModalManagerProvider";

export function SelectTokenModal({ isOpen, onClose, onTokenSelect, zIndex }: ModalProp<SelectTokenModalProps>) {
  const wallet = useArcWallet();
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}><div className="w-[min(90vw,450px)] rounded-xl bg-background p-5 text-text-primary"><ModalHeader title="Select token" onClose={onClose} /><button className="flex w-full items-center gap-3 rounded-xl p-4 hover:bg-app-background" onClick={() => { onTokenSelect?.({ faucetId: SETTLBOX_TOKEN_ADDRESS, amount: (BigInt(wallet.balanceBaseUnits || "0") / 1000000000000n).toString(), metadata: { symbol: "USDC", decimals: 6, maxSupply: 0 } }); onClose(); }}><img src="/token/usdc.svg" alt="" className="h-8 w-8" /><span>USDC · Arc Testnet</span></button><p className="p-4 text-sm">{wallet.balanceBaseUnits === null ? "Connect a wallet to read its balance." : `Connected wallet: ${formatAmount(BigInt(wallet.balanceBaseUnits))} USDC`}</p></div></BaseModal>;
}

export default SelectTokenModal;
