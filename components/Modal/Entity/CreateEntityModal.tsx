"use client";

import Link from "next/link";
import BaseModal from "../BaseModal";
import { ModalHeader } from "@/components/Common/ModalHeader";
import type { BaseModalProps } from "@/types/modal";
import type { ModalProp } from "@/contexts/ModalManagerProvider";

export interface CreateEntityModalProps extends BaseModalProps {}

export function CreateEntityModal({ isOpen, onClose, zIndex }: ModalProp<CreateEntityModalProps>) {
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}><div className="max-w-lg space-y-4 rounded-xl bg-background p-6 text-text-primary"><ModalHeader title="Company workspace" onClose={onClose} /><p>This workspace is linked to its configured company treasury. Manage its company profile in Settings.</p><Link href="/setting?tab=company" onClick={onClose}>Open company settings</Link></div></BaseModal>;
}

export default CreateEntityModal;
