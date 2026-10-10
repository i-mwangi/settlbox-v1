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
export function useGetRequests() {
    return { data: { pending: [], accepted: [] }, isLoading: false, isError: false, refetch: async () => { } };
}
export const useCreatePendingRequest = noopMutation;
export const useAcceptRequest = noopMutation;
export const useDenyRequest = noopMutation;
export const useConfirmGroupPaymentRequest = noopMutation;
export { useGetRequests as default };
