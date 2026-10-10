"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { NavArrowDown as CaretDown, Check } from "iconoir-react";
export interface FrostedMenuItem {
    key: string;
    label: React.ReactNode;
    icon?: React.ElementType;
}
interface FrostedMenuProps {
    label: React.ReactNode;
    items: FrostedMenuItem[];
    onSelect: (key: string) => void;
    activeKey?: string;
    align?: "left" | "right";
    width?: number;
    triggerClassName?: string;
}
export const FrostedMenu = ({ label, items, onSelect, activeKey, align = "left", width = 180, triggerClassName = "", }: FrostedMenuProps) => {
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
            const left = align === "right" ? r.right - width : r.left;
            setCoords({ top: r.bottom + 8, left, width });
        }
        setIsOpen(o => !o);
    };
    return (<div className="relative">
      <button type="button" ref={triggerRef} onClick={toggleOpen} className={`inline-flex items-center justify-between gap-2 rounded-xl border border-primary-divider bg-background px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-app-background ${triggerClassName}`}>
        <span className="truncate">{label}</span>
        <CaretDown width={14} height={14} strokeWidth={2} className={`flex-shrink-0 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}/>
      </button>

      {mounted &&
            createPortal(<AnimatePresence>
            {isOpen && coords && (<motion.div ref={panelRef} initial={{ opacity: 0, scaleY: 0.55, scale: 0.96, y: -6 }} animate={{ opacity: 1, scaleY: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scaleY: 0.7, scale: 0.97, y: -4 }} transition={{ type: "spring", stiffness: 460, damping: 24, mass: 0.7 }} style={{
                        position: "fixed",
                        top: coords.top,
                        left: coords.left,
                        width: coords.width,
                        transformOrigin: "top center",
                    }} className="z-[1000] overflow-hidden rounded-2xl border border-white/10 bg-[#26262b]/85 p-1.5 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto">
                  {items.map(item => {
                        const active = item.key === activeKey;
                        const Icon = item.icon;
                        return (<button key={item.key} type="button" onClick={() => {
                                onSelect(item.key);
                                setIsOpen(false);
                            }} className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.08] ${active ? "bg-white/[0.10]" : ""}`}>
                        {Icon && <Icon width={16} height={16} strokeWidth={2} className="flex-shrink-0 text-white/70"/>}
                        <span className="flex-1 text-[14px] font-medium text-white/90">{item.label}</span>
                        {active && <Check width={14} height={14} strokeWidth={2} className="flex-shrink-0 text-white/80"/>}
                      </button>);
                    })}
                </div>
              </motion.div>)}
          </AnimatePresence>, document.body)}
    </div>);
};
