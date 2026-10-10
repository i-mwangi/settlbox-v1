"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { NavArrowDown } from "iconoir-react";
import { Bank } from "@/data/fiat-payout";

interface BankDropdownProps {
  banks: Bank[];
  selectedBank?: string;
  onBankSelect: (bankName: string) => void;
  disabled?: boolean;
  variant?: "outlined" | "filled";
  size?: "default" | "compact";
}

export const BankDropdown = ({
  banks,
  selectedBank,
  onBankSelect,
  disabled = false,
  variant = "filled",
  size = "default",
}: BankDropdownProps) => {
  const containerStyle = useMemo(() => {
    // Both variants now use the login-style bordered field.
    const heightStyle = size === "compact" ? "h-[52px]" : "h-[64px]";
    return `border border-primary-divider rounded-xl bg-background transition-colors hover:bg-app-background ${heightStyle}`;
  }, [size]);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBanks = useMemo(
    () => banks.filter(b => b.name.toLowerCase().includes(search.toLowerCase())),
    [banks, search],
  );

  const handleSelect = (bankName: string) => {
    onBankSelect(bankName);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 w-full text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed justify-between ${containerStyle}`}
        disabled={disabled}
      >
        <div className="flex min-w-0 flex-col justify-center">
          <span className={`text-text-secondary ${size === "compact" ? "text-[12px]" : "text-[13px]"}`}>
            Select bank
          </span>
          {selectedBank && (
            <p className={`truncate text-text-primary font-semibold ${size === "compact" ? "text-[14px]" : "text-[15px]"}`}>
              {selectedBank}
            </p>
          )}
        </div>
        <NavArrowDown
          width={18}
          height={18}
          strokeWidth={2}
          className={`flex-shrink-0 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[120] overflow-hidden rounded-2xl border border-white/10 bg-[#26262b]/90 p-1.5 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div className="px-1 py-1">
            <input
              type="text"
              placeholder="Search bank..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              autoFocus
            />
          </div>
          <div className="mt-1 flex max-h-[200px] flex-col gap-0.5 overflow-y-auto">
            {filteredBanks.length === 0 && (
              <p className="px-2 py-2 text-sm text-white/50">No banks found</p>
            )}
            {filteredBanks.map(bank => (
              <button
                key={bank.code}
                type="button"
                onClick={() => handleSelect(bank.name)}
                className={`flex w-full items-center gap-2 rounded-lg p-2 transition-colors cursor-pointer hover:bg-white/[0.08] ${
                  selectedBank === bank.name ? "bg-white/[0.10]" : ""
                }`}
              >
                <span className="text-[14px] font-medium text-white/90">{bank.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
