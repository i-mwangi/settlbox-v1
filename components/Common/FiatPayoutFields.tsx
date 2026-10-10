"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { NavArrowDown } from "iconoir-react";
import { FIAT_COUNTRIES, FiatCountry, getRailLabel } from "@/data/fiat-payout";
import { BankDropdown } from "./Dropdown/BankDropdown";
import FieldInput from "./Input/FieldInput";

interface FormInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

const FiatInput = ({ label, placeholder, value, onChange, disabled, required }: FormInputProps) => (
  <FieldInput
    label={required ? label : `${label} (Optional)`}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    autoComplete="off"
  />
);

export interface FiatPayoutData {
  country: string;
  countryCode: string;
  currency: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  routingOrSwift: string;
}

interface FiatPayoutFieldsProps {
  data: FiatPayoutData;
  onChange: (data: FiatPayoutData) => void;
  disabled?: boolean;
}

export const FiatPayoutFields = ({ data, onChange, disabled = false }: FiatPayoutFieldsProps) => {
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCountry = useMemo(
    () => FIAT_COUNTRIES.find(c => c.code === data.countryCode),
    [data.countryCode],
  );

  const railLabels = useMemo(
    () => getRailLabel(selectedCountry?.rail ?? "swift"),
    [selectedCountry],
  );

  const hasBank = !!selectedCountry && selectedCountry.rail === "local" && selectedCountry.banks.length > 0;

  const handleCountrySelect = (country: FiatCountry) => {
    onChange({
      ...data,
      country: country.name,
      countryCode: country.code,
      currency: country.currencyCode,
      bankName: "",
      routingOrSwift: "",
    });
    setCountryOpen(false);
  };

  const update = (field: keyof FiatPayoutData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Recipient country (+ bank when the country uses local rails), aligned side by side */}
      <div className={hasBank ? "grid grid-cols-2 gap-3" : ""}>
        <div className="relative" ref={countryRef}>
          <button
            type="button"
            onClick={() => !disabled && setCountryOpen(!countryOpen)}
            className="flex h-[64px] w-full items-center justify-between gap-2 rounded-xl border border-primary-divider bg-background px-4 text-left transition-colors cursor-pointer hover:bg-app-background disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
          >
            <div className="flex min-w-0 flex-row items-center gap-2">
              {selectedCountry && (
                <img src={selectedCountry.icon} alt={selectedCountry.name} className="w-6 h-6 flex-shrink-0" />
              )}
              <div className="flex min-w-0 flex-col justify-center">
                <span className="text-text-secondary text-[13px]">Recipient country</span>
                {selectedCountry && (
                  <p className="truncate text-text-primary font-semibold text-[15px]">{selectedCountry.name}</p>
                )}
              </div>
            </div>
            <NavArrowDown
              width={18}
              height={18}
              strokeWidth={2}
              className={`flex-shrink-0 text-text-secondary transition-transform ${countryOpen ? "rotate-180" : ""}`}
            />
          </button>

          {countryOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-[120] max-h-[280px] overflow-y-auto rounded-2xl border border-white/10 bg-[#26262b]/90 p-1.5 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <div className="px-2 py-1.5">
                <p className="text-white/50 text-xs">Select recipient country</p>
              </div>
              <div className="flex flex-col gap-0.5">
                {FIAT_COUNTRIES.map(country => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`flex w-full items-center gap-2 rounded-lg p-2 transition-colors cursor-pointer hover:bg-white/[0.08] ${
                      data.countryCode === country.code ? "bg-white/[0.10]" : ""
                    }`}
                  >
                    <img src={country.icon} alt={country.name} className="w-5 h-5" />
                    <span className="text-[14px] font-medium text-white/90">{country.name}</span>
                    <span className="ml-auto text-sm text-white/50">{country.currencyCode}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bank dropdown for countries with local rails */}
        {hasBank && (
          <BankDropdown
            banks={selectedCountry!.banks}
            selectedBank={data.bankName}
            onBankSelect={name => update("bankName", name)}
            disabled={disabled}
            variant="filled"
          />
        )}
      </div>

      {/* Conditional fields based on selected country */}
      {selectedCountry && (
        <>
          {/* Rail-specific fields */}
          {selectedCountry.rail === "ach" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <FiatInput
                  label={railLabels.primary}
                  placeholder={railLabels.placeholder1}
                  value={data.routingOrSwift}
                  onChange={v => update("routingOrSwift", v)}
                  disabled={disabled}
                  required
                />
              </div>
              <div className="flex-1">
                <FiatInput
                  label={railLabels.secondary}
                  placeholder={railLabels.placeholder2}
                  value={data.accountNumber}
                  onChange={v => update("accountNumber", v)}
                  disabled={disabled}
                  required
                />
              </div>
            </div>
          )}

          {selectedCountry.rail === "fps" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <FiatInput
                  label={railLabels.primary}
                  placeholder={railLabels.placeholder1}
                  value={data.routingOrSwift}
                  onChange={v => update("routingOrSwift", v)}
                  disabled={disabled}
                  required
                />
              </div>
              <div className="flex-1">
                <FiatInput
                  label={railLabels.secondary}
                  placeholder={railLabels.placeholder2}
                  value={data.accountNumber}
                  onChange={v => update("accountNumber", v)}
                  disabled={disabled}
                  required
                />
              </div>
            </div>
          )}

          {selectedCountry.rail === "sepa" && (
            <div className="flex flex-col gap-3">
              <FiatInput
                label={railLabels.primary}
                placeholder={railLabels.placeholder1}
                value={data.accountNumber}
                onChange={v => update("accountNumber", v)}
                disabled={disabled}
                required
              />
              <FiatInput
                label={railLabels.secondary}
                placeholder={railLabels.placeholder2}
                value={data.routingOrSwift}
                onChange={v => update("routingOrSwift", v)}
                disabled={disabled}
              />
            </div>
          )}

          {selectedCountry.rail === "local" && (
            <FiatInput
              label="Account number"
              placeholder="e.g. 1234567890"
              value={data.accountNumber}
              onChange={v => update("accountNumber", v)}
              disabled={disabled}
              required
            />
          )}

          {/* Account holder - always shown */}
          <FiatInput
            label="Account holder name"
            placeholder="Name on the account"
            value={data.accountHolder}
            onChange={v => update("accountHolder", v)}
            disabled={disabled}
            required
          />

          {/* Currency - auto-filled, read-only */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-app-background border border-primary-divider">
            <div className="flex-1">
              <p className="text-text-secondary text-xs">Currency</p>
              <p className="text-text-primary text-sm font-medium">
                {selectedCountry.currencyCode} ({selectedCountry.currency})
              </p>
            </div>
            <span className="text-xs text-text-secondary bg-background px-2 py-1 rounded-full border border-primary-divider">
              Auto-selected
            </span>
          </div>

          {/* Source token info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-app-background border border-primary-divider">
            <img src="/token/usdc.svg" alt="USDC" className="w-7 h-7" />
            <div className="flex-1">
              <p className="text-text-secondary text-xs">Paid from</p>
              <p className="text-text-primary text-sm font-medium">USDC (Stablecoin)</p>
            </div>
            <span className="text-xs text-text-secondary bg-background px-2 py-1 rounded-full border border-primary-divider">
              Auto-converted
            </span>
          </div>
        </>
      )}
    </div>
  );
};
