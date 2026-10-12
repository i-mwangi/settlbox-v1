"use client";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { demoTeamMember } from "./demo-shapes";
import { mergeTeamDirectory } from "@/services/team-directory";
import * as live from "@/services/api/team-member";
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum,
} from "@/presentation/types/enums";
import type { TeamMemberResponseDto } from "@/presentation/types/dto/team-member";

type Options = { enabled?: boolean };
type Filters = { search?: string };
export function useGetCompanyTeamMembers(
  companyId?: number,
  filters?: Filters,
  options?: Options,
) {
  const { data: workspace, isLoaded, activeEntityId } = useDemo();
  const query = live.useGetCompanyTeamMembers(companyId, undefined, {
    enabled: options?.enabled !== false && activeEntityId === "entity-3",
  });
  const search = filters?.search?.trim().toLowerCase() || "";
  const data = useMemo(() => {
    const current: TeamMemberResponseDto[] = (
      activeEntityId === "entity-3" ? query.data || [] : []
    ).map((member) => ({
      ...member,
      role:
        Object.values(TeamMemberRoleEnum).find(
          (role) => role === member.role,
        ) || TeamMemberRoleEnum.VIEWER,
      status:
        Object.values(TeamMemberStatusEnum).find(
          (status) => status === member.status,
        ) || TeamMemberStatusEnum.PENDING,
      user: {
        id: member.id,
        email: member.email,
        publicKey: member.walletAddress || "",
      },
    }));
    return mergeTeamDirectory(
      current,
      (workspace?.teamMembers || []).map(demoTeamMember),
      search,
    );
  }, [query.data, workspace?.teamMembers, activeEntityId, search]);
  return { ...query, data, isLoading: !isLoaded || query.isLoading };
}
export function useGetTeamMemberById(id?: number, options?: Options) {
  const query = useGetCompanyTeamMembers(undefined, undefined, options);
  return { ...query, data: query.data.find((member) => member.id === id) };
}
export function useGetTeamStats(companyId?: number, options?: Options) {
  const query = useGetCompanyTeamMembers(companyId, undefined, options);
  return {
    ...query,
    data: {
      total: query.data.length,
      active: query.data.filter(
        (member) => member.id > 0 && member.status === "ACTIVE",
      ).length,
      pending: query.data.filter(
        (member) => member.id > 0 && member.status === "PENDING",
      ).length,
      suspended: query.data.filter(
        (member) => member.id > 0 && member.status === "SUSPENDED",
      ).length,
      historical: query.data.filter((member) => member.id < 0).length,
    },
  };
}
function useScopedMutation<Input, Output>(mutation: {
  mutateAsync: (input: Input) => Promise<Output>;
}) {
  const { activeEntityId } = useDemo();
  return useMutation({
    mutationFn: async (input: Input) => {
      if (activeEntityId !== "entity-3")
        throw new Error(
          "Switch to the Arc treasury workspace to manage team access",
        );
      return mutation.mutateAsync(input);
    },
  });
}
export function useUpdateTeamMember() {
  return useScopedMutation(live.useUpdateTeamMember());
}
export function useUpdateTeamMemberRole() {
  return useScopedMutation(live.useUpdateTeamMemberRole());
}
export function useUpdateAvatar() {
  return useScopedMutation(live.useUpdateAvatar());
}
export function useRemoveTeamMember() {
  return useScopedMutation(live.useRemoveTeamMember());
}
export function useInviteTeamMember() {
  return useScopedMutation(live.useInviteTeamMember());
}
export function useBulkInviteTeamMembers() {
  return useScopedMutation(live.useBulkInviteTeamMembers());
}
export function useResendInvitation() {
  return useScopedMutation(live.useResendInvitation());
}
