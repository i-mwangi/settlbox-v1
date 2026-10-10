"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const publicRoutes = ["/operator", "/login", "/payment/", "/invoice-review", "/team-invite", "/gift/open-gift", "/legacy/gift/open-gift", "/testnet-treasury", "/transfer", "/dev/deploy-faucet"];

export function useAuthGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicRoutes.some(route => pathname === route || pathname.startsWith(route.endsWith("/") ? route : `${route}/`));
  const session = useQuery({ queryKey: ["operator-session"], enabled: !isPublic, staleTime: 30000, refetchInterval: isPublic ? false : 60000, queryFn: async () => {
    const response = await fetch("/api/operator/session");
    if (response.status === 401) return false;
    if (!response.ok) throw new Error("Workspace session is unavailable");
    return true;
  } });
  useEffect(() => {
    if (!isPublic && session.data === false) router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
  }, [isPublic, session.data, pathname, router]);
  return { isAuthenticated: session.data === true, isLoading: !isPublic && session.isLoading, canAccess: isPublic || session.data === true, error: session.error, retry: session.refetch };
}
