import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWalletAuth } from "./useWalletAuth";
import { STALE_TIME } from "@/presentation/services/utils/constant";
export function useRecallableNotes() {
    const queryClient = useQueryClient();
    const { walletAddress } = useWalletAuth();
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["recallable-notes", walletAddress],
        queryFn: async (): Promise<any> => {
            return [];
        },
        enabled: !!walletAddress,
        staleTime: STALE_TIME,
        gcTime: 5 * 60 * 1000,
        refetchInterval: 25000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });
    const forceFetch = async () => {
        for (let i = 0; i < 3; i++) {
            queryClient.invalidateQueries({ queryKey: ["recallable-notes", walletAddress] });
            await refetch();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    };
    return {
        data,
        isLoading,
        error,
        refetch,
        forceFetch,
    };
}
