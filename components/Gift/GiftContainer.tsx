"use client";

import { GiftStatistics } from "./GiftStatistics";

export function GiftContainer() {
  return <main className="w-full space-y-5 p-6 text-text-primary"><h1 className="text-2xl font-semibold">Gifts</h1><GiftStatistics /></main>;
}

export default GiftContainer;
