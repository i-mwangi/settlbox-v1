"use client";
import React, { useEffect, useRef, useState } from "react";
import { NavArrowUp, NavArrowLeft, NavArrowRight, Check } from "iconoir-react";

interface TableFooterProps {
  totalRows: number;
  currentPage?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

export function TableFooter({
  totalRows,
  currentPage = 1,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  className = "",
}: TableFooterProps) {
  const [rowsPerPageState, setRowsPerPageState] = useState(rowsPerPage);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setRowsPerPageState(rowsPerPage), [rowsPerPage]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [dropdownOpen]);

  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPageState));
  const start = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPageState + 1;
  const end = Math.min(currentPage * rowsPerPageState, totalRows);

  const handleRowsPerPageChange = (n: number) => {
    setRowsPerPageState(n);
    onRowsPerPageChange?.(n);
    setDropdownOpen(false);
  };

  return (
    <div className={`flex justify-center py-3 ${className}`} data-name="TableFooter">
      <div className="inline-flex items-center gap-4 rounded-2xl bg-app-background p-1.5 shadow-[0_1px_3px_rgba(20,32,64,0.08)]">
        {/* Left group: Show N + range */}
        <div className="flex items-center gap-3">
          {/* Rows-per-page dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-xl border border-primary-divider/70 bg-background px-3.5 py-2 text-sm text-text-secondary shadow-sm transition-colors hover:bg-app-background"
            >
              Show <span className="num font-semibold text-text-primary">{rowsPerPageState}</span>
              <NavArrowUp
                width={14}
                height={14}
                strokeWidth={2}
                className={`text-text-secondary transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {dropdownOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[110px] overflow-hidden rounded-xl border border-white/10 bg-[#26262b]/90 p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                {PAGE_SIZE_OPTIONS.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleRowsPerPageChange(option)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.08] ${
                      option === rowsPerPageState ? "bg-white/[0.10] text-white" : "text-white/85"
                    }`}
                  >
                    <span className="num">{option}</span>
                    {option === rowsPerPageState && <Check width={13} height={13} strokeWidth={2.2} className="text-white/80" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Range */}
          <span className="num whitespace-nowrap px-1 text-sm text-text-secondary">
            Item {start} to {end}
          </span>
        </div>

        {/* Right group: page count + prev/next */}
        <div className="flex items-stretch overflow-hidden rounded-xl border border-primary-divider/70 bg-background shadow-sm">
          <span className="num flex items-center px-4 py-2 text-sm font-medium text-text-primary">
            {currentPage} / {totalPages}
          </span>
          <span className="w-px self-stretch bg-primary-divider/70" />
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
            className="flex items-center px-3 text-text-primary transition-colors hover:bg-app-background disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <NavArrowLeft width={16} height={16} strokeWidth={2} />
          </button>
          <span className="w-px self-stretch bg-primary-divider/70" />
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
            className="flex items-center px-3 text-text-primary transition-colors hover:bg-app-background disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <NavArrowRight width={16} height={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
