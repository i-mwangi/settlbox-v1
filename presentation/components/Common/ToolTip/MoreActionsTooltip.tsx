"use client";
import React from "react";
interface MoreActionsTooltipProps {
    onPay?: () => void;
    onEdit?: () => void;
    onExport?: () => void;
    onRemove?: () => void;
    onToggleActive?: () => void;
    isActive?: boolean;
}
const TooltipItem = ({ children, onClick, className = "", isFirst = false, isLast = false, isActive = false, }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    isFirst?: boolean;
    isLast?: boolean;
    isActive?: boolean;
}) => (<div className={`
      flex items-center gap-2 px-3 py-3 w-full cursor-pointer 
      transition-colors duration-200
      ${isFirst ? "rounded-t-2xl" : ""}
      ${isLast ? "rounded-b-2xl" : ""}
      ${isActive ? "bg-gray-100" : "hover:bg-gray-50"}
      ${className}
    `} onClick={onClick}>
    {children}
  </div>);
export const MoreActionsTooltip = ({ onPay, onEdit, onExport, onRemove, onToggleActive, isActive }: MoreActionsTooltipProps) => {
    return (<div className="bg-white border border-primary-divider rounded-2xl shadow-lg w-[185px]">
      
      <TooltipItem onClick={onEdit} isFirst>
        <img src="/misc/edit-icon.svg" alt="edit" className="w-5 h-5"/>
        <span className="text-sm text-text-primary">Edit contact</span>
      </TooltipItem>

      
      {onToggleActive && (<TooltipItem onClick={onToggleActive}>
          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${isActive ? "bg-[#E93544]/10 text-[#E93544]" : "bg-[#1DAF61]/10 text-[#1DAF61]"}`}>
            {isActive ? "\u2715" : "\u2713"}
          </span>
          <span className="text-sm text-text-primary">{isActive ? "Disable" : "Enable"}</span>
        </TooltipItem>)}

      
      <div className="border-t w-full border-primary-divider">
        <TooltipItem onClick={onRemove} isLast>
          <img src="/misc/trashcan-icon.svg" alt="trash" className="w-5 h-5"/>
          <span className="text-sm text-[#E93544]">Remove</span>
        </TooltipItem>
      </div>
    </div>);
};
