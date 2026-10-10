"use client";
import React from "react";
import { ActionButton } from "../Common/ActionButton";
export type SchedulePaymentTooltipProps = {
    statusText?: string;
    sentText: string;
    dateTimeText: string;
    balanceText: string;
    remainingTimeText: string;
    onCancel?: () => void;
    disabledCancel?: boolean;
};
const SchedulePaymentTooltip: React.FC<SchedulePaymentTooltipProps> = ({ statusText = "Pending Send", sentText, dateTimeText, balanceText, remainingTimeText, disabledCancel, onCancel, }) => {
    return (<div className={`bg-background border border-primary-divider relative rounded-xl w-[390px]`}>
      <div className="flex flex-col gap-2.5 p-3">
        
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-row gap-2 items-center text-[14px] tracking-[0.07px]">
            <span className="text-text-secondary leading-5">Status:</span>
            <span className="text-[#ffb700] font-medium leading-none">{statusText}</span>
          </div>

          <ActionButton text="Cancel" type="accept" onClick={onCancel} className="bg-[#1E8FFF] hover:bg-[#1E8FFF]/80 rounded-full h-[25px]" disabled={disabledCancel}/>
        </div>

        
        {sentText && (<div className="flex flex-row gap-2 items-center">
            <span className="text-text-secondary text-[14px] tracking-[0.07px] leading-5">Sent:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-text-primary text-[14px] tracking-[0.07px] leading-5 font-medium">{sentText}</span>
            </div>
          </div>)}

        
        <div className="flex flex-row gap-2 items-center text-[14px] tracking-[0.07px]">
          <span className="text-text-secondary leading-5">Date/Time:</span>
          <span className="text-text-primary leading-5">{dateTimeText}</span>
        </div>

        
        <div className="flex flex-row gap-2 items-center text-[14px] tracking-[0.07px]">
          <span className="text-text-secondary leading-5">Balance:</span>
          <span className="text-text-primary font-medium leading-5">{balanceText}</span>
        </div>

        
        <div className="flex flex-row gap-2 items-center text-[14px] tracking-[0.07px]">
          <span className="text-text-secondary leading-5">Remaining time:</span>
          <span className="text-text-primary font-medium leading-5">{remainingTimeText}</span>
        </div>

        
        
      </div>

      
      <div className="absolute inset-0 pointer-events-none rounded-xl border-b-2 border-primary-divider" aria-hidden/>
    </div>);
};
export default SchedulePaymentTooltip;
