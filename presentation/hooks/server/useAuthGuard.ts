"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDemo } from "@/presentation/contexts/DemoProvider";
const PUBLIC_ROUTES = ["/login", "/onboarding", "/payment/"];
export function useAuthGuard(_redirectTo: string = "/login") {
    const { isLoggedIn, isOnboarded, isLoaded } = useDemo();
    const router = useRouter();
    const pathname = usePathname();
    useEffect(() => {
        if (!isLoaded)
            return;
        const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
        if (isPublicRoute)
            return;
        if (!isLoggedIn) {
            router.replace("/login");
        }
        else if (!isOnboarded) {
            router.replace("/onboarding");
        }
    }, [isLoggedIn, isOnboarded, isLoaded, pathname, router]);
    return {
        isAuthenticated: isLoggedIn && isOnboarded,
        isLoading: !isLoaded,
        canAccess: isLoggedIn && isOnboarded,
    };
}
