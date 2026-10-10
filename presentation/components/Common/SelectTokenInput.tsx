import React from "react";
import { blo } from "blo";
import { formatUnits } from "viem";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { MODAL_IDS } from "@/presentation/types/modal";
import { identiconSeed } from "@/services/arc/identicon";
import { AnyToken, AssetWithMetadata } from "@/presentation/types/faucet";
import { formatNumberWithCommas } from "@/presentation/services/utils/formatNumber";
import { USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
interface SelectTokenInputProps {
    selectedToken: AssetWithMetadata | null;
    onTokenSelect: (token: AssetWithMetadata) => void;
    tokenAddress?: string;
    disabled?: boolean;
}
export const SelectTokenInput: React.FC<SelectTokenInputProps> = ({ selectedToken, onTokenSelect, tokenAddress, disabled = false, }) => {
    const { openModal } = useModal();
    const token = selectedToken || AnyToken;
    return (<div className="flex items-center justify-between p-0.5 pl-2 rounded-[10px] bg-app-background text-sm leading-none gap-10">
      <span className="text-text-primary">
        {formatNumberWithCommas(formatUnits(BigInt(Math.round(Number(token.amount))), token.metadata.decimals))}
      </span>
      <button type="button" className="flex flex-col justify-center rounded-[10px] bg-background py-1.5 px-1 transition-colors outline-none border-b-1 border-primary-divider" disabled={disabled}>
        <div className="flex gap-1 items-center cursor-pointer" onClick={() => {
            openModal(MODAL_IDS.SELECT_TOKEN, { onTokenSelect });
        }}>
          <img src={token.faucetId === USDC_TOKEN_ADDRESS ? "/token/usdc.svg" : blo(identiconSeed(token.faucetId))} alt={token.metadata.symbol} className="w-5 h-5 rounded-full"/>
          <span className="text-text-primary">{token.metadata.symbol}</span>
          <img src="/arrow/filled-arrow-down.svg" alt="Dropdown arrow" className="w-3" style={{
            filter: "brightness(0)",
        }}/>
        </div>
      </button>
    </div>);
};
