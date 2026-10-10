"use client";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { Check } from "iconoir-react";
export type ButtonStatus = "idle" | "loading" | "success" | "error";
type Variant = "dark" | "light" | "outline";
type Size = "sm" | "md" | "lg";
interface StatusButtonProps extends Omit<HTMLMotionProps<"button">, "onClick"> {
    children: React.ReactNode;
    status?: ButtonStatus;
    loadingText?: React.ReactNode;
    successText?: React.ReactNode;
    errorText?: React.ReactNode;
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
    leadingIcon?: React.ReactNode;
    resetAfter?: number;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
}
const SIZES: Record<Size, {
    btn: string;
    icon: number;
    check: number;
}> = {
    sm: { btn: "h-9 gap-2 rounded-lg px-3.5 text-[13px]", icon: 14, check: 16 },
    md: { btn: "h-[46px] gap-2.5 rounded-xl px-5 text-[14px]", icon: 16, check: 18 },
    lg: { btn: "h-[52px] gap-2.5 rounded-2xl px-6 text-[15px]", icon: 18, check: 20 },
};
const VARIANTS: Record<Variant, string> = {
    dark: "border-t border-white/15 bg-[#1b1b1b] text-white hover:bg-[#262626]",
    light: "border border-primary-divider bg-background text-text-primary hover:bg-app-background",
    outline: "border border-primary-divider bg-transparent text-text-primary hover:bg-app-background",
};
function Spinner({ size }: {
    size: number;
}) {
    const barW = Math.max(1.4, size * 0.13);
    const barH = size * 0.3;
    const radius = size * 0.34;
    return (<span className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (<span key={i} className="ab-spinner-bar absolute left-1/2 top-1/2" style={{
                width: barW,
                height: barH,
                borderRadius: 99,
                background: "currentColor",
                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-${radius}px)`,
                animationDelay: `${((-i / 8) * 0.8).toFixed(3)}s`,
            }}/>))}
    </span>);
}
export default function StatusButton({ children, status: controlled, loadingText, successText, errorText, variant = "dark", size = "md", fullWidth, leadingIcon, resetAfter = 0, onClick, disabled, className = "", type = "button", ...rest }: StatusButtonProps) {
    const reduce = useReducedMotion();
    const [internal, setInternal] = useState<ButtonStatus>("idle");
    const status = controlled ?? internal;
    const timers = useRef<number[]>([]);
    useEffect(() => () => timers.current.forEach(t => clearTimeout(t)), []);
    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || status === "loading")
            return;
        const result = onClick?.(e);
        if (controlled === undefined && result && typeof (result as {
            then?: unknown;
        }).then === "function") {
            setInternal("loading");
            try {
                await result;
                setInternal("success");
            }
            catch {
                setInternal("error");
            }
            if (resetAfter > 0)
                timers.current.push(window.setTimeout(() => setInternal("idle"), resetAfter));
        }
    };
    const s = SIZES[size];
    const isLoading = status === "loading";
    const isSuccess = status === "success";
    const isError = status === "error";
    const label = isLoading && loadingText != null
        ? loadingText
        : isSuccess && successText != null
            ? successText
            : isError && errorText != null
                ? errorText
                : children;
    let leftNode: React.ReactNode = null;
    if (isLoading) {
        leftNode = <Spinner size={s.icon}/>;
    }
    else if (isSuccess) {
        leftNode = (<span className="grid place-items-center rounded-full bg-white/25" style={{ width: s.check, height: s.check }}>
        <Check width={Math.round(s.check * 0.62)} height={Math.round(s.check * 0.62)} strokeWidth={2.5}/>
      </span>);
    }
    else if (leadingIcon) {
        leftNode = leadingIcon;
    }
    const iconTransition = reduce ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const };
    return (<motion.button layout={!reduce} type={type} onClick={handleClick} disabled={disabled || isLoading} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }} className={`relative inline-flex select-none items-center justify-center overflow-hidden font-medium transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 ${s.btn} ${VARIANTS[variant]} ${fullWidth ? "w-full" : ""} ${className}`} {...rest}>
      <AnimatePresence mode="popLayout" initial={false}>
        {leftNode != null && (<motion.span key={status} initial={reduce ? false : { opacity: 0, scale: 0.5, width: 0 }} animate={{ opacity: 1, scale: 1, width: "auto" }} exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, width: 0 }} transition={iconTransition} className="inline-flex shrink-0 items-center overflow-hidden">
            <span className="flex items-center pr-2">{leftNode}</span>
          </motion.span>)}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={typeof label === "string" ? label : status} initial={reduce ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -5 }} transition={reduce ? { duration: 0 } : { duration: 0.18 }} className="whitespace-nowrap">
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>);
}
