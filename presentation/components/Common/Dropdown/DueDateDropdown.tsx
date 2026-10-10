"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { NavArrowLeft, NavArrowRight } from "iconoir-react";
const QUICK_DUE_DATES = [
    { label: "Today", days: 0 },
    { label: "Tomorrow", days: 1 },
    { label: "7 days", days: 7 },
    { label: "14 days", days: 14 },
    { label: "30 days", days: 30 },
];
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
interface DueDateDropdownProps {
    selectedDate?: string;
    onDateSelect: (date: string) => void;
    disabled?: boolean;
    variant?: "outlined" | "filled";
    placeholder?: string;
}
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const DueDateDropdown = ({ selectedDate, onDateSelect, disabled = false, variant = "outlined", placeholder = "Select date", }: DueDateDropdownProps) => {
    const containerStyle = useMemo(() => {
        switch (variant) {
            case "outlined":
                return "border border-primary-divider rounded-xl bg-transparent";
            case "filled":
                return "bg-app-background border-b-2 border-primary-divider rounded-xl";
        }
    }, [variant]);
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => new Date());
    const dropdownRef = useRef<HTMLDivElement>(null);
    const getDateObject = (dateString?: string): Date | undefined => {
        if (!dateString)
            return undefined;
        const date = new Date(dateString);
        if (isNaN(date.getTime()))
            return undefined;
        return startOfDay(date);
    };
    const formatDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };
    const formatDisplayDate = (dateString?: string): string => {
        const d = getDateObject(dateString);
        if (!d)
            return placeholder;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${day}/${month}/${d.getFullYear()}`;
    };
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const calculateDate = (days: number): string => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return formatDateString(startOfDay(date));
    };
    const handleQuickDateSelect = (days: number) => {
        onDateSelect(calculateDate(days));
        setIsOpen(false);
    };
    const handleToggle = () => {
        if (disabled)
            return;
        if (!isOpen) {
            const base = getDateObject(selectedDate) || new Date();
            setViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
        }
        setIsOpen(o => !o);
    };
    const pickDay = (day: Date) => {
        onDateSelect(formatDateString(startOfDay(day)));
        setIsOpen(false);
    };
    const getQuickDateLabel = (): string | null => {
        if (!selectedDate)
            return null;
        const match = QUICK_DUE_DATES.find(q => selectedDate === calculateDate(q.days));
        return match?.label || null;
    };
    const formatDateForDisplay = (dateString?: string): string => {
        const date = getDateObject(dateString);
        if (!date)
            return "";
        return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    };
    const cells = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const startOffset = new Date(year, month, 1).getDay();
        const gridStart = new Date(year, month, 1 - startOffset);
        return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }, [viewDate]);
    const today = useMemo(() => startOfDay(new Date()), []);
    const selectedDateObj = getDateObject(selectedDate);
    return (<div className="relative w-full" ref={dropdownRef}>
      <button type="button" onClick={handleToggle} className={`flex items-center gap-2 px-4 h-full w-full text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed justify-between ${containerStyle}`} disabled={disabled}>
        <div className="flex flex-col h-15 justify-center">
          <span className="text-text-secondary text-sm">Due in</span>
          <div className="flex gap-1.5 items-center">
            <p className="text-text-primary font-semibold">
              {selectedDate ? getQuickDateLabel() || formatDisplayDate(selectedDate) : placeholder}
            </p>
            {selectedDate && getQuickDateLabel() && (<p className="text-primary-blue font-medium">{formatDateForDisplay(selectedDate)}</p>)}
          </div>
        </div>
        <NavArrowLeft width={20} height={20} strokeWidth={2} className={`-rotate-90 text-text-secondary transition-transform ${isOpen ? "rotate-90" : ""}`}/>
      </button>

      {isOpen && (<div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-3xl border border-primary-divider bg-background p-4 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.25)]">
          
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUICK_DUE_DATES.map(q => {
                const active = selectedDate === calculateDate(q.days);
                return (<button key={q.label} type="button" onClick={() => handleQuickDateSelect(q.days)} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${active
                        ? "border-transparent bg-[#1b1b1b] text-white" : "border-primary-divider text-text-primary hover:bg-app-background"}`}>
                  {q.label}
                </button>);
            })}
          </div>

          
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-base font-semibold text-text-primary">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h4>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))} className="rounded-full border border-primary-divider px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-app-background">
                Today
              </button>
              <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-primary-divider text-text-primary transition-colors hover:bg-app-background">
                <NavArrowLeft width={14} height={14} strokeWidth={2}/>
              </button>
              <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-primary-divider text-text-primary transition-colors hover:bg-app-background">
                <NavArrowRight width={14} height={14} strokeWidth={2}/>
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
                const isSel = selectedDateObj && sameDay(d, selectedDateObj);
                const isToday = sameDay(d, today);
                return (<button key={i} type="button" onClick={() => pickDay(d)} className={`num mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm transition-colors ${isSel ? "bg-[#1b1b1b] font-semibold text-white" : "hover:bg-app-background"} ${!isSel && (isCurMonth ? "text-text-primary" : "text-text-secondary/40")} ${isToday && !isSel ? "ring-1 ring-primary-divider" : ""}`}>
                  {d.getDate()}
                </button>);
            })}
          </div>
        </div>)}
    </div>);
};
