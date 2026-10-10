"use client";
import React from "react";
import { TransactionDetailModalProps } from "@/presentation/types/modal";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { ModalHeader } from "@/presentation/components/Common/ModalHeader";
import TransactionDetailContainer from "@/presentation/components/Transactions/TransactionDetailContainer";
export function TransactionDetailModal({ isOpen, onClose, zIndex, proposalId }: ModalProp<TransactionDetailModalProps>) {
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div className="flex max-h-[88vh] w-[1080px] max-w-[94vw] flex-col overflow-hidden rounded-2xl bg-background">
        <ModalHeader title="Transaction details" onClose={onClose} icon="/sidebar/transactions.svg"/>
        <div className="flex-1 overflow-y-auto">
          <TransactionDetailContainer proposalId={proposalId} inModal/>
        </div>
      </div>
    </BaseModal>);
}
export default TransactionDetailModal;
