import { formatAmount } from "./amount";

export function displayUsdc(value: bigint, fractionDigits = 2): string {
  const digits =
    value > 0n && value < 10n ** 16n
      ? Math.max(6, fractionDigits)
      : fractionDigits;
  const [whole, fraction = ""] = formatAmount(value).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction.padEnd(digits, "0").slice(0, digits)}`;
}
