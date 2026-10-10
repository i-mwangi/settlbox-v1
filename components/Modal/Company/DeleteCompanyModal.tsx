"use client";
import React, { useState } from "react";
import { DeleteCompanyModalProps } from "@/types/modal";
import { ModalProp } from "@/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { SecondaryButton } from "@/components/Common/SecondaryButton";
import { ModalHeader } from "@/components/Common/ModalHeader";
import FieldInput from "@/components/Common/Input/FieldInput";

export function DeleteCompanyModal({
  isOpen,
  onClose,
  zIndex,
  onDelete,
  companyName = "",
}: ModalProp<DeleteCompanyModalProps>) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const trimmedName = companyName.trim();
  const canDelete = trimmedName.length > 0 && confirmText.trim() === trimmedName && !deleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div className="bg-background flex w-[450px] flex-col rounded-2xl">
        <ModalHeader title="Delete company" onClose={onClose} />
        <div className="flex flex-col gap-5 rounded-b-2xl border-2 border-t border-primary-divider px-5 py-5">
          <div className="flex flex-col gap-3">
            <span className="text-center text-lg font-bold text-text-primary">
              Are you sure you want to delete your company?
            </span>
            <p className="text-center text-sm text-text-secondary">
              You are about to permanently delete{" "}
              <span className="font-semibold text-text-primary">{companyName || "this company"}</span>. All team members
              will be removed and lose access to every multisig account associated with this company.
            </p>
          </div>

          <FieldInput
            label={`Type the company name to confirm`}
            placeholder={companyName || "Company name"}
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            autoFocus
            autoComplete="off"
          />

          <div className="flex w-full flex-row gap-3">
            <SecondaryButton onClick={onClose} buttonClassName="flex-1" variant="light" text="Cancel" />
            <SecondaryButton
              onClick={handleDelete}
              buttonClassName={`flex-1 ${!canDelete ? "opacity-50 cursor-not-allowed" : ""}`}
              variant="red"
              text={deleting ? "Deleting..." : "Delete"}
              disabled={!canDelete}
            />
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

export default DeleteCompanyModal;
