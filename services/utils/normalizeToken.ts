export function n(symbol: string | undefined | null): string {
  if (!symbol) return "USDC";
  return symbol.toUpperCase() === "SETTLBOX" ? "USDC" : symbol;
}
