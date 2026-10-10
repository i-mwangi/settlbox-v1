"use client";
import React from "react";
import DecorField from "./DecorField";

/**
 * Shared shell for the auth / onboarding flow: a light canvas with payroll
 * decor hugging the screen edges, and a centred slot for the modal card.
 */
export default function AuthCanvas({
  children,
  converge = false,
}: {
  children: React.ReactNode;
  converge?: boolean;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-app-background p-4">
      {/* soft backdrop glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(60% 50% at 50% 42%, rgba(255,255,255,0.9) 0%, rgba(245,245,246,0) 70%)",
        }}
      />

      <DecorField converge={converge} />

      <div className="relative z-20 flex w-full items-center justify-center">{children}</div>
    </div>
  );
}
