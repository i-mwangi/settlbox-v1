"use client";
import React from "react";
import { DiscardChangesModalProps } from "@/types/modal";
import { ModalProp } from "@/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { SecondaryButton } from "@/components/Common/SecondaryButton";

export function DiscardChangesModal({
  isOpen,
  onClose,
  zIndex,
  onConfirm,
  title = "Leave without saving?",
  message = "If you leave now, the changes you have made will be discarded.",
  confirmText = "Leave",
}: ModalProp<DiscardChangesModalProps>) {
  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div className="bg-background rounded-2xl w-[400px] flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <span className="text-text-primary font-bold text-xl">{title}</span>
          <span className="text-text-secondary text-sm leading-relaxed">{message}</span>
        </div>
        <div className="flex gap-2 w-full">
          <SecondaryButton text="Keep editing" variant="light" onClick={onClose} />
          <SecondaryButton
            text={confirmText}
            variant="red"
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
          />
        </div>
      </div>
    </BaseModal>
  );
}

export default DiscardChangesModal;
