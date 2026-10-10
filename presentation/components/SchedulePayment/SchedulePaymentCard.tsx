"use client";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import { USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
import { identiconSeed } from "@/services/arc/identicon";
import { blo } from "blo";
import React from "react";
export type SchedulePaymentCardProps = {
    avatarUrl?: string;
    recipientName: string;
    amount: string;
    token: AssetWithMetadata;
    frequencyLabel: string;
    startDateLabel: string;
    timesLabel: string;
    onClick?: () => void;
    className?: string;
};
export const SchedulePaymentCard: React.FC<SchedulePaymentCardProps> = ({ recipientName, amount, token, frequencyLabel, startDateLabel, timesLabel, onClick, className = "", }) => {
    return (<button type="button" onClick={onClick} className={`w-full text-left bg-background border border-primary-divider rounded-lg p-2 flex items-center gap-3 cursor-pointer ${className}`}>
      <div className="shrink-0 w-16 h-16 rounded bg-center bg-no-repeat" style={{
            backgroundImage: `url(/modal/calendar.svg)`,
            backgroundSize: "75% 75%",
            backgroundPosition: "43% 55%",
        }} aria-hidden/>

      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-start gap-3 w-full">
          <div className="w-[206px] truncate">
            <span className="text-text-primary text-[16px] leading-[1.2] font-medium truncate">{recipientName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full">
          <div className="bg-app-background rounded-md px-2 py-1.5 flex items-center gap-2">
            <img src={token.faucetId === USDC_TOKEN_ADDRESS ? "/token/usdc.svg" : blo(identiconSeed(token.faucetId))} alt="token" className="w-3.5 h-3.5"/>
            <span className="text-text-primary text-[14px] leading-3 tracking-[0.07px] font-medium">{amount}</span>
          </div>

          <div className="bg-app-background rounded-md px-2 py-1.5 flex items-center">
            <span className="text-text-primary text-[14px] leading-3 tracking-[0.07px] font-medium">{frequencyLabel}</span>
          </div>

          <div className="bg-app-background rounded-md px-2 py-1.5 flex items-center">
            <span className="text-text-primary text-[14px] leading-3 tracking-[0.07px] font-medium">{startDateLabel}</span>
          </div>

          <div className="bg-app-background rounded-md px-2 py-1.5 flex items-center">
            <span className="text-text-primary text-[14px] leading-3 tracking-[0.07px] font-medium">{timesLabel}</span>
          </div>
        </div>
      </div>

      <img src="/arrow/chevron-right.svg" alt="open" className="w-5 h-5 shrink-0"/>
    </button>);
};
export default SchedulePaymentCard;
