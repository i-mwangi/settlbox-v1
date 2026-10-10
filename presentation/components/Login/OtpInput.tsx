"use client";
import React, { useEffect, useRef, useState } from "react";
interface OtpInputProps {
    value: string;
    onChange: (v: string) => void;
    onComplete?: (v: string) => void;
    length?: number;
    groupSize?: number;
    autoFocus?: boolean;
    disabled?: boolean;
}
function pad(v: string, n: number): string[] {
    const a = v
        .replace(/\D/g, "")
        .slice(0, n)
        .split("");
    while (a.length < n)
        a.push("");
    return a;
}
export default function OtpInput({ value, onChange, onComplete, length = 6, groupSize = 2, autoFocus, disabled, }: OtpInputProps) {
    const [chars, setChars] = useState<string[]>(() => pad(value, length));
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    useEffect(() => {
        if (value !== chars.join(""))
            setChars(pad(value, length));
    }, [value, length]);
    const emit = (next: string[]) => {
        setChars(next);
        const joined = next.join("");
        onChange(joined);
        if (joined.length === length)
            onComplete?.(joined);
    };
    const focusAt = (i: number) => {
        const el = inputs.current[i];
        if (el) {
            el.focus();
            el.select();
        }
    };
    const handleChange = (i: number, raw: string) => {
        if (raw === "") {
            const next = [...chars];
            next[i] = "";
            emit(next);
            return;
        }
        const digit = raw.replace(/\D/g, "").slice(-1);
        if (!digit)
            return;
        const next = [...chars];
        next[i] = digit;
        emit(next);
        if (i < length - 1)
            focusAt(i + 1);
    };
    const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            const next = [...chars];
            if (next[i]) {
                next[i] = "";
                emit(next);
            }
            else if (i > 0) {
                next[i - 1] = "";
                emit(next);
                focusAt(i - 1);
            }
        }
        else if (e.key === "ArrowLeft" && i > 0) {
            e.preventDefault();
            focusAt(i - 1);
        }
        else if (e.key === "ArrowRight" && i < length - 1) {
            e.preventDefault();
            focusAt(i + 1);
        }
    };
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
        if (!text)
            return;
        emit(pad(text, length));
        focusAt(Math.min(text.length, length - 1));
    };
    const groups: number[][] = [];
    for (let i = 0; i < length; i += groupSize) {
        groups.push(Array.from({ length: Math.min(groupSize, length - i) }, (_, k) => i + k));
    }
    return (<div className="flex items-center justify-center gap-2.5">
      {groups.map((group, gi) => (<React.Fragment key={gi}>
          {gi > 0 && <span aria-hidden className="h-0.5 w-3 rounded-full bg-[#cfd3da]"/>}
          <div className="flex">
            {group.map((idx, ci) => (<input key={idx} ref={el => {
                    inputs.current[idx] = el;
                }} type="text" inputMode="numeric" autoComplete={idx === 0 ? "one-time-code" : "off"} aria-label={`Digit ${idx + 1}`} maxLength={1} disabled={disabled} value={chars[idx] ?? ""} onChange={e => handleChange(idx, e.target.value)} onKeyDown={e => handleKeyDown(idx, e)} onPaste={handlePaste} onFocus={e => e.target.select()} autoFocus={autoFocus && idx === 0} className={`relative h-12 w-10 border border-primary-divider bg-background text-center text-[18px] font-semibold text-text-primary outline-none transition focus:z-10 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 disabled:opacity-60 ${ci === 0 ? "rounded-l-xl" : "-ml-px"} ${ci === group.length - 1 ? "rounded-r-xl" : ""}`}/>))}
          </div>
        </React.Fragment>))}
    </div>);
}
