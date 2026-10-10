export function formatInvoiceAmount(value: number | string | undefined): string {
  const amount = Number(value ?? 0);
  return (Number.isFinite(amount) ? amount : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export function formatInvoiceDate(value: string | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${date.getUTCFullYear()}`;
}
