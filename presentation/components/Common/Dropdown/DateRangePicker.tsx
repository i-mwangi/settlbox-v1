"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Calendar as CalendarBlank, NavArrowLeft as CaretLeft, NavArrowRight as CaretRight, NavArrowDown as CaretDown } from "iconoir-react";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export interface DateRange {
    start: Date;
    end: Date;
}
interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}
const PANEL_WIDTH = 320;
export const DateRangePicker = ({ value, onChange }: DateRangePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [viewDate, setViewDate] = useState(() => new Date(value.start.getFullYear(), value.start.getMonth(), 1));
    const [pendingStart, setPendingStart] = useState<Date | null>(null);
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
            const left = Math.min(r.left, window.innerWidth - PANEL_WIDTH - 12);
            setCoords({ top: r.bottom + 8, left });
            setViewDate(new Date(value.start.getFullYear(), value.start.getMonth(), 1));
            setPendingStart(null);
        }
        setIsOpen(o => !o);
    };
    const cells = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const startOffset = new Date(year, month, 1).getDay();
        const gridStart = new Date(year, month, 1 - startOffset);
        return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }, [viewDate]);
    const today = startOfDay(new Date());
    const handleDayClick = (d: Date) => {
        const day = startOfDay(d);
        if (!pendingStart) {
            setPendingStart(day);
            onChange({ start: day, end: day });
        }
        else {
            if (day >= pendingStart)
                onChange({ start: pendingStart, end: day });
            else
                onChange({ start: day, end: pendingStart });
            setPendingStart(null);
            setIsOpen(false);
        }
    };
    const inRange = (d: Date) => {
        const day = startOfDay(d).getTime();
        return day >= startOfDay(value.start).getTime() && day <= startOfDay(value.end).getTime();
    };
    return (<div className="relative">
      <button type="button" ref={triggerRef} onClick={toggleOpen} className="inline-flex items-center gap-2 rounded-xl border border-primary-divider bg-background px-4 py-2.5 text-sm text-text-primary transition-colors hover:bg-app-background">
        <CalendarBlank width={16} height={16} className="text-text-secondary"/>
        <span>{fmt(value.start)}</span>
        <span className="text-text-secondary">–</span>
        <span>{fmt(value.end)}</span>
        <CaretDown width={14} height={14} strokeWidth={2} className={`text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}/>
      </button>

      {mounted &&
            createPortal(<AnimatePresence>
            {isOpen && coords && (<motion.div ref={panelRef} initial={{ opacity: 0, scale: 0.97, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -4 }} transition={{ type: "spring", stiffness: 420, damping: 26 }} style={{
                        position: "fixed",
                        top: coords.top,
                        left: coords.left,
                        width: PANEL_WIDTH,
                        transformOrigin: "top left",
                    }} className="z-[100] rounded-3xl border border-primary-divider bg-background p-4 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.25)]">
                
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-base font-semibold text-text-primary">
                    {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))} className="rounded-full border border-primary-divider px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-app-background">
                      Today
                    </button>
                    <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-primary-divider text-text-primary transition-colors hover:bg-app-background">
                      <CaretLeft width={14} height={14} strokeWidth={2}/>
                    </button>
                    <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-primary-divider text-text-primary transition-colors hover:bg-app-background">
                      <CaretRight width={14} height={14} strokeWidth={2}/>
                    </button>
                  </div>
                </div>

                
                <div className="grid grid-cols-7 border-b border-primary-divider pb-2">
                  {WEEKDAYS.map(w => (<div key={w} className="text-center text-xs font-medium text-text-secondary">
                      {w}
                    </div>))}
                </div>

                
                <div className="grid grid-cols-7 gap-y-1 pt-2">
                  {cells.map((d, i) => {
                        const isCurMonth = d.getMonth() === viewDate.getMonth();
                        const isSel = sameDay(d, value.start) || sameDay(d, value.end);
                        const isMid = inRange(d) && !isSel;
                        const isToday = sameDay(d, today);
                        return (<button key={i} type="button" onClick={() => handleDayClick(d)} className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm transition-colors ${isSel
                                ? "bg-[#1b1b1b] font-semibold text-white" : isMid
                                ? "bg-app-background text-text-primary" : "hover:bg-app-background"} ${!isSel && (isCurMonth ? "text-text-primary" : "text-text-secondary/40")} ${isToday && !isSel ? "ring-1 ring-primary-divider" : ""}`}>
                        {d.getDate()}
                      </button>);
                    })}
                </div>
              </motion.div>)}
          </AnimatePresence>, document.body)}
    </div>);
};
