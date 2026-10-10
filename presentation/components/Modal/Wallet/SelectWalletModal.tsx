"use client";
import React from "react";
import { SelectWalletModalProps } from "@/presentation/types/modal";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
import toast from "react-hot-toast";
const WalletItem = ({ label, icon, onClick, iconClassName, }: {
    label: string;
    icon: string;
    onClick?: () => void;
    iconClassName?: string;
}) => {
    return (<div className="flex justify-between items-center bg-app-background border-t-2 border-primary-divider w-full rounded-2xl p-3 cursor-pointer hover:bg-app-background/80 transition-colors" onClick={onClick}>
      <div className="flex flex-row gap-2 items-center">
        <img src={icon} alt="Wallet icon" className={iconClassName || "w-8 h-8"}/>
        <span className="font-bold text-xl">{label}</span>
      </div>
      <div className="flex justify-center items-center gap-2">
        <img src="/arrow/chevron-right.svg" alt="link icon"/>
      </div>
    </div>);
};
export function SelectWalletModal({ isOpen, onClose, zIndex }: ModalProp<SelectWalletModalProps>) {
    const { openModal: openParaModal } = useArcPayment();
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={true} onClose={onClose} zIndex={zIndex}>
      <div className="bg-background rounded-t-2xl flex justify-center items-center w-[450px] border-b-1 border-primary-divider">
        <div className="relative flex justify-center items-center w-full text-center py-6">
          <span className="text-text-primary font-bold text-center">Connect Wallet</span>
          <div className="absolute top-1/2 transform -translate-y-1/2 right-6 w-[28px] h-[28px] bg-app-background rounded-lg flex justify-center items-center border-b-2 border-secondary-divider cursor-pointer" onClick={onClose}>
            <img src="/misc/close-icon.svg" alt="close icon"/>
          </div>
        </div>
      </div>
      <div className="bg-background flex flex-col rounded-b-2xl justify-center items-center py-5 px-3 gap-5">
        <div className="flex flex-row justify-center items-center gap-3">
          <div className="flex justify-center items-center w-[48px] h-[48px] bg-app-background rounded-xl border-1 border-primary-divider">
            <img src="/modal/choose-wallet.svg" alt="Wallet icon"/>
          </div>
          <img src="/misc/link-icon.svg" alt="link icon"/>
          <div className="flex justify-center items-center w-[48px] h-[48px] bg-[#000000] rounded-xl border-1 border-primary-divider">
            <img src="/logo/3d-settlbox-icon.svg" alt="Wallet icon"/>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <WalletItem label="Arc Wallet" icon="/chain/arc.svg" iconClassName="w-10" onClick={() => {
            onClose();
            void openParaModal().catch(error => toast.error(error instanceof Error ? error.message : "Wallet connection failed"));
        }}/>
          <WalletItem label="Social Account" icon="/login/mail-icon.svg" onClick={() => {
            onClose();
            toast.error("Social wallet connection is not configured");
        }}/>
        </div>
      </div>
    </BaseModal>);
}
export default SelectWalletModal;
