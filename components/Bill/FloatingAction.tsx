"use client";
import React from "react";
import { CustomCheckbox } from "../Common/CustomCheckbox";

export const FloatingAction = ({
  selectedCount,
  actionButtons,
  onDeselectAll,
  allSelected = false,
  totalLabel,
}: {
  selectedCount: number;
  actionButtons: React.ReactNode;
  onDeselectAll?: () => void;
  allSelected?: boolean;
  /** Overrides the middle "Total (N transactions)" text. Defaults to transactions wording. */
  totalLabel?: React.ReactNode;
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="backdrop-blur-[15px] bg-[#1b1b1b] flex w-fit items-center gap-4 px-2 py-2 rounded-2xl">
        {/* Deselect all button */}
        <button
          onClick={onDeselectAll}
          className="bg-background rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer"
          style={{
            backgroundColor: "var(--bg-surface-white, #ffffff)",
            borderColor: "var(--stroke-sub-700, rgba(153,160,174,0.24))",
          }}
          aria-label="Deselect all"
        >
          <CustomCheckbox checked={allSelected} onChange={() => {}} />
          <span
            className="text-sm font-medium leading-5 tracking-[-0.56px] whitespace-nowrap"
            style={{
              color: "var(--text-strong-950, #1b1b1b)",
            }}
          >
            Deselect all ({selectedCount})
          </span>
        </button>

        {/* Total count */}
        <div className="text-sm font-medium text-white">{totalLabel ?? `Total (${selectedCount} transactions)`}</div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center">{actionButtons}</div>
      </div>
    </div>
  );
};
