"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

const COUNTRY = [
  // Europe
  { value: "DE", label: "Germany", icon: "/flag/de.svg" },
  { value: "UA", label: "Ukraine", icon: "/flag/ua.svg" },
  { value: "PL", label: "Poland", icon: "/flag/pl.svg" },
  { value: "SI", label: "Slovenia", icon: "/flag/si.svg" },
  { value: "UK", label: "United Kingdom", icon: "/flag/uk.svg" },

  // North America
  { value: "US", label: "United States", icon: "/flag/us.svg" },

  // Southeast Asia (SEA)
  { value: "VN", label: "Vietnam", icon: "/flag/vn.svg" },
  { value: "SG", label: "Singapore", icon: "/flag/sg.svg" },
  { value: "MY", label: "Malaysia", icon: "/flag/my.svg" },
  { value: "ID", label: "Indonesia", icon: "/flag/id.svg" },
  { value: "PH", label: "Philippines", icon: "/flag/ph.svg" },
  { value: "TH", label: "Thailand", icon: "/flag/th.svg" },
  { value: "CN", label: "China", icon: "/flag/cn.svg" },

  // Latin America (LATAM)
  { value: "MX", label: "Mexico", icon: "/flag/mx.svg" },
  { value: "BR", label: "Brazil", icon: "/flag/br.svg" },
  { value: "AR", label: "Argentina", icon: "/flag/ar.svg" },
  { value: "CO", label: "Colombia", icon: "/flag/co.svg" },
  { value: "CL", label: "Chile", icon: "/flag/cl.svg" },

  // Africa
  { value: "ZA", label: "South Africa", icon: "/flag/za.svg" },
  { value: "NG", label: "Nigeria", icon: "/flag/ng.svg" },
  { value: "KE", label: "Kenya", icon: "/flag/ke.svg" },
  { value: "GH", label: "Ghana", icon: "/flag/gh.svg" },
  { value: "EG", label: "Egypt", icon: "/flag/eg.svg" },
];

interface CountryDropdownProps {
  selectedCountry?: string;
  onCountrySelect: (country: string) => void;
  disabled?: boolean;
  variant?: "outlined" | "filled";
  size?: "default" | "compact";
  label?: string;
}

export const CountryDropdown = ({
  selectedCountry,
  onCountrySelect,
  disabled = false,
  variant = "outlined",
  size = "default",
  label,
}: CountryDropdownProps) => {
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

  const handleCountryClick = (country: string) => {
    onCountrySelect(country);
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
          <div className="flex flex-row items-center gap-2 min-w-0">
            {selectedCountry && (
              <img
                src={COUNTRY.find(c => c.label === selectedCountry)?.icon || ""}
                alt={selectedCountry}
                className="w-5 h-5 flex-shrink-0"
              />
            )}
            <span
              className={`truncate ${label ? "text-[16px]" : "text-[14px]"} ${
                selectedCountry ? "text-text-primary" : "text-[#C1C1C1]"
              }`}
            >
              {selectedCountry || "Select country"}
            </span>
          </div>
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
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">Select country</p>
                </div>
                <div className="flex max-h-[220px] flex-col gap-0.5 overflow-y-auto">
                  {COUNTRY.map(country => (
                    <button
                      key={country.value}
                      type="button"
                      onClick={() => handleCountryClick(country.label)}
                      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.08] ${
                        selectedCountry === country.label ? "bg-white/[0.10]" : ""
                      }`}
                    >
                      <img src={country.icon} alt={country.label} className="h-5 w-5 shrink-0" />
                      <span className="text-[14px] font-medium text-white/90">{country.label}</span>
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
