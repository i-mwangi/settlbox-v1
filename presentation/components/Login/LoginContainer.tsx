"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import AuthCard from "@/components/Login/AuthCard";
import AuthCanvas from "./AuthCanvas";
export default function LoginContainer() {
    const router = useRouter();
    const { isLoggedIn, isOnboarded, login, isLoaded } = useDemo();
    useEffect(() => {
        if (!isLoaded)
            return;
        if (isLoggedIn && isOnboarded) {
            router.replace("/");
        }
        else if (isLoggedIn && !isOnboarded) {
            router.replace("/onboarding");
        }
    }, [isLoggedIn, isOnboarded, isLoaded, router]);
    const handleCredentials = async (email: string, password: string) => {
        await workspaceFetch("/api/auth/password", "POST", { email, password });
        window.location.assign("/");
    };
    return (<AuthCanvas>
      <AuthCard onCredentials={handleCredentials}/>
    </AuthCanvas>);
}
