import { demoTeamMember } from "./demo-shapes";
import { useDemo } from "@/presentation/contexts/DemoProvider";
export const getCompanyTeamMembers = async () => [];
export const getTeamMemberById = async () => ({});
export const getTeamStats = async () => ({});
export const updateTeamMember = async () => ({});
export const updateTeamMemberRole = async () => ({});
export const updateAvatar = async () => ({});
export const removeTeamMember = async () => { };
export const suspendTeamMember = async () => ({});
export const reactivateTeamMember = async () => ({});
export const createTeamMember = async () => ({});
export const inviteTeamMember = async () => ({});
export const bulkInviteTeamMembers = async () => ({});
export const getPendingInvitations = async () => [];
export const acceptInvitation = async () => ({});
export const acceptInvitationByToken = async () => ({});
export const resendInvitation = async () => ({});
export const getUserMemberships = async () => [];
export function useGetCompanyTeamMembers(_companyId?: number, _filters?: any, _options?: any) {
    const { data, isLoaded } = useDemo();
    return {
        data: data?.teamMembers.map(demoTeamMember) ?? [],
        isLoading: !isLoaded,
        isError: false,
        error: null,
        refetch: async () => { },
    };
}
export function useGetTeamMemberById(_teamMemberId?: number, _options?: any) {
    const { data } = useDemo();
    const member = data?.teamMembers.find(m => m.id === _teamMemberId);
    return { data: member ? demoTeamMember(member) : undefined, isLoading: false, isError: false };
}
export function useGetTeamStats(_companyId?: number, _options?: any) {
    const { data, isLoaded } = useDemo();
    return {
        data: data?.teamStats ?? { total: 0, active: 0, suspended: 0, pending: 0 },
        isLoading: !isLoaded,
        isError: false,
        error: null,
    };
}
const noopMutation = () => ({
    mutateAsync: async (..._args: any[]) => ({}) as any,
    mutate: (_input?: unknown, _options?: {
        onSuccess?: (result: object) => void;
        onError?: (error: Error) => void;
        onSettled?: () => void;
    }) => { },
    isPending: false,
    isError: false,
});
export const useUpdateTeamMember = noopMutation;
export const useUpdateTeamMemberRole = noopMutation;
export const useUpdateAvatar = noopMutation;
export const useRemoveTeamMember = noopMutation;
export const useSuspendTeamMember = noopMutation;
export const useReactivateTeamMember = noopMutation;
export const useCreateTeamMember = noopMutation;
export const useInviteTeamMember = noopMutation;
export const useBulkInviteTeamMembers = noopMutation;
export function useGetPendingInvitations(_options?: any) {
    return { data: [], isLoading: false, isError: false };
}
export const useAcceptInvitation = noopMutation;
export const useAcceptInvitationByToken = noopMutation;
export const useResendInvitation = noopMutation;
export function useGetUserMemberships(_options?: any) {
    return { data: [], isLoading: false, isError: false };
}
