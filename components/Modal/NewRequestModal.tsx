"use client";

import Link from "next/link";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import type { NewRequestModalProps } from "@/types/modal";
import BaseModal from "./BaseModal";

export function NewRequestModal({ isOpen, onClose, zIndex }: ModalProp<NewRequestModalProps>) {
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex} title="Request USDC"><div className="max-w-lg space-y-4 p-6 text-text-primary"><p>Create an invoice to collect USDC into your company treasury on Arc Testnet. Share its payment link with your customer and track verified settlement.</p><Link href="/invoice/create" onClick={onClose} className="inline-block rounded-lg bg-primary-blue px-5 py-3 text-white">Create payment request</Link></div></BaseModal>;
}

export default NewRequestModal;
