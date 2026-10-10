export interface InvoicePresentation {
  id?: number;
  accentColor: string;
  footerText: string;
  companyTaxId: string;
  showTaxId: boolean;
}

export const defaultInvoicePresentation: InvoicePresentation = { accentColor: "#306bff", footerText: "", companyTaxId: "", showTaxId: false };

export function validateInvoicePresentation(value: unknown): InvoicePresentation {
  if (!value || typeof value !== "object") throw new Error("Invoice presentation is required");
  const input = value as Record<string, unknown>;
  if (typeof input.accentColor !== "string" || !/^#[0-9a-f]{6}$/i.test(input.accentColor)) throw new Error("Invalid invoice accent color");
  if (typeof input.footerText !== "string" || input.footerText.length > 2000 || typeof input.companyTaxId !== "string" || input.companyTaxId.length > 160 || typeof input.showTaxId !== "boolean") throw new Error("Invalid invoice presentation");
  return { accentColor: input.accentColor, footerText: input.footerText, companyTaxId: input.companyTaxId.trim(), showTaxId: input.showTaxId };
}
