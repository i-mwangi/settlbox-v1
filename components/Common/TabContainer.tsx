"use client";
import React from "react";
import { motion } from "motion/react";

interface TabContainerProps {
  tabs: { id: string; label: string | React.ReactNode; disabled?: boolean }[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  textSize?: "sm" | "base";
  /** Kept for API compatibility; the transition tab bar is content-width. */
  tabWidth?: number;
}

/**
 * Compact, content-width tab bar with a sliding dark "pill" indicator that
 * transitions between tabs (Framer Motion shared layout). Not full-width.
 */
export function TabContainer({ tabs, activeTab, setActiveTab, textSize = "base" }: TabContainerProps) {
  return (
    <nav className="inline-flex w-fit items-center gap-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`relative rounded-lg px-4 py-1.5 ${textSize === "sm" ? "text-sm" : "text-base"} font-medium transition-colors ${
              tab.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            } ${isActive ? "text-white" : "text-text-secondary hover:text-text-primary"}`}
          >
            {isActive && (
              <motion.span
                layoutId="dashboard-tab-pill"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 z-0 rounded-lg bg-[#1b1b1b]"
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
