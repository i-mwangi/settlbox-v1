import React from "react";
import FieldInput from "./FieldInput";
import FieldTextarea from "./FieldTextarea";

interface InputFilledProps {
  label: string;
  placeholder?: string;
  value?: string;
  error?: boolean;
  type?: string;
  icon?: string;
  optional?: boolean;
  characterLimit?: number;
  iconOnClick?: () => void;
  containerClassName?: string;
  [key: string]: any; // For react-hook-form register
}

/**
 * Canonical filled input. Renders the product's standard field look:
 * label above, full-border rounded-xl white box (matches FieldInput / FieldTextarea).
 * - With `icon`: a selector box (label above, trailing icon button that opens a picker).
 * - `type="textarea"`: multi-line, with optional character counter.
 */
export default function InputFilled({
  label,
  placeholder,
  value,
  error,
  type = "text",
  icon,
  characterLimit,
  optional = false,
  iconOnClick,
  containerClassName = "",
  ...rest
}: InputFilledProps) {
  const fullLabel = optional ? `${label} (Optional)` : label;

  // Selector variant: labeled box with a trailing icon button that opens a picker.
  if (icon) {
    return (
      <div className={`flex w-full flex-col ${containerClassName}`}>
        <label className="mb-1.5 text-[13px] font-medium text-text-primary">{fullLabel}</label>
        <div
          className={`flex h-[46px] w-full flex-row items-center justify-between rounded-xl border bg-background pl-3.5 pr-2 transition focus-within:ring-2 focus-within:ring-primary-blue/15 ${
            error ? "border-[#E93544] focus-within:border-[#E93544]" : "border-primary-divider focus-within:border-primary-blue"
          }`}
        >
          <input
            className="w-full bg-transparent text-[14px] text-text-primary outline-none placeholder:text-[#C1C1C1]"
            placeholder={placeholder}
            value={value}
            type={type}
            {...rest}
          />
          <div className="ml-2 flex-shrink-0 cursor-pointer rounded-lg px-2 py-1 hover:bg-app-background" onClick={iconOnClick}>
            <img src={icon} alt="icon" className="w-5" />
          </div>
        </div>
      </div>
    );
  }

  // Multi-line variant.
  if (type === "textarea") {
    return (
      <div className={`flex w-full flex-col ${containerClassName}`}>
        <FieldTextarea label={fullLabel} placeholder={placeholder} value={value} error={!!error} {...rest} />
        {characterLimit && (
          <div className="flex w-full flex-row justify-end px-2">
            <p className="text-xs text-text-secondary">
              {(value as string)?.length ?? 0}/{characterLimit}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Standard text field.
  return (
    <FieldInput
      label={fullLabel}
      placeholder={placeholder}
      value={value}
      type={type}
      error={!!error}
      containerClassName={containerClassName}
      {...rest}
    />
  );
}
