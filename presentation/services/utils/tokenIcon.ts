import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
const KNOWN_TOKEN_ICONS: Record<string, string> = {
    USDC: "/token/usdc.svg",
    ETH: "/token/eth.svg",
    BTC: "/token/btc.svg",
    STRK: "/token/strk.svg",
};
export function getTokenIcon(symbol?: string | null, address?: string | null): string {
    if (symbol && KNOWN_TOKEN_ICONS[symbol])
        return KNOWN_TOKEN_ICONS[symbol];
    if (address)
        return blo(identiconSeed(address));
    return "/token/any-token.svg";
}
