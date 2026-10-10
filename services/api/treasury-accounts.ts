"use client";

import { useTreasury } from "./treasury";
import { useGetMyCompany } from "./company";

export function useTreasuryAccounts() {
  const treasury = useTreasury();
  const company = useGetMyCompany();
  return { ...treasury, data: treasury.data ? [{ id: treasury.data.wallet.id, accountId: treasury.data.wallet.address, name: `${company.data?.companyName || "Company"} treasury`, logo: company.data?.logo || "/logo/settlbox-icon.svg" }] : undefined };
}
