import { useArcWallet } from "@/contexts/ArcWalletProvider";
import React, { useEffect, useState } from "react";
import CompanyAvatar from "../Common/CompanyAvatar";
import { formatAddress } from "@/presentation/services/utils/address";
import { PrimaryButton } from "../Common/PrimaryButton";
import { toast } from "react-hot-toast";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
const useWallet = () => ({ address: null, connected: false, disconnect: async () => { }, requestSend: null, wallet: null });
type PaymentMethod = "crypto" | "card";
const CHAINS = [{ id: "arc", name: "Arc Testnet", icon: "/chain/arc.svg" }];
const TOKENS: Record<string, {id: string; symbol: string; icon: string}[]> = { arc: [{ id: "usdc", symbol: "USDC", icon: "/token/usdc.svg" }] };
interface PaymentLinkPreviewProps {
    recipient: string;
    recipientAvatar?: string | null;
    paymentWalletAddress: string;
    amount: string;
    title: string;
    description: string;
    selectedToken: AssetWithMetadata | null;
    handleSubmitPayment?: () => void;
    handleConnectWallet?: () => void;
    isSending?: boolean;
    chrome?: boolean;
}
export const PaymentLinkPreview = ({ recipient, recipientAvatar, paymentWalletAddress, amount, title, description, selectedToken, handleSubmitPayment, handleConnectWallet, isSending, chrome = false, }: PaymentLinkPreviewProps) => {
    const { address: paraAddress } = useArcPayment();
    const { address: adapterAddress } = useWallet();
    const { address: walletAddress } = useArcWallet();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("crypto");
    const [showMethodDropdown, setShowMethodDropdown] = useState(false);
    const [payChain, setPayChain] = useState(CHAINS[0]);
    const [payToken, setPayToken] = useState<{
        id: string;
        symbol: string;
        icon: string;
    }>({
        id: "usdt",
        symbol: "USDC",
        icon: "/token/usdc.svg",
    });
    const [showChainDropdown, setShowChainDropdown] = useState(false);
    const [showTokenDropdown, setShowTokenDropdown] = useState(false);
    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvc, setCardCvc] = useState("");
    const [cardName, setCardName] = useState("");
    const [isProcessingCard, setIsProcessingCard] = useState(false);
    const receiveTokenSymbol = selectedToken?.metadata?.symbol || "USDC";
    const receiveTokenIcon = `/token/${receiveTokenSymbol.toLowerCase()}.svg`;
    const displayAmount = amount ? parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
    useEffect(() => {
        setPayToken({ id: receiveTokenSymbol.toLowerCase(), symbol: receiveTokenSymbol, icon: receiveTokenIcon });
    }, [receiveTokenSymbol, receiveTokenIcon]);
    const slug = (title || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32) || "your-payment-link";
    const interactive = true;
    const handleChainSelect = (chain: typeof CHAINS[0]) => {
        setPayChain(chain);
        const tokens = TOKENS[chain.id] || TOKENS["ethereum"];
        setPayToken(tokens[0]);
        setShowChainDropdown(false);
    };
    const handleTokenSelect = (token: (typeof TOKENS)["ethereum"][0]) => {
        setPayToken(token);
        setShowTokenDropdown(false);
    };
    const availableTokens = TOKENS[payChain.id] || TOKENS["ethereum"];
    const formatCardNumber = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, 16);
        return digits.replace(/(.{4})/g, "$1 ").trim();
    };
    const formatExpiry = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, 4);
        if (digits.length >= 3)
            return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return digits;
    };
    const handleCardPay = async () => { toast.error("Card payments are not connected. Use USDC on Arc Testnet."); };
    const getCardBrand = (number: string): string => {
        const digits = number.replace(/\D/g, "");
        if (digits.startsWith("4"))
            return "Visa";
        if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits))
            return "Mastercard";
        if (/^3[47]/.test(digits))
            return "Amex";
        return "";
    };
    return (<div className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white text-[#161616]">
      
      {chrome && (<div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="flex shrink-0 gap-1.5">
            <span className="h-3 w-3 rounded-full bg-neutral-300"/>
            <span className="h-3 w-3 rounded-full bg-neutral-300"/>
            <span className="h-3 w-3 rounded-full bg-neutral-300"/>
          </div>
          <div className="mx-auto max-w-[60%] truncate whitespace-nowrap rounded-md bg-neutral-100 px-3 py-1 text-[12px] text-neutral-500">
            Settlbox / payment/{slug}
          </div>
        </div>)}

      
      <header className="flex items-center w-full justify-between gap-2 border-b border-neutral-200 px-5 py-3">
        <div className="flex flex-1 gap-2 items-center">
          <CompanyAvatar logo={recipientAvatar} companyName={recipient} size="w-[24px]" className="text-xs"/>
          <div className="flex flex-col">
            <span className="text-sm truncate text-text-primary leading-none">{recipient}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm truncate text-text-secondary leading-none">
                {formatAddress(paymentWalletAddress || "0x")}
              </span>
              <img src="/misc/copy-icon.svg" className="w-4 cursor-pointer" alt="copy icon" onClick={() => {
            navigator.clipboard.writeText(paymentWalletAddress || "");
            toast.success("Copied to clipboard");
        }}/>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full flex flex-row items-stretch gap-4 p-4">
        
        <div className="flex flex-1 flex-col gap-2.5">
          <span className="text-[12px] font-bold uppercase tracking-wide text-neutral-500">Pay with</span>

          
          <div className="relative">
            <div className={`h-[52px] rounded-xl border border-neutral-200 bg-white ${interactive ? "cursor-pointer" : ""}`} onClick={interactive ? () => { setShowMethodDropdown(!showMethodDropdown); setShowChainDropdown(false); setShowTokenDropdown(false); } : undefined}>
              <div className="flex items-center gap-2 px-4 py-2 h-full w-full">
                {paymentMethod === "crypto" ? (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <path d="M13 11.15H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 11.15V7.53C2 5.49 3.65 3.84 5.69 3.84H11.31C13.35 3.84 15 5.17 15 7.21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.48 12.2C16.98 12.68 16.74 13.42 16.94 14.18C17.19 15.11 18.11 15.7 19.07 15.7H20V17.15C20 19.36 18.21 21.15 16 21.15H6C3.79 21.15 2 19.36 2 17.15V10.15C2 7.94 3.79 6.15 6 6.15H16C17.83 6.15 20 7.95 20 10.15V11.6H18.92C18.36 11.6 17.85 11.82 17.48 12.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 12.62V14.88C22 15.44 21.54 15.9 20.97 15.9H19.04C17.96 15.9 16.97 15.12 16.88 14.04C16.82 13.41 17.06 12.82 17.48 12.4C17.85 12.02 18.36 11.8 18.92 11.8H20.97C21.54 11.8 22 12.26 22 12.62Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>) : (<svg width="28" height="28" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>)}
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-400 leading-none">Payment method</p>
                  <p className="mt-1 text-[14px] font-medium leading-none text-[#161616]">
                    {paymentMethod === "crypto" ? "Cryptocurrency" : "Credit / Debit Card"}
                  </p>
                </div>
                {interactive && (<img src="/arrow/chevron-down.svg" alt="dropdown" className={`w-6 h-6 transition-transform ${showMethodDropdown ? "rotate-180" : ""}`}/>)}
              </div>
            </div>

            {showMethodDropdown && (<div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary-divider rounded-xl shadow-lg z-20 overflow-hidden">
                <div className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors ${paymentMethod === "crypto" ? "bg-app-background" : "hover:bg-app-background"}`} onClick={() => { setPaymentMethod("crypto"); setShowMethodDropdown(false); }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 11.15H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 11.15V7.53C2 5.49 3.65 3.84 5.69 3.84H11.31C13.35 3.84 15 5.17 15 7.21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.48 12.2C16.98 12.68 16.74 13.42 16.94 14.18C17.19 15.11 18.11 15.7 19.07 15.7H20V17.15C20 19.36 18.21 21.15 16 21.15H6C3.79 21.15 2 19.36 2 17.15V10.15C2 7.94 3.79 6.15 6 6.15H16C17.83 6.15 20 7.95 20 10.15V11.6H18.92C18.36 11.6 17.85 11.82 17.48 12.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 12.62V14.88C22 15.44 21.54 15.9 20.97 15.9H19.04C17.96 15.9 16.97 15.12 16.88 14.04C16.82 13.41 17.06 12.82 17.48 12.4C17.85 12.02 18.36 11.8 18.92 11.8H20.97C21.54 11.8 22 12.26 22 12.62Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-text-primary text-sm flex-1">Cryptocurrency</span>
                  {paymentMethod === "crypto" && <img src="/misc/blue-check-icon.svg" alt="" className="w-4 h-4"/>}
                </div>
                <div className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors ${paymentMethod === "card" ? "bg-app-background" : "hover:bg-app-background"}`} onClick={() => { setPaymentMethod("card"); setShowMethodDropdown(false); }}>
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="text-text-primary text-sm flex-1">Credit / Debit Card</span>
                  {paymentMethod === "card" && <img src="/misc/blue-check-icon.svg" alt="" className="w-4 h-4"/>}
                </div>
              </div>)}
          </div>

          {paymentMethod === "crypto" ? (<>
              
              <div className="relative">
                <div className={`h-[52px] rounded-xl border border-neutral-200 bg-white ${interactive ? "cursor-pointer" : ""}`} onClick={interactive ? () => { setShowChainDropdown(!showChainDropdown); setShowTokenDropdown(false); } : undefined}>
                  <div className="flex items-center gap-2 px-4 py-2 h-full w-full">
                    <img src={payChain.icon} alt={payChain.name} className="w-7 h-7"/>
                    <div className="flex-1">
                      <p className="text-[11px] uppercase tracking-wide text-neutral-400 leading-none">Network</p>
                      <p className="mt-1 text-[14px] font-medium leading-none text-[#161616]">{payChain.name}</p>
                    </div>
                    {interactive && (<img src="/arrow/chevron-down.svg" alt="dropdown" className={`w-6 h-6 transition-transform ${showChainDropdown ? "rotate-180" : ""}`}/>)}
                  </div>
                </div>

                {showChainDropdown && (<div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary-divider rounded-xl shadow-lg z-20 overflow-hidden">
                    {CHAINS.map(chain => (<div key={chain.id} className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors ${chain.id === payChain.id ? "bg-app-background" : "hover:bg-app-background"}`} onClick={() => handleChainSelect(chain)}>
                        <img src={chain.icon} alt={chain.name} className="w-6 h-6"/>
                        <span className="text-text-primary text-sm flex-1">{chain.name}</span>
                        {chain.id === payChain.id && <img src="/misc/blue-check-icon.svg" alt="" className="w-4 h-4"/>}
                      </div>))}
                  </div>)}
              </div>

              
              <div className="relative">
                <div className={`h-[52px] rounded-xl border border-neutral-200 bg-white ${interactive ? "cursor-pointer" : ""}`} onClick={interactive ? () => { setShowTokenDropdown(!showTokenDropdown); setShowChainDropdown(false); } : undefined}>
                  <div className="flex items-center gap-2 px-4 py-2 h-full w-full">
                    <img src={payToken.icon} alt={payToken.symbol} className="w-7 h-7 rounded-full"/>
                    <div className="flex-1">
                      <p className="text-[11px] uppercase tracking-wide text-neutral-400 leading-none">Token</p>
                      <p className="mt-1 text-[14px] font-medium leading-none text-[#161616]">{payToken.symbol}</p>
                    </div>
                    {interactive && (<img src="/arrow/chevron-down.svg" alt="dropdown" className={`w-6 h-6 transition-transform ${showTokenDropdown ? "rotate-180" : ""}`}/>)}
                  </div>
                </div>

                {showTokenDropdown && (<div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary-divider rounded-xl shadow-lg z-20 overflow-hidden">
                    {availableTokens.map(token => (<div key={token.id} className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors ${token.id === payToken.id ? "bg-app-background" : "hover:bg-app-background"}`} onClick={() => handleTokenSelect(token)}>
                        <img src={token.icon} alt={token.symbol} className="w-6 h-6 rounded-full"/>
                        <span className="text-text-primary text-sm flex-1">{token.symbol}</span>
                        {token.id === payToken.id && <img src="/misc/blue-check-icon.svg" alt="" className="w-4 h-4"/>}
                      </div>))}
                  </div>)}
              </div>

              
              <div className="flex h-[52px] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4">
                <img src={payToken.icon} alt={payToken.symbol} className="h-7 w-7 shrink-0 rounded-full"/>
                <div className="flex flex-1 flex-col justify-center gap-0.5">
                  <label className="text-[11px] uppercase tracking-wide text-neutral-400">Amount</label>
                  <div className="flex items-center">
                    {chrome ? (<span className="w-full text-[14px] text-[#161616]">{amount || "0"}</span>) : (<input placeholder="Enter amount" value={amount || ""} className="w-full bg-transparent border-none outline-none text-[14px] text-text-primary placeholder:text-text-secondary" autoComplete="off" disabled={!!amount}/>)}
                    <span className="shrink-0 text-sm text-text-secondary">{payToken.symbol}</span>
                  </div>
                </div>
              </div>
              {amount && (<span className="text-text-secondary text-xs px-1">{"\u2248"} ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>)}

              
              <div className="mt-auto flex justify-center pt-1">
                {chrome ? (<PrimaryButton text="Pay now" buttonClassName="pointer-events-none h-[52px]"/>) : walletAddress && handleSubmitPayment ? (<PrimaryButton text="Pay now" onClick={handleSubmitPayment} loading={isSending}/>) : (<PrimaryButton text="Connect Wallet" onClick={() => handleConnectWallet?.()}/>)}
              </div>
            </>) : (<>
              
              <div className="h-[52px] rounded-xl border border-neutral-200 bg-white">
                <div className="flex h-full flex-col justify-center gap-0.5 px-4">
                  <label className="text-text-secondary text-sm font-medium">Card number</label>
                  <div className="flex items-center">
                    <input placeholder="1234 5678 9012 3456" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} className="w-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary" autoComplete="cc-number" inputMode="numeric"/>
                    {getCardBrand(cardNumber) && (<span className="text-text-secondary text-xs font-medium whitespace-nowrap">{getCardBrand(cardNumber)}</span>)}
                  </div>
                </div>
              </div>

              
              <div className="flex gap-2">
                <div className="h-[52px] rounded-xl border border-neutral-200 bg-white flex-1">
                  <div className="flex h-full flex-col justify-center gap-0.5 px-4">
                    <label className="text-text-secondary text-sm font-medium">Expiry</label>
                    <input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} className="w-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary" autoComplete="cc-exp" inputMode="numeric"/>
                  </div>
                </div>
                <div className="h-[52px] rounded-xl border border-neutral-200 bg-white flex-1">
                  <div className="flex h-full flex-col justify-center gap-0.5 px-4">
                    <label className="text-text-secondary text-sm font-medium">CVC</label>
                    <input placeholder="123" value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary" autoComplete="cc-csc" inputMode="numeric"/>
                  </div>
                </div>
              </div>

              
              <div className="h-[52px] rounded-xl border border-neutral-200 bg-white">
                <div className="flex h-full flex-col justify-center gap-0.5 px-4">
                  <label className="text-text-secondary text-sm font-medium">Cardholder name</label>
                  <input placeholder="John Doe" value={cardName} onChange={e => setCardName(e.target.value)} className="w-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary" autoComplete="cc-name"/>
                </div>
              </div>

              
              <div className="h-[52px] rounded-xl border border-neutral-200 bg-white">
                <div className="flex h-full flex-col justify-center gap-0.5 px-4">
                  <label className="text-[11px] uppercase tracking-wide text-neutral-400">Amount</label>
                  <div className="flex items-center">
                    <span className="text-text-primary flex-1">
                      {displayAmount ? `$${displayAmount}` : "$0.00"} USD
                    </span>
                  </div>
                </div>
              </div>

              
              <div className="flex items-center justify-center gap-1.5 py-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 1C3.24 1 1 3.24 1 6C1 8.76 3.24 11 6 11C8.76 11 11 8.76 11 6C11 3.24 8.76 1 6 1ZM6 10C3.79 10 2 8.21 2 6C2 3.79 3.79 2 6 2C8.21 2 10 3.79 10 6C10 8.21 8.21 10 6 10Z" fill="currentColor" opacity="0.3"/>
                  <path d="M5.5 4.5H6.5V8.5H5.5V4.5ZM5.5 3H6.5V4H5.5V3Z" fill="currentColor" opacity="0.3"/>
                </svg>
                <span className="text-text-secondary text-xs">Card payments are converted to stablecoin and delivered on-chain</span>
              </div>

              
              <div className="mt-auto flex justify-center pt-1">
                {chrome ? (<PrimaryButton text={displayAmount ? `Pay $${displayAmount}` : "Pay now"} buttonClassName="pointer-events-none"/>) : (<PrimaryButton text={displayAmount ? `Pay $${displayAmount}` : "Pay now"} onClick={handleCardPay} loading={isProcessingCard} disabled={!cardNumber || !cardExpiry || !cardCvc || !cardName}/>)}
              </div>
            </>)}
        </div>

        
        <div className="flex flex-1 flex-col gap-2.5">
          <span className="truncate text-[12px] font-bold uppercase tracking-wide text-neutral-500">
            {recipient} receives
          </span>

          
          <div className="flex items-center gap-2.5 h-[52px] rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
            <img src="/chain/arc.svg" alt="Arc Testnet" className="h-7 w-7 shrink-0"/>
            <div className="flex flex-1 flex-col">
              <span className="text-[11px] uppercase tracking-wide text-neutral-400 leading-none">Network</span>
              <span className="mt-1 text-[14px] font-medium leading-none text-[#161616]">Arc Testnet</span>
            </div>
            <img src="/misc/lock-icon.svg" alt="locked" className="h-3.5 w-3.5 opacity-40" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}/>
          </div>

          
          <div className="flex items-center gap-2.5 h-[52px] rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
            <img src={receiveTokenIcon} onError={(e) => { (e.target as HTMLImageElement).src = "/token/usdc.svg"; }} alt={receiveTokenSymbol} className="h-7 w-7 shrink-0"/>
            <div className="flex flex-1 flex-col">
              <span className="text-[11px] uppercase tracking-wide text-neutral-400 leading-none">Token</span>
              <span className="mt-1 text-[14px] font-medium leading-none text-[#161616]">{receiveTokenSymbol}</span>
            </div>
            <img src="/misc/lock-icon.svg" alt="locked" className="h-3.5 w-3.5 opacity-40" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}/>
          </div>

          
          <div className="flex items-center justify-between gap-2 h-[52px] rounded-xl border border-neutral-200 bg-white px-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-[13px] font-bold leading-none text-[#161616]">{title || "Enter title"}</span>
              <span className="truncate text-[12px] leading-none text-neutral-500">{description || "Description"}</span>
            </div>
            <span className="shrink-0 whitespace-nowrap text-[14px] font-semibold leading-none text-[#161616]">{amount || "0"} {receiveTokenSymbol}</span>
          </div>

          
          <div className="mt-auto flex h-[52px] items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
            <span className="shrink-0 whitespace-nowrap text-[11px] uppercase tracking-wide text-neutral-400">Total payable</span>
            <span className="whitespace-nowrap text-[16px] font-bold leading-none text-[#161616]">{amount || "0"} {receiveTokenSymbol}</span>
          </div>
        </div>
      </div>
    </div>);
};
