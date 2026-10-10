"use client";
import React from "react";
export interface BatchActionTooltipProps {
    onEdit?: () => void;
    onDuplicate?: () => void;
    onRemove?: () => void;
    showDelete?: boolean;
}
const itemStyles = "flex items-center gap-2 px-3 py-3 w-full cursor-pointer hover:bg-app-background transition-colors";
const BillDetailActionTooltip: React.FC<BatchActionTooltipProps> = ({ onEdit, onDuplicate, onRemove, showDelete = true, }) => {
    return (<div className="bg-background relative rounded-2xl w-50 shadow-sm border border-primary-divider flex flex-col">
      
      

      
      

      
      {showDelete && (<button className={`${itemStyles} rounded-b-2xl`} onClick={onRemove}>
          <img src="/misc/trashcan-icon.svg" alt="remove" className="w-5 h-5"/>
          <span className="font-medium text-sm text-red-500 whitespace-nowrap">Delete invoice</span>
        </button>)}
    </div>);
};
export default BillDetailActionTooltip;
