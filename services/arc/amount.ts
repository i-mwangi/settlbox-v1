export function parseAmount(value: string, decimals = 18): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error("Invalid asset precision");
  }
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) {
    throw new Error("Amount must be a non-negative decimal string");
  }
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error("Amount exceeds asset precision");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

export function parseBaseUnits(value: string): bigint {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error("Invalid base unit amount");
  return BigInt(value);
}

export function formatAmount(value: bigint, decimals = 18): string {
  if (value < 0n) throw new Error("Amount cannot be negative");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("Invalid asset precision");
  if (decimals === 0) return value.toString();
  const padded = value.toString().padStart(decimals + 1, "0");
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return `${padded.slice(0, -decimals)}${fraction ? `.${fraction}` : ""}`;
}
