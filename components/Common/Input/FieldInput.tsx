"use client";
import React from "react";

interface FieldInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: boolean;
  errorMessage?: string;
  leadingIcon?: React.ReactNode;
  containerClassName?: string;
  /** Accepted for drop-in compat with the old InputOutlined; styling is fixed. */
  size?: "default" | "compact";
}

/**
 * Login-style text field: label above, rounded-xl bordered box, blue focus ring.
 * forwardRef so react-hook-form `register` works (`{...register("name")}`).
 */
const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(function FieldInput(
  { label, error, errorMessage, leadingIcon, containerClassName = "", className = "", id, size, ...rest },
  ref,
) {
  void size;
  return (
    <div className={`flex w-full flex-col ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="mb-1.5 text-[13px] font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          ref={ref}
          className={`h-[46px] w-full rounded-xl border bg-background ${
            leadingIcon ? "pl-10" : "pl-3.5"
          } pr-3.5 text-[14px] text-text-primary outline-none transition placeholder:text-[#C1C1C1] focus:ring-2 focus:ring-primary-blue/15 ${
            error ? "border-[#E93544] focus:border-[#E93544]" : "border-primary-divider focus:border-primary-blue"
          } ${className}`}
          {...rest}
        />
      </div>
      {error && errorMessage && <p className="mt-1.5 text-[12px] text-[#E93544]">{errorMessage}</p>}
    </div>
  );
});

export default FieldInput;
