"use client";
import React from "react";
import toast from "react-hot-toast";
export type ToastType = "success" | "error" | "info";
interface ToastAction {
    label: string;
    onClick: () => void;
}
interface NotifyOptions {
    action?: ToastAction;
    duration?: number;
}
const DOT_COLOR: Record<ToastType, string> = {
    success: "#21c07a",
    error: "#f5841f",
    info: "#9aa0a8",
};
const DOT_COUNT = 12;
const DOT_RADIUS = 7;
export function ToastIcon({ type }: {
    type: ToastType;
}) {
    const color = DOT_COLOR[type];
    return (<span className="relative grid h-5 w-5 shrink-0 place-items-center" aria-hidden>
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
            const angle = (i / DOT_COUNT) * 2 * Math.PI - Math.PI / 2;
            const x = (Math.cos(angle) * DOT_RADIUS).toFixed(2);
            const y = (Math.sin(angle) * DOT_RADIUS).toFixed(2);
            return (<span key={i} className="toast-dot absolute left-1/2 top-1/2 rounded-full" style={{
                    height: 2.2,
                    width: 2.2,
                    background: color,
                    opacity: 0.85,
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                    animationDelay: `${((-i / DOT_COUNT) * 1.2).toFixed(3)}s`,
                }}/>);
        })}
    </span>);
}
const PILL = "pointer-events-auto flex max-w-[440px] items-center gap-2.5 rounded-[14px] border-t border-white/10 bg-[#1a1a1a] py-2.5 pl-2.5 pr-3.5 text-[14px] font-medium leading-snug text-white shadow-[0_14px_38px_-12px_rgba(0,0,0,0.55)]";
export function notify(type: ToastType, message: React.ReactNode, options: NotifyOptions = {}) {
    const { action, duration } = options;
    return toast.custom(t => (<div className={`${PILL} transition-all duration-200 ease-out ${t.visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`}>
        <ToastIcon type={type}/>
        <span className="py-0.5">{message}</span>
        {action && (<>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-white/15"/>
            <button type="button" onClick={() => {
                action.onClick();
                toast.dismiss(t.id);
            }} className="shrink-0 px-1 font-semibold text-white transition hover:opacity-70">
              {action.label}
            </button>
          </>)}
      </div>), { duration: duration ?? (action ? 8000 : 4000) });
}
export const settlboxToast = {
    success: (message: React.ReactNode, options?: NotifyOptions) => notify("success", message, options),
    error: (message: React.ReactNode, options?: NotifyOptions) => notify("error", message, options),
    info: (message: React.ReactNode, options?: NotifyOptions) => notify("info", message, options),
    dismiss: (id?: string) => toast.dismiss(id),
};
if (typeof window !== "undefined") {
    (window as unknown as {
        settlboxToast?: typeof settlboxToast;
    }).settlboxToast = settlboxToast;
}
export default settlboxToast;
