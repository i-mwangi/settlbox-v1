"use client";
export { MockAuthProvider as AuthProvider, useAuth } from "@/presentation/contexts/DemoMockProviders";
export interface AuthState {
    isAuthenticated: boolean;
    user: any;
    isLoading: boolean;
    error: string | null;
}
export interface AuthContextValue extends AuthState {
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}
export interface AuthProviderProps {
    children: React.ReactNode;
}
