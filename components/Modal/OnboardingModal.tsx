"use client";

import Link from "next/link";
import BaseModal from "./BaseModal";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import type { OnboardingModalProps } from "@/types/modal";
export function OnboardingModal({ isOpen, onClose, zIndex }: ModalProp<OnboardingModalProps>) { return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}><section className="space-y-4 rounded-xl bg-background p-6 text-text-primary"><h2 className="text-xl">Set up your workspace</h2><Link href="/setting" onClick={onClose} className="block">Save your company profile</Link><Link href="/testnet-treasury" onClick={onClose} className="block">Review your Arc Testnet treasury</Link><Link href="/contact-book" onClick={onClose} className="block">Add employee and client contacts</Link></section></BaseModal>; }
export default OnboardingModal;
