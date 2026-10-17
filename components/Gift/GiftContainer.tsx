"use client";

import { GiftStatistics } from "./GiftStatistics";
import { AuthProvider } from "@/services/auth/context";

export function GiftContainer() {
  return <AuthProvider><main className="w-full space-y-5 p-6 text-text-primary"><h1 className="text-2xl font-semibold">Gifts</h1><GiftStatistics /></main></AuthProvider>;
}

export default GiftContainer;
