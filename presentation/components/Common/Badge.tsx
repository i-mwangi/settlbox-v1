"use client";
import React from "react";
export enum BadgeStatus {
    SUCCESS = "success",
    FAIL = "fail",
    PRIVATE = "private",
    PUBLIC = "public",
    NEUTRAL = "neutral",
    AWAITING = "awaiting"
}
const STYLES: Record<BadgeStatus, {
    pill: string;
    dot: string;
}> = {
    [BadgeStatus.SUCCESS]: { pill: "bg-[#1DAF61]/10 text-[#1DAF61]", dot: "bg-[#1DAF61]" },
    [BadgeStatus.FAIL]: { pill: "bg-[#E93544]/10 text-[#E93544]", dot: "bg-[#E93544]" },
    [BadgeStatus.AWAITING]: { pill: "bg-[#E8A33D]/10 text-[#E8A33D]", dot: "bg-[#E8A33D]" },
    [BadgeStatus.PUBLIC]: { pill: "bg-primary-blue/10 text-primary-blue", dot: "bg-primary-blue" },
    [BadgeStatus.PRIVATE]: { pill: "bg-text-secondary/10 text-text-secondary", dot: "bg-text-secondary" },
    [BadgeStatus.NEUTRAL]: { pill: "bg-text-secondary/10 text-text-secondary", dot: "bg-text-secondary" },
};
interface BadgeProps {
    status: BadgeStatus;
    text: string;
    className?: string;
    showDot?: boolean;
}
const normalizeLabel = (text: string): string => {
    if (/[a-z]/.test(text))
        return text;
    if (!/[A-Za-z]/.test(text))
        return text;
    const spaced = text.replace(/_/g, " ").toLowerCase();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
export const Badge: React.FC<BadgeProps> = ({ status, text = status, className = "", showDot = true }) => {
    const s = STYLES[status] || STYLES[BadgeStatus.NEUTRAL];
    return (<span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.pill} ${className}`}>
      {showDot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`}/>}
      <span className="whitespace-nowrap leading-none">{normalizeLabel(text)}</span>
    </span>);
};
