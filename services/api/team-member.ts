"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceMember } from "@/services/server/team-members";
import type {
  BulkInviteTeamMembersDto,
  InviteTeamMemberDto,
  UpdateTeamMemberDto,
  UpdateTeamMemberRoleDto,
} from "@/types/dto/team-member";

type Options = { enabled?: boolean };
export async function teamRequest<T>(
  method = "GET",
  input?: unknown,
): Promise<T> {
  if (
    input &&
    typeof input === "object" &&
    "id" in input &&
    (typeof input.id !== "number" || input.id <= 0)
  )
    throw new Error(
      "Historical profiles are read-only and do not grant workspace access",
    );
  const response = await fetch("/api/team", {
    method,
    headers: { "Content-Type": "application/json" },
    body: input === undefined ? undefined : JSON.stringify(input),
  });
  const value: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      value && typeof value === "object" && "error" in value
        ? String(value.error)
        : "Team request failed",
    );
  return value as T;
}
export function useGetCompanyTeamMembers(
  _companyId?: number,
  _filters?: unknown,
  options?: Options,
) {
  return useQuery({
    queryKey: ["team-members"],
    enabled: options?.enabled,
    queryFn: () => teamRequest<WorkspaceMember[]>(),
    retry: false,
  });
}
export function useGetTeamMemberById(id?: number, options?: Options) {
  const query = useGetCompanyTeamMembers(undefined, undefined, options);
  return { ...query, data: query.data?.find((member) => member.id === id) };
}
export function useGetTeamStats(companyId?: number, options?: Options) {
  const query = useGetCompanyTeamMembers(companyId, undefined, options);
  const members = query.data || [];
  return {
    ...query,
    data: {
      total: members.length,
      active: members.filter((member) => member.status === "ACTIVE").length,
      pending: members.filter((member) => member.status === "PENDING").length,
      suspended: members.filter((member) => member.status === "SUSPENDED")
        .length,
    },
  };
}
function useTeamMutation<T, Input>(
  method: string,
  transform: (input: Input) => unknown,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Input) => teamRequest<T>(method, transform(input)),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["team-members"] });
      await client.invalidateQueries({ queryKey: ["workspace-principal"] });
    },
  });
}
export function useInviteTeamMember() {
  return useTeamMutation<
    { member: WorkspaceMember; token: string },
    { companyId?: number; inviteDto: InviteTeamMemberDto }
  >("POST", (input) => input.inviteDto);
}
export function useUpdateTeamMember() {
  return useTeamMutation<
    WorkspaceMember,
    {
      teamMemberId: number;
      updateDto: UpdateTeamMemberDto & Partial<UpdateTeamMemberRoleDto>;
    }
  >("PATCH", (input) => ({ id: input.teamMemberId, data: input.updateDto }));
}
export function useUpdateTeamMemberRole() {
  return useTeamMutation<
    WorkspaceMember,
    { teamMemberId: number; updateRoleDto: UpdateTeamMemberRoleDto }
  >("PATCH", (input) => ({
    id: input.teamMemberId,
    data: input.updateRoleDto,
  }));
}
export function useRemoveTeamMember() {
  return useTeamMutation<
    { deleted: number },
    { teamMemberId: number; companyId?: number }
  >("DELETE", (input) => ({ id: input.teamMemberId }));
}
export function useUpdateAvatar() {
  return useTeamMutation<
    WorkspaceMember,
    { teamMemberId: number; profilePicture: string }
  >("PATCH", (input) => ({
    id: input.teamMemberId,
    data: { profilePicture: input.profilePicture },
  }));
}
export function useResendInvitation() {
  return useTeamMutation<{ member: WorkspaceMember; token: string }, number>(
    "PATCH",
    (id) => ({ id, action: "resend" }),
  );
}

export function useBulkInviteTeamMembers() {
  return useTeamMutation<
    { member: WorkspaceMember; token: string }[],
    { companyId?: number; bulkInviteDto: BulkInviteTeamMembersDto }
  >("POST", (input) => input.bulkInviteDto);
}
