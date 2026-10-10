"use client";
import React, { useState } from "react";
import { OnboardingModalProps, ChooseAccountModalProps } from "@/presentation/types/modal";
import { ModalProp, useModal } from "@/presentation/contexts/ModalManagerProvider";
import { ARC_EXPLORER_URL, USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
import { PrimaryButton } from "../Common/PrimaryButton";
import BaseModal from "./BaseModal";
import toast from "react-hot-toast";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
import { usePSMProvider } from "@/presentation/contexts/PSMProvider";
import { MultisigAccountResponseDto } from "@/presentation/types/dto/multisig";
import { useMintTokens } from "@/presentation/services/api/multisig";
export function OnboardingModal({ isOpen, onClose, zIndex }: ModalProp<OnboardingModalProps>) {
    const { fetchBalances } = useArcPayment();
    const { sync } = usePSMProvider();
    const { openModal } = useModal();
    const { mutate: mint, isPending } = useMintTokens();
    const [loading, setLoading] = useState(false);
    const handleMintToken = async (targetAddress?: string) => {
        const mintAddress = targetAddress;
        if (!mintAddress)
            return toast.error("Please connect your wallet to mint tokens");
        try {
            setLoading(true);
            toast.loading("Minting...");
            mint({
                accountId: mintAddress,
                data: {
                    faucetId: USDC_TOKEN_ADDRESS,
                    amount: 100 * 1e8,
                },
            }, {
                onSuccess: data => {
                    toast.dismiss();
                    toast.success(<div>
                Mint successfully, view transaction on{" "}
                <a href={`${ARC_EXPLORER_URL}/tx/${data.transactionId}`} target="_blank" rel="noopener noreferrer" className="underline">
                  Arc Explorer
                </a>
              </div>);
                    fetchBalances();
                    onClose();
                    setTimeout(() => sync(), 5000);
                },
                onError: error => {
                    toast.dismiss();
                    toast.error("Failed to mint tokens, it might because the faucet was drained!");
                    console.error(error);
                },
                onSettled: () => {
                    setLoading(false);
                },
            });
        }
        catch (error) {
            toast.dismiss();
            toast.error("Failed to mint tokens!");
            console.error(error);
            setLoading(false);
        }
    };
    const handleAccountSelected = (account: MultisigAccountResponseDto) => {
        handleMintToken(account.accountId);
    };
    const handleRequestTokens = () => {
        openModal<ChooseAccountModalProps>("CHOOSE_ACCOUNT", {
            onConfirm: handleAccountSelected,
        });
    };
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div className="flex flex-col items-center border-2 border-primary-divider bg-background w-[550px] rounded-2xl ">
        <main className="flex flex-col gap-6 items-center self-stretch p-3 pt-5 z-10 relative">
          
          <div className="w-[28px] h-[28px] bg-app-background rounded-lg flex justify-center items-center border-b-2 border-secondary-divider cursor-pointer absolute top-4 right-4" onClick={onClose}>
            <img src="/misc/close-icon.svg" alt="close icon"/>
          </div>
          
          <div className="flex flex-col gap-4 items-center">
            <img src="/token/usdc.svg" alt="USDC Token" className="w-16 h-16"/>
            <div className="flex flex-col gap-2 items-center">
              <span className="text-5xl font-bold text-text-primary">100</span>
              <span className="text-xl text-text-primary text-center">
                Grab your free tokens to start exploring Settlbox.
              </span>
              <p className="text-sm text-text-secondary">Click below to claim your free tokens</p>
            </div>
          </div>

          
          <PrimaryButton text="Request free tokens" onClick={handleRequestTokens} loading={loading || isPending} containerClassName="w-full"/>
        </main>
      </div>
    </BaseModal>);
}
export default OnboardingModal;
