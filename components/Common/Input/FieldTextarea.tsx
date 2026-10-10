"use client";
import React from "react";

interface FieldTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: boolean;
  errorMessage?: string;
  containerClassName?: string;
}

/**
 * Multi-line counterpart to FieldInput: label above, rounded-xl bordered box, blue focus ring.
 * forwardRef so react-hook-form `register` works (`{...register("note")}`).
 */
const FieldTextarea = React.forwardRef<HTMLTextAreaElement, FieldTextareaProps>(function FieldTextarea(
  { label, error, errorMessage, containerClassName = "", className = "", id, rows = 4, ...rest },
  ref,
) {
  return (
    <div className={`flex w-full flex-col ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="mb-1.5 text-[13px] font-medium text-text-primary">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        className={`w-full resize-none rounded-xl border bg-background px-3.5 py-2.5 text-[14px] text-text-primary outline-none transition placeholder:text-[#C1C1C1] focus:ring-2 focus:ring-primary-blue/15 ${
          error ? "border-[#E93544] focus:border-[#E93544]" : "border-primary-divider focus:border-primary-blue"
        } ${className}`}
        {...rest}
      />
      {error && errorMessage && <p className="mt-1.5 text-[12px] text-[#E93544]">{errorMessage}</p>}
    </div>
  );
});

export default FieldTextarea;
