"use client";
import React from "react";
import { WarningCircle, ArrowUpRightCircle as ArrowCircleUpRight, CheckCircle, XmarkCircle as XCircle, Clock } from "iconoir-react";
export type PillVariant = "pending" | "submitted" | "success" | "failed" | "expired";
const VARIANTS: Record<PillVariant, {
    cls: string;
    Icon: React.ElementType;
}> = {
    pending: { cls: "bg-orange-100 border-orange-300 text-orange-600", Icon: WarningCircle },
    submitted: { cls: "bg-blue-100 border-blue-300 text-blue-600", Icon: ArrowCircleUpRight },
    success: { cls: "bg-green-100 border-green-300 text-green-700", Icon: CheckCircle },
    failed: { cls: "bg-red-100 border-red-300 text-red-600", Icon: XCircle },
    expired: { cls: "bg-gray-200 border-gray-300 text-gray-600", Icon: Clock },
};
export const StatusPill = ({ variant = "success", children, icon: IconOverride, showIcon = true, className = "", }: {
    variant?: PillVariant;
    children: React.ReactNode;
    icon?: React.ElementType;
    showIcon?: boolean;
    className?: string;
}) => {
    const v = VARIANTS[variant];
    const Icon = IconOverride ?? v.Icon;
    return (<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${v.cls} ${className}`}>
      {showIcon && <Icon width={14} height={14} strokeWidth={2}/>}
      <span className="num whitespace-nowrap">{children}</span>
    </span>);
};
