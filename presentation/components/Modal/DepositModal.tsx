"use client";
import React, { useState } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import toast from "react-hot-toast";
import { ValidatingModalProps } from "@/presentation/types/modal";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "./BaseModal";
import { PrimaryButton } from "../Common/PrimaryButton";
export function DepositModal({ isOpen, onClose, zIndex }: ModalProp<ValidatingModalProps>) {
    const { data } = useDemo();
    const account = data?.accounts[0];
    const balance = account ? (data?.balances[account.accountId] || []).filter(token => token.symbol === "USDC").reduce((sum, token) => sum + token.amount, 0) : 0;
    const [amount, setAmount] = useState("");
    const [selectedToken, setSelectedToken] = useState("USDC");
    const availableBalance = balance.toLocaleString();
    const handlePercentageClick = (percentage: number) => {
        const balanceNum = balance;
        const calculatedAmount = Math.floor((balanceNum * percentage) / 100);
        setAmount(calculatedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    };
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div className="bg-app-background rounded-2xl border border-primary-divider w-[480px] ">
        
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex gap-3 items-center">
            <img src="/invoice/download-invoice-icon.svg" alt="deposit" className="w-6 h-6"/>
            <h1 className="text-base">Deposit</h1>
          </div>

          <div className="flex gap-4 items-center">
            
            <div className="bg-background border-t border-primary-divider rounded-lg flex gap-2 items-center px-4 py-1.5">
              <img src="/chain/arc.svg" alt="token" className="w-6 h-6 rounded-full bg-[#FFEDE4] p-0.5"/>
              <span className=" text-sm">{account?.accountId || "No treasury connected"}</span>
            </div>

            
            <div className=" w-[28px] h-[28px] bg-background rounded-lg flex justify-center items-center border-b-2 border-secondary-divider cursor-pointer" onClick={onClose}>
              <img src="/misc/close-icon.svg" alt="close icon"/>
            </div>
          </div>
        </div>

        
        <div className="space-y-3 px-4 pb-4">
          
          <div className="bg-background border-b border-primary-divider rounded-2xl p-5 space-y-2">
            
            <div className="flex items-center justify-between">
              <label className="  text-text-secondary text-sm">Amount</label>
              <button className="p-1 hover:bg-[#2a2a2a] rounded-lg transition-colors">
                <img src="/modal/reset-icon.svg" alt="refresh" className="w-4 h-4"/>
              </button>
            </div>

            
            <div className="flex items-center justify-between">
              <input type="text" value={amount} onChange={e => setAmount(e.target.value)} className="    text-2xl bg-transparent border-none outline-none"/>

              
              <button className="bg-app-background rounded-full flex gap-2 items-center px-4 py-1.5">
                <img src={`/token/${selectedToken.toLowerCase()}.svg`} className="w-6 h-6"/>
                <span className="text-base">{selectedToken}</span>
                <img src="/arrow/chevron-down.svg" alt="dropdown" className="w-4 h-4"/>
              </button>
            </div>

            
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2 items-center flex-1">
                <img src="/modal/blue-wallet-icon.gif" alt="wallet" className="w-4 h-4"/>
                <span className="  text-text-secondary text-xs">Available:</span>
                <span className="   text-text-primary text-xs">{availableBalance} USDC</span>
              </div>

              
              <div className="flex gap-2">
                <button onClick={() => handlePercentageClick(25)} className="border border-primary-divider rounded-full px-3 py-1.5 text-xs">
                  25%
                </button>
                <button onClick={() => handlePercentageClick(50)} className="border border-primary-divider rounded-full px-3 py-1.5 text-xs">
                  50%
                </button>
                <button onClick={() => handlePercentageClick(100)} className="border border-primary-divider rounded-full px-3 py-1.5 text-xs">
                  MAX
                </button>
              </div>
            </div>
          </div>

          
          <PrimaryButton text="Deposit" onClick={() => toast.error("Select a configured deposit provider before continuing")} containerClassName="w-full "/>
        </div>
      </div>
    </BaseModal>);
}
export default DepositModal;
