"use client";

import Link from "next/link";
import BaseModal from "../BaseModal";
import { ModalHeader } from "@/components/Common/ModalHeader";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import type { CreateAccountModalProps } from "@/types/modal";

export function CreateAccountModal({ isOpen, onClose, zIndex }: ModalProp<CreateAccountModalProps>) {
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}><div className="max-w-lg space-y-4 rounded-xl bg-background p-6 text-text-primary"><ModalHeader title="Treasury account" onClose={onClose} /><p>This workspace uses its configured Circle treasury wallet. Additional company wallets are not provisioned from this screen.</p><Link href="/setting?team-account=treasury" onClick={onClose}>Review the company account</Link></div></BaseModal>;
}

export default CreateAccountModal;
