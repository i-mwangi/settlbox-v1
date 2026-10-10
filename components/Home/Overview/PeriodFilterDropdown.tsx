"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { NavArrowDown as CaretDown, Check, Calendar as CalendarBlank } from "iconoir-react";

const PERIOD_OPTIONS = [
  { id: "year", label: "Year" },
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
] as const;
type PeriodId = (typeof PERIOD_OPTIONS)[number]["id"];

interface PeriodFilterDropdownProps {
  period: PeriodId;
  onChange: (p: PeriodId) => void;
  label?: string;
}

const PANEL_WIDTH = 160;

/** Single-select period filter (Year / Month / Week / Day) using the onboarding
 * dropdown design: dark frosted-glass panel via portal, notch-style spring open. */
export const PeriodFilterDropdown = ({ period, onChange, label }: PeriodFilterDropdownProps) => {
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
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 8, left: r.left, width: Math.max(PANEL_WIDTH, r.width) });
    }
    setIsOpen(o => !o);
  };

  const current = label ?? PERIOD_OPTIONS.find(p => p.id === period)?.label ?? "Year";

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={toggleOpen}
        className="inline-flex items-center gap-2 rounded-lg border border-primary-divider bg-background px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-app-background"
      >
        <CalendarBlank width={15} height={15} strokeWidth={2} className="text-text-secondary" />
        <span className="text-text-primary">{current}</span>
        <CaretDown width={14} height={14} strokeWidth={2} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
                className="z-[100] overflow-hidden rounded-2xl border border-white/10 bg-[#26262b]/85 p-1.5 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
              >
                <div className="flex flex-col gap-0.5">
                  {PERIOD_OPTIONS.map(opt => {
                    const active = opt.id === period;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onChange(opt.id);
                          setIsOpen(false);
                        }}
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.08] ${
                          active ? "bg-white/[0.10]" : ""
                        }`}
                      >
                        <span className="text-[14px] font-medium text-white/90">{opt.label}</span>
                        {active && <Check width={13} height={13} strokeWidth={2} className="ml-auto text-white/80" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};
