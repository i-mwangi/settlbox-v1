export const PUBLIC_ROUTES = ["/login", "/onboarding", "/payment", "/invoice-review", "/mobile", "/team-invite"];
export const TOUR_SKIPPED_KEY = "tour_skipped";
export const BALANCE_VISIBILITY_KEY = "balance_visibility";
export const WALLET_ADDRESSES_KEY = "settlbox-wallet-addresses";
export const LAST_CONNECTED_KEY = "settlbox-last-connected-address";
export const QR_STORAGE_KEY = "custom_qr_codes";
export const USDC_TOKEN_ADDRESS = "native-usdc";
export const USDC_TOKEN_HEX_ADDRESS = "0x3600000000000000000000000000000000000000";
export const USDC_TOKEN_SYMBOL = "USDC";
export const USDC_TOKEN_DECIMALS = 18;
export const USDC_TOKEN_MAX_SUPPLY = 1000000000000000000;
export function normalizeTokenSymbol(symbol: string | undefined | null): string {
    if (!symbol)
        return "USDC";
    return symbol.toUpperCase() === "USDC" ? "USDC" : symbol;
}
export const BLOCK_TIME = 5;
export const NODE_ENDPOINT = process.env.NEXT_PUBLIC_NODE_ENDPOINT || "https://rpc.testnet.arc.io";
export const REFETCH_DELAY = 6000;
export const SYNC_STATE_INTERVAL = 3000;
export const ARC_EXPLORER_URL = "https://explorer.testnet.arc.io";
export const PSM_ENDPOINT = "";
export const PSM_SYNC_INTERVAL = 15000;
export const ARC_NETWORK_ID = "5042002";
export const AUTH_EXPIRATION_HOURS = 720;
export const AUTH_REFRESH_INTERVAL = 30 * 60 * 1000;
export const BUTTON_STYLES = {
    width: "100%",
    padding: "12px 16px",
    fontSize: "16px",
    fontWeight: "500",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    transition: "background-color 0.2s",
    textAlign: "center" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
};
export const STALE_TIME = 1000 * 60 * 5;
export const DEFAULT_AVATAR_ADDRESS = "0x44d6cAAC62A593A53931E2DB6124c9045f78345c";

