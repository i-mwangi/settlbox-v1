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
export function useGetSchedulePayments(_query?: any) {
    return { data: [], isLoading: false, isError: false, refetch: async () => { } };
}
export function useGetSchedulePaymentById(_id?: number) {
    return { data: null, isLoading: false, isError: false };
}
export const useCreateSchedulePayment = noopMutation;
export const useUpdateSchedulePayment = noopMutation;
export const usePauseSchedulePayment = noopMutation;
export const useResumeSchedulePayment = noopMutation;
export const useCancelSchedulePayment = noopMutation;
export const useDeleteSchedulePayment = noopMutation;
export { useGetSchedulePayments as default };
