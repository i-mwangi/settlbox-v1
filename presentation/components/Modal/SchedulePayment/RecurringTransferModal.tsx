"use client";
import React from "react";
import { ModalProp, useModal } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import SchedulePaymentCard from "@/presentation/components/SchedulePayment/SchedulePaymentCard";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import { USDC_TOKEN_ADDRESS, USDC_TOKEN_DECIMALS, USDC_TOKEN_MAX_SUPPLY, USDC_TOKEN_SYMBOL, } from "@/presentation/services/utils/constant";
import { MODAL_IDS, RecurringTransferItem, RecurringTransferModalProps, RecurringTransferTransaction, } from "@/presentation/types/modal";
import { useRouter } from "next/navigation";
import { useGetSchedulePayments } from "@/presentation/services/api/schedule-payment";
import { useAccountContext } from "@/presentation/contexts/AccountProvider";
import { SchedulePaymentStatus } from "@/presentation/types/schedule-payment";
import { formatAddress } from "@/presentation/services/utils/address";
import { useGetAddressBooks } from "@/presentation/services/api/address-book";
const usdcToken: AssetWithMetadata = {
    amount: "0",
    faucetId: USDC_TOKEN_ADDRESS,
    metadata: { symbol: USDC_TOKEN_SYMBOL, decimals: USDC_TOKEN_DECIMALS, maxSupply: USDC_TOKEN_MAX_SUPPLY },
};
const EmptySchedulePayments = () => {
    return (<div className="flex flex-col gap-2 items-center justify-center h-[270px]">
      <img src="/modal/finder-question-mark.svg" alt="no schedule payments" className="w-12 h-12"/>
      <span className="text-[#989898] text-[16px] tracking-[-0.32px]">Recurring transfer list is empty</span>
    </div>);
};
export function RecurringTransferModal({ isOpen, onClose, zIndex }: ModalProp<RecurringTransferModalProps>) {
}
export default RecurringTransferModal;
