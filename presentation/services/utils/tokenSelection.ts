import { AssetWithMetadata } from "@/presentation/types/faucet";
import { USDC_TOKEN_ADDRESS } from "./constant";
export const getDefaultSelectedToken = (assets: AssetWithMetadata[]): AssetWithMetadata => {
    if (assets.length === 0) {
        return {
            amount: "0",
            faucetId: USDC_TOKEN_ADDRESS,
            metadata: {
                symbol: "USDC",
                decimals: 8,
                maxSupply: 1000000,
            },
        };
    }
    const nonZeroAssets = assets.filter(asset => parseFloat(asset.amount) > 0);
    if (nonZeroAssets.length === 0) {
        return {
            faucetId: USDC_TOKEN_ADDRESS,
            amount: "0",
            metadata: {
                symbol: "USDC",
                decimals: 8,
                maxSupply: 1000000,
            },
        };
    }
    const highestBalanceAsset = nonZeroAssets.reduce((prev, current) => {
        return parseFloat(current.amount) > parseFloat(prev.amount) ? current : prev;
    });
    return {
        amount: highestBalanceAsset.amount,
        faucetId: highestBalanceAsset.faucetId,
        metadata: highestBalanceAsset.metadata,
    };
};
