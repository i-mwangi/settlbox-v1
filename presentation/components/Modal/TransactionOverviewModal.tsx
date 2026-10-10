"use client";
import React from "react";
import { TransactionOverviewModalProps } from "@/presentation/types/modal";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "./BaseModal";
import { ActionButton } from "@/presentation/components/Common/ActionButton";
import { formatAddress } from "@/presentation/services/utils/address";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import { ARC_EXPLORER_URL, USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
import { ScheduleTransactionDropdown } from "../SchedulePayment/ScheduleTransactionDropdown";
import { SecondaryButton } from "../Common/SecondaryButton";
import { ModalHeader } from "../Common/ModalHeader";
import { Badge, BadgeStatus } from "../Common/Badge";
import { toast } from "react-hot-toast";
const DetailRow = ({ label, value, className = "items-center", valueClassName = "", }: {
    label: string;
    value: React.ReactNode;
    className?: string;
    valueClassName?: string;
}) => (<div className={`flex ${className} justify-between w-full`}>
    <p className="text-text-secondary text-[14px]">{label}</p>
    <div className={valueClassName}>
      {typeof value === "string" ? <p className="text-text-primary text-[14px]">{value}</p> : value}
    </div>
  </div>);
const CopyIcon = ({ text = "" }: {
    text: string;
}) => (<img src="/misc/copy-icon.svg" alt="copy" className="w-4 h-4 cursor-pointer" onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    }}/>);
export function TransactionOverviewModal({ isOpen, onClose, ...props }: ModalProp<TransactionOverviewModalProps>) {
    const { amount, accountName, accountAddress, recipientName, recipientAddress, transactionType, cancellableTime, message, onConfirm, tokenAddress, tokenSymbol, schedulePayment, transactionHash, } = props;
    const isSchedulePayment = schedulePayment?.times !== undefined;
    return (<BaseModal isOpen={isOpen} onClose={() => {
            onClose();
            onConfirm?.();
        }}>
      <ModalHeader title="Transaction Details" onClose={onClose}/>
      <div className="flex flex-col gap-4 p-4 bg-background rounded-b-2xl w-[600px] border-2 border-primary-divider">
        <div className="flex flex-row gap-3 items-center">
          <img src="/modal/hexagon-success-icon.svg" alt="success" className="w-20 h-20"/>
          <div className="flex flex-col gap-1">
            <span className="text-text-secondary text-sm">Transfer Successful</span>
            <div className="flex flex-row gap-2 items-center">
              
              <span className="text-text-primary text-3xl">
                $ {amount} {tokenSymbol}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 w-full border border-primary-divider rounded-[20px] p-4">
          
          <DetailRow label="Status" value={<Badge text="Completed" status={BadgeStatus.SUCCESS}/>}/>

          
          <DetailRow label="Time" value={new Date().toLocaleString()}/>

          
          <DetailRow label="From" value={<div className="flex gap-2 items-center">
                <CopyIcon text={accountAddress || ""}/>
                <span className="text-text-primary text-[14px]">
                  {accountName && `(${accountName})`} {accountAddress && formatAddress(accountAddress)}
                </span>
              </div>}/>

          
          <DetailRow label="Recipent" value={<div className="flex gap-2 items-center">
                <CopyIcon text={recipientAddress || ""}/>
                <span className="text-text-primary text-[14px]">
                  {recipientName && `(${recipientName})`} {recipientAddress && formatAddress(recipientAddress)}
                </span>
              </div>}/>

          
          <DetailRow label="Transaction Hash" value={<div className="flex gap-2 items-center">
                <CopyIcon text={transactionHash || ""}/>
                <span className="text-text-primary text-[14px]">
                  {transactionHash ? `${transactionHash.slice(0, 6)}…${transactionHash.slice(-4)}` : "N/A"}
                </span>
              </div>}/>

          
          {isSchedulePayment && (<ScheduleTransactionDropdown schedulePayment={schedulePayment} amount={amount} tokenSymbol={tokenSymbol}/>)}

          
          <DetailRow label="Type" value={transactionType}/>

          
          

          
          
        </div>
        <div className="mt-3 flex gap-2 w-full">
          <SecondaryButton text="View on Explorer" variant="light" onClick={() => {
            window.open(`${ARC_EXPLORER_URL}/tx/${transactionHash}`, "_blank");
        }} buttonClassName="flex-1" icon="/misc/globe.svg" iconPosition="left"/>
          <SecondaryButton text="Done" onClick={() => {
            onClose();
            onConfirm?.();
        }} buttonClassName="flex-1"/>
        </div>
      </div>
    </BaseModal>);
}
export default TransactionOverviewModal;
