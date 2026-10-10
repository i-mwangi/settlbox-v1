"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

const COMPANY_TYPE = [
  "SaaS",
  "Venture Capital",
  "Blockchain",
  "Technology",
  "E-commerce",
  "Fintech",
  "DeFi",
  "Infrastructure",
  "Gaming",
  "Media",
  "Consulting",
  "Other",
];

interface CompanyTypeDropdownProps {
  selectedCompanyType?: string;
  onCompanyTypeSelect: (companyType: string) => void;
  disabled?: boolean;
  variant?: "outlined" | "filled";
  size?: "default" | "compact";
  label?: string;
}

export const CompanyTypeDropdown = ({
  selectedCompanyType,
  onCompanyTypeSelect,
  disabled = false,
  variant = "outlined",
  size = "default",
  label,
}: CompanyTypeDropdownProps) => {
  const containerStyle = useMemo(() => {
    const baseStyle =
      variant === "outlined" || label
        ? "border border-primary-divider rounded-xl bg-transparent"
        : "bg-app-background border-b-2 border-primary-divider rounded-xl";
    const heightStyle = size === "compact" ? "h-[46px]" : "h-[64px]";
    return `${baseStyle} ${heightStyle}`;
  }, [variant, size, label]);

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 8, left: r.left, width: r.width });
    }
    setIsOpen(o => !o);
  };

  const handleCompanyTypeClick = (companyType: string) => {
    onCompanyTypeSelect(companyType);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={toggleOpen}
        className={`flex items-center gap-2 px-4 py-2 w-full text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed justify-between ${containerStyle}`}
        disabled={disabled}
      >
        <div className="flex min-w-0 flex-col">
          {label && <span className="text-[14px] text-text-secondary">{label}</span>}
          <span
            className={`truncate ${label ? "text-[16px]" : "text-[14px]"} ${
              selectedCompanyType ? "text-text-primary" : "text-[#C1C1C1]"
            }`}
          >
            {selectedCompanyType || "Select client type"}
          </span>
        </div>
        <img
          src="/arrow/chevron-down.svg"
          alt="dropdown"
          className={`w-5 h-5 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, scaleY: 0.55, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scaleY: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scaleY: 0.7, scale: 0.97, y: -4 }}
                transition={{ type: "spring", stiffness: 460, damping: 24, mass: 0.7 }}
                style={{
                  position: "fixed",
                  top: coords.top,
                  left: coords.left,
                  width: coords.width,
                  transformOrigin: "top center",
                }}
                className="z-[1100] overflow-hidden rounded-2xl border border-white/10 bg-[#26262b]/85 p-1.5 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
              >
                <div className="px-2 py-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">Select client type</p>
                </div>
                <div className="flex max-h-[220px] flex-col gap-0.5 overflow-y-auto">
                  {COMPANY_TYPE.map(companyType => (
                    <button
                      key={companyType}
                      type="button"
                      onClick={() => handleCompanyTypeClick(companyType)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.08] ${
                        selectedCompanyType === companyType ? "bg-white/[0.10]" : ""
                      }`}
                    >
                      <span className="text-[14px] font-medium text-white/90">{companyType}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};
