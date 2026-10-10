"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetMyCompany } from "@/services/api/company";
import type { WorkspaceProfile } from "@/types/workspace";
import type { WorkspacePrincipal } from "@/services/server/operator-session";

interface WorkspaceUser {
  id: number;
  uuid: string;
  email: string;
  role: WorkspacePrincipal["role"];
  isActive: boolean;
  teamMembership: {
    id: number;
    firstName: string;
    lastName: string;
    role: WorkspacePrincipal["role"];
    companyId: number;
    position: string;
    profilePicture: string | null;
    company: WorkspaceProfile | undefined;
  };
}
export interface AuthState { isAuthenticated: boolean; user: WorkspaceUser | null; isLoading: boolean; error: string | null }
export interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}
export interface AuthProviderProps { children: ReactNode }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const client = useQueryClient();
  const session = useQuery({ queryKey: ["operator-session"], queryFn: async () => { const response = await fetch("/api/operator/session"); if (response.status === 401) return false; if (!response.ok) throw new Error("Workspace session is unavailable"); return true; }, staleTime: 30000 });
  const profile = useGetMyCompany({ enabled: session.data === true });
  const principal = useQuery({ queryKey: ["workspace-principal"], enabled: session.data === true, staleTime: 30000, queryFn: async (): Promise<WorkspacePrincipal> => { const response = await fetch("/api/operator/session"); if (!response.ok) throw new Error("Workspace session is unavailable"); const result = await response.json() as { principal: WorkspacePrincipal }; return result.principal; } });
  const identity = principal.data;
  const member = identity?.member;
  const value: AuthContextValue = {
    isAuthenticated: session.data === true,
    isLoading: session.isLoading,
    error: session.error?.message || null,
    user: session.data === true && identity ? { id: member?.id || 1, uuid: identity.id, email: member?.email || "", role: identity.role, isActive: true, teamMembership: { id: member?.id || 1, firstName: member?.firstName || "Workspace", lastName: member?.lastName || "Operator", role: identity.role, companyId: profile.data?.id || 1, position: member?.position || "Treasury operator", profilePicture: member?.profilePicture || null, company: profile.data } } : null,
    logout: async () => { const response = await fetch("/api/operator/session", { method: "DELETE" }); if (!response.ok) throw new Error("Sign-out failed"); client.clear(); client.setQueryData(["operator-session"], false); window.location.assign("/operator"); },
    refreshUser: async () => { await client.invalidateQueries({ queryKey: ["workspace"] }); await client.invalidateQueries({ queryKey: ["workspace-principal"] }); await session.refetch(); },
    clearError: () => { void session.refetch(); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("Workspace authentication is unavailable"); return context; }
