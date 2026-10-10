"use client";
import React, { useEffect, useState, useRef } from "react";
import { InteractAccountTransactionModalProps } from "@/presentation/types/modal";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "./BaseModal";
import { formatAddress } from "@/presentation/services/utils/address";
import { USDC_TOKEN_DECIMALS, USDC_TOKEN_ADDRESS, NODE_ENDPOINT } from "@/presentation/services/utils/constant";
import { useAccount } from "@/presentation/hooks/web3/useAccount";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import toast from "react-hot-toast";
import { useArcNetworkStore } from "@/presentation/contexts/ArcNetworkProvider";
import { useTransactionStore } from "@/presentation/contexts/TransactionProvider";
export function InteractAccountTransactionModal({ isOpen, onClose, zIndex, address, }: ModalProp<InteractAccountTransactionModalProps>) {
    const clientRef = useRef<any | null>(null);
    const [clientInitialized, setClientInitialized] = useState(false);
    const [localTransactions, setLocalTransactions] = useState<any[]>([]);
    const [localLoading, setLocalLoading] = useState(false);
    const getTypeColor = (type: string) => {
        return "text-[#48b3ff]";
    };
    const renderSender = (sender: string) => {
        if (sender === USDC_TOKEN_ADDRESS) {
            return "USDC Faucet";
        }
        else {
            return `${formatAddress(sender)}`;
        }
    };
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose} title={`Transactions from ${formatAddress(address)} (0 transactions)`} icon="/wallet-analytics/tx-history-icon.gif" zIndex={zIndex}>
      <div className="bg-[#1e1e1e] flex flex-col gap-1 flex-1 items-start min-h-px min-w-px overflow-hidden rounded-b-lg w-[900px]">
        
        <div className="flex flex-col gap-2.5 items-start p-2 w-full">
          <div className="bg-[#0c0c0c] grid grid-cols-12 gap-2.5 h-11 items-center rounded-lg w-full">
            <div className="col-span-2 flex h-full items-center justify-center">
              <span className="font-medium text-white text-sm">Transaction Hash</span>
            </div>
            <div className="col-span-1 flex h-full items-center justify-center">
              <span className="font-medium text-white text-sm">Type</span>
            </div>
            <div className="col-span-2 flex h-full items-center justify-center">
              <span className="font-medium text-white text-sm">Block</span>
            </div>
            <div className="col-span-3 flex h-full items-center justify-center">
              <span className="font-medium text-white text-sm">From</span>
            </div>
            <div className="col-span-3 flex h-full items-center justify-center">
              <span className="font-medium text-white text-sm">To</span>
            </div>
            <div className="col-span-1 flex h-full items-center justify-center">
              <span className="font-medium text-white text-sm">Value</span>
            </div>
          </div>
        </div>

        <div className="px-2 w-full overflow-y-auto max-h-96">
          {localLoading ? (<div className="flex items-center justify-center py-8">
              <span className="text-white">Loading transactions...</span>
            </div>) : [].length === 0 ? (<div className="flex items-center justify-center py-8">
              <span className="text-white">No incoming transactions found for this address</span>
            </div>) : ([].map((transaction: any, index: number) => (<div key={index} className="grid grid-cols-12 gap-2.5 items-center px-2 py-0 rounded-lg w-full h-15 hover:bg-[#292929]">
                
                <div className="col-span-2 flex items-center justify-center h-full gap-2">
                  <span className="font-medium text-white text-sm">{formatAddress(transaction.id)}</span>
                  <img src="/copy-icon.svg" alt="copy" className="w-4 h-4 cursor-pointer" style={{ filter: "invert(1) brightness(50%)" }} onClick={() => {
                navigator.clipboard.writeText(transaction.id);
                toast.success("Copied to clipboard");
            }}/>
                </div>

                
                <div className="col-span-1 flex items-center justify-center h-full">
                  <span className={`font-medium text-sm tracking-[-0.084px] ${getTypeColor(transaction.type)}`}>
                    {transaction.type}
                  </span>
                </div>

                
                <div className="col-span-2 flex items-center justify-center h-full">
                  <span className="font-medium text-white text-sm">{transaction.blockNumber}</span>
                </div>

                
                <div className="col-span-3 flex items-center justify-center h-full gap-2">
                  <div className="flex h-[24.085px] items-center w-[24.085px]">
                    {transaction.sender === USDC_TOKEN_ADDRESS ? (<img src="/token/usdc.svg" alt="avatar" className="w-6 h-6 rounded-full"/>) : (<img src={blo(identiconSeed(transaction.sender))} alt="avatar" className="w-6 h-6 rounded-full"/>)}
                  </div>
                  <span className="font-medium text-white text-sm">{renderSender(transaction.sender)}</span>
                  
                </div>

                
                <div className="col-span-3 flex items-center justify-center h-full gap-2">
                  <div className="flex h-[24.085px] items-center w-[24.085px]">
                    <img src={blo(identiconSeed(transaction.recipient))} alt="avatar" className="w-6 h-6 rounded-full"/>
                  </div>
                  <span className="font-medium text-white text-sm">You</span>
                  
                </div>

                
                <div className="col-span-1 flex items-center justify-center h-full gap-2">
                  <img src="/token/usdc.svg" alt="settlbox" className="w-5 h-5"/>
                  <span className="font-medium text-white text-sm">
                    {transaction.assets && transaction.assets.length > 0
                ? Number(transaction.assets[0].amount) / 10 ** USDC_TOKEN_DECIMALS
                : "0"}
                  </span>
                </div>
              </div>)))}
        </div>
      </div>
    </BaseModal>);
}
export default InteractAccountTransactionModal;
