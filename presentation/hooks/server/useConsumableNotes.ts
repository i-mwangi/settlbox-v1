import { getConsumable as getConsumableNotesFromServer } from "@/presentation/services/api/transaction";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWalletAuth } from "./useWalletAuth";
import { getConsumableNotes } from "@/presentation/services/unsupported/note";
import { getFaucetMetadata } from "@/presentation/services/utils/arc-token";
import { AssetWithMetadata, PartialConsumableNote } from "@/presentation/types/faucet";
import { ConsumableNote } from "@/presentation/types/transaction";
import { useArcNetworkStore } from "@/presentation/contexts/ArcNetworkProvider";
export function useConsumableNotes() {
    const { walletAddress } = useWalletAuth();
    const queryClient = useQueryClient();
    const blockNum = useArcNetworkStore(state => state.blockNum);
    const { data, isLoading, error, refetch, isRefetching } = useQuery({
        queryKey: ["consumable-notes", walletAddress],
        queryFn: async (): Promise<PartialConsumableNote[]> => {
            return [];
        },
        enabled: !!walletAddress,
        staleTime: 1000,
        gcTime: 5 * 60 * 1000,
        refetchInterval: 25000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });
    const forceFetch = async () => {
        for (let i = 0; i < 5; i++) {
            queryClient.invalidateQueries({ queryKey: ["consumable-notes", walletAddress] });
            await refetch();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    };
    return {
        data,
        isLoading,
        isRefetching,
        error,
        refetch,
        forceFetch,
    };
}
