"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

const ClientLayout = dynamic(() => import("./ClientLayout"), { ssr: false });
const PresentationLayout = dynamic(() => import("@/presentation/components/ClientLayout"), { ssr: false });

export function ClientLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLive = ["/operator", "/testnet-treasury", "/transfer", "/gift/open-gift", "/dev/"].some(route => pathname === route || pathname.startsWith(route.endsWith("/") ? route : `${route}/`));
  if (isLive) return <ClientLayout>{children}</ClientLayout>;
  return <PresentationLayout>{children}</PresentationLayout>;
}
