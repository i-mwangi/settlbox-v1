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
export function useGetAllGroups() {
    return { data: [], isLoading: false, isError: false };
}
export function useGetGroupPayments(_groupId?: number) {
    return { data: { payments: [] }, isLoading: false, isError: false };
}
export function useGetPaymentByLink(_code?: string) {
    return { data: null, isLoading: false, isError: false };
}
export const useCreateGroup = noopMutation;
export const useCreateDefaultGroup = noopMutation;
export const useCreateGroupPayment = noopMutation;
export const useCreateQuickSharePayment = noopMutation;
export const useUpdateGroup = noopMutation;
export const useDeleteGroup = noopMutation;
export const useAddMemberToQuickShare = noopMutation;
