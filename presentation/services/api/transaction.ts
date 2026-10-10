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
export const getConsumable = async () => ({ consumableTxs: [], recallableTxs: [] });
export const getRecallable = async () => ({ data: [] });
export const sendSingleTransaction = async (..._args: unknown[]) => ({});
export const sendBatchTransaction = async (..._args: unknown[]): Promise<{
    id: string;
    transactionId: string;
}[]> => [];
export const consumeTransactions = async (..._args: unknown[]) => ({});
export const consumePublicTransactions = async () => ({});
export const useConsumePublicNotes = noopMutation;
export const useRecallBatch = noopMutation;
export function useTopInteractedWallets() {
    return { data: [], isLoading: false, isError: false };
}
