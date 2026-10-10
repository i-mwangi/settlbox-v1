"use client";

import { useAccountContext } from "@/contexts/AccountProvider";

export function useAccount() {
  return useAccountContext();
}
