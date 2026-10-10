"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Mail as Envelope } from "iconoir-react";
import OtpInput from "./OtpInput";
import StatusButton from "../Common/StatusButton";
import FieldInput from "../Common/Input/FieldInput";
function GoogleGlyph() {
    return (<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>);
}
type Mode = "signup" | "login";
type Step = "email" | "otp";
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export default function AuthCard({ onComplete }: {
    onComplete: (email: string) => void;
}) {
    const reduce = useReducedMotion();
    const [mode, setMode] = useState<Mode>("signup");
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [authenticating, setAuthenticating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendIn, setResendIn] = useState(0);
    const timers = useRef<number[]>([]);
    useEffect(() => () => timers.current.forEach(t => clearTimeout(t)), []);
    useEffect(() => {
        if (resendIn <= 0)
            return;
        const t = window.setTimeout(() => setResendIn(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);
    const isSignup = mode === "signup";
    const busy = sending || verifying || authenticating;
    const sendOtp = () => {
        if (busy)
            return;
        if (!EMAIL_RE.test(email.trim())) {
            setError("Enter a valid email address.");
            return;
        }
        setError(null);
        setSending(true);
        timers.current.push(window.setTimeout(() => {
            setSending(false);
            setOtp("");
            setStep("otp");
            setResendIn(RESEND_SECONDS);
        }, 900));
    };
    const verify = (code: string) => {
        if (verifying || verified || code.length < OTP_LENGTH)
            return;
        setError(null);
        setVerifying(true);
        timers.current.push(window.setTimeout(() => {
            setVerifying(false);
            setVerified(true);
            timers.current.push(window.setTimeout(() => onComplete(email.trim()), 900));
        }, 900));
    };
    const resend = () => {
        if (resendIn > 0)
            return;
        setOtp("");
        setError(null);
        setResendIn(RESEND_SECONDS);
    };
    const google = () => {
        if (busy)
            return;
        setAuthenticating(true);
        timers.current.push(window.setTimeout(() => onComplete("alex@novapay.io"), 1200));
    };
    const toggleMode = () => {
        setMode(m => (m === "signup" ? "login" : "signup"));
        setError(null);
    };
    return (<motion.div initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[392px] rounded-[26px] border border-primary-divider/70 bg-[#f1f2f4] p-2.5 shadow-[0_34px_70px_-26px_rgba(20,32,64,0.32)]">
      <div className="rounded-[20px] border border-primary-divider bg-background px-7 pb-8 pt-9 shadow-[0_1px_2px_rgba(20,32,64,0.04)]">
        <img src="/logo/settlbox-icon.svg" alt="Settlbox" className="mx-auto mb-3 h-9 w-9"/>

        <motion.div key={step} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          {step === "email" ? (<>
              <h1 className="text-center text-[23px] font-semibold tracking-tight text-text-primary">
                {isSignup ? "Create your account" : "Log in to Settlbox"}
              </h1>
              <p className="mt-1 text-center text-[14px] text-text-secondary">
                {isSignup ? "Let's get started, it's free." : "Welcome back. Enter your email to continue."}
              </p>

              <form className="mt-7 flex flex-col" onSubmit={e => {
                e.preventDefault();
                sendOtp();
            }}>
                <FieldInput id="auth-email" label="Email" type="email" autoComplete="email" leadingIcon={<Envelope width={18} height={18}/>} value={email} onChange={e => {
                setEmail(e.target.value);
                if (error)
                    setError(null);
            }} placeholder="you@company.com" error={!!error} errorMessage={error || undefined}/>

                <StatusButton type="submit" fullWidth status={sending ? "loading" : "idle"} loadingText="Sending code" disabled={busy} className="mt-5">
                  Continue
                </StatusButton>
              </form>

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-primary-divider"/>
                <span className="text-[12px] text-text-secondary">or {isSignup ? "sign up" : "continue"} with</span>
                <span className="h-px flex-1 bg-primary-divider"/>
              </div>

              <button type="button" onClick={google} disabled={busy} className="flex h-[46px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border border-primary-divider bg-background text-[14px] font-medium text-text-primary transition hover:bg-app-background active:scale-[0.99] disabled:opacity-60">
                {authenticating ? (<>
                    <svg className="h-[18px] w-[18px] animate-spin" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="10" cy="10" r="8" stroke="var(--primary-divider)" strokeWidth="2.5"/>
                      <path d="M18 10a8 8 0 0 0-8-8" stroke="var(--primary-blue)" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    Signing in...
                  </>) : (<>
                    <GoogleGlyph />
                    Continue with Google
                  </>)}
              </button>
            </>) : (<>
              <h1 className="text-center text-[23px] font-semibold tracking-tight text-text-primary">Enter the code</h1>
              <p className="mt-1 text-center text-[14px] leading-[20px] text-text-secondary">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-text-primary">{email}</span>
              </p>

              <div className="mt-7">
                <OtpInput value={otp} onChange={v => {
                setOtp(v);
                if (error)
                    setError(null);
            }} onComplete={verify} autoFocus disabled={verifying}/>
              </div>
              {error && <p className="mt-2.5 text-center text-[12px] text-[#E93544]">{error}</p>}

              <StatusButton type="button" fullWidth onClick={() => verify(otp)} status={verified ? "success" : verifying ? "loading" : "idle"} loadingText="Verifying" successText="Verified" disabled={otp.length < OTP_LENGTH} className="mt-6">
                Verify
              </StatusButton>

              <p className="mt-4 text-center text-[13px] text-text-secondary">
                {resendIn > 0 ? (<span>Resend code in {resendIn}s</span>) : (<button type="button" onClick={resend} className="font-medium text-primary-blue transition hover:underline">
                    Resend code
                  </button>)}
              </p>
            </>)}
        </motion.div>
      </div>

      <div className="py-3 text-center text-[13px] text-text-secondary">
        {step === "otp" ? (<button type="button" onClick={() => {
                setStep("email");
                setError(null);
            }} className="font-semibold text-text-primary transition hover:underline">
            Use a different email
          </button>) : isSignup ? (<>
            Already have an account?{" "}
            <button type="button" onClick={toggleMode} className="font-semibold text-text-primary transition hover:underline">
              Sign in.
            </button>
          </>) : (<>
            New to Settlbox?{" "}
            <button type="button" onClick={toggleMode} className="font-semibold text-text-primary transition hover:underline">
              Create an account.
            </button>
          </>)}
      </div>
    </motion.div>);
}
