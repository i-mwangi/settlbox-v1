"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { NavArrowDown as CaretDown, Check } from "iconoir-react";
interface TokenFilterDropdownProps {
    tokens: string[];
    selected: string[];
    onToggle: (token: string) => void;
    colors?: Record<string, string>;
    label?: string;
}
const PANEL_WIDTH = 208;
export const TokenFilterDropdown = ({ tokens, selected, onToggle, colors = {}, label }: TokenFilterDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => setMounted(true), []);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target) || panelRef.current?.contains(target))
                return;
            setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const toggleOpen = () => {
        if (!isOpen && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            setCoords({ top: r.bottom + 8, left: r.right - PANEL_WIDTH, width: PANEL_WIDTH });
        }
        setIsOpen(o => !o);
    };
    const displayLabel = useMemo(() => {
        if (label)
            return label;
        if (selected.length === 0)
            return "No tokens";
        if (selected.length === tokens.length)
            return "All tokens";
        return selected.join(", ");
    }, [label, selected, tokens]);
    return (<div className="relative">
      <button type="button" ref={triggerRef} onClick={toggleOpen} className="inline-flex items-center gap-2 rounded-lg border border-primary-divider bg-background px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-app-background">
        <span className="text-text-primary">{displayLabel}</span>
        <CaretDown width={14} height={14} strokeWidth={2} className={`transition-transform ${isOpen ? "rotate-180" : ""}`}/>
      </button>

      {mounted &&
            createPortal(<AnimatePresence>
            {isOpen && coords && (<motion.div ref={panelRef} initial={{ opacity: 0, scaleY: 0.55, scale: 0.96, y: -6 }} animate={{ opacity: 1, scaleY: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scaleY: 0.7, scale: 0.97, y: -4 }} transition={{ type: "spring", stiffness: 460, damping: 24, mass: 0.7 }} style={{
                        position: "fixed",
                        top: coords.top,
                        left: coords.left,
                        width: coords.width,
                        transformOrigin: "top center",
                    }} className="z-[100] overflow-hidden rounded-2xl border border-white/10 bg-[#26262b]/85 p-1.5 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <div className="px-2 py-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">Filter tokens</p>
                </div>
                <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto">
                  {tokens.map(token => {
                        const checked = selected.includes(token);
                        return (<button key={token} type="button" onClick={() => onToggle(token)} className={`flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.08] ${checked ? "bg-white/[0.10]" : ""}`}>
                        <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${checked ? "border-white bg-white" : "border-white/30"}`}>
                          {checked && <Check width={11} height={11} strokeWidth={2} className="text-[#26262b]"/>}
                        </span>
                        <img src={`/token/${token.toLowerCase()}.svg`} alt={token} className="h-5 w-5 flex-shrink-0 rounded-full" onError={e => {
                                (e.currentTarget as HTMLImageElement).src = "/token/any-token.svg";
                            }}/>
                        <span className="num text-[14px] font-medium text-white/90">{token}</span>
                        <span className="ml-auto h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: colors[token] ?? "#9E77ED" }}/>
                      </button>);
                    })}
                </div>
              </motion.div>)}
          </AnimatePresence>, document.body)}
    </div>);
};
