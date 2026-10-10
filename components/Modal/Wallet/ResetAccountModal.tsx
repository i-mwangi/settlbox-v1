"use client";

import React from "react";
import { ResetAccountModalProps } from "@/types/modal";
import { ModalProp } from "@/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { useWalletAuth } from "@/hooks/server/useWalletAuth";
import { toast } from "react-hot-toast";
import { TOUR_SKIPPED_KEY } from "@/services/utils/constant";
import { SecondaryButton } from "../../Common/SecondaryButton";

export function ResetAccountModal({ isOpen, onClose, zIndex }: ModalProp<ResetAccountModalProps>) {
  const { disconnectWallet } = useWalletAuth();

  const handleReset = async () => {
    await disconnectWallet();

    try {
      
      
      localStorage.setItem(TOUR_SKIPPED_KEY, "true");
      window.location.reload();
    } catch (error) {
      console.error("Failed to burn wallet:", error);
      toast.error("Failed please try again later");
    }
  };

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div className="flex flex-col items-start gap-10 p-3 bg-background rounded-2xl w-[500px]">
        <div className="flex flex-col items-center justify-center gap-2">
          <img alt="reset-warning" src="/red-warning.svg" className="w-20" />
          <div className="flex flex-col items-center justify-start not-italic px-10 w-full text-center">
            <span className="text-text-primary text-[24px] font-bold w-full">Sign out</span>
            <span className="text-text-secondary text-[14px] w-full">
              Signing out disconnects this workspace session. Your wallet and funds remain in your wallet application.
              
            </span>
          </div>
        </div>
        <div className="rounded-b-xl flex gap-2 w-full">
          <SecondaryButton text="Cancel" variant="light" onClick={onClose} buttonClassName="flex-1" />
          <SecondaryButton text="Sign out" variant="red" onClick={handleReset} buttonClassName="flex-1" />
        </div>
      </div>
    </BaseModal>
  );
}

export default ResetAccountModal;
