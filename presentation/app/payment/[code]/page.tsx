"use client";
import { useParams } from "next/navigation";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import type { TransactionHash } from "@/types/finance";
import React, { useState, useEffect } from "react";
import { useGetPaymentLinkByCode, useRecordPayment } from "@/presentation/services/api/payment-link";
import { formatAddress } from "@/presentation/services/utils/address";
import toast from "react-hot-toast";
import { PaymentLinkStatus } from "@/presentation/types/dto/payment-link";
import { MODAL_IDS } from "@/presentation/types/modal";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { importAndGetAccount } from "@/presentation/services/unsupported/account";
import { PaymentLinkPreview } from "@/presentation/components/PaymentLink/PaymentLinkPreview";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
const useWallet = () => ({ address: null as string | null, connected: false, disconnect: async () => { }, requestSend: null as any, wallet: null });
class SendTransaction {
    constructor(..._args: any[]) { }
}
import { USDC_TOKEN_ADDRESS, USDC_TOKEN_DECIMALS } from "@/presentation/services/utils/constant";
const Header = () => {
    const { address: paraAddress, openModal: openParaModal, logoutAsync } = useArcPayment();
    const { address: adapterAddress, disconnect: adapterDisconnect } = useWallet();
    const { openModal } = useModal();
    const walletAddress = paraAddress || adapterAddress;
    const handleWalletClick = () => {
        if (paraAddress) {
            openParaModal?.();
        }
        else if (adapterAddress) {
            openModal(MODAL_IDS.PORTFOLIO);
        }
    };
    const handleDisconnect = async () => {
        if (paraAddress) {
            await logoutAsync();
        }
        else if (adapterAddress && adapterDisconnect) {
            await adapterDisconnect();
        }
    };
    return (<div className="w-full flex justify-between items-center p-2 pt-1">
      <div className="flex items-center justify-center">
        <img src="/logo/settlbox-icon.svg" alt="Settlbox Logo"/>
        <img src="/logo/settlbox-wordmark.svg" alt="Settlbox Logo" className="w-12" style={{ transition: "width 200ms ease" }}/>
      </div>
    </div>);
};
const PaymentSuccess = ({ amount, tokenSymbol, recipientName }: {
    amount: string;
    tokenSymbol: string;
    recipientName: string;
}) => {
    return (<div className="flex flex-col w-full h-full justify-center items-center gap-4">
      <img src="/modal/green-circle-check.gif" alt="Payment Success" className="w-20"/>
      <h2 className="text-4xl font-semibold text-text-primary">Payment successful</h2>
      <p className="text-base text-text-secondary text-center max-w-[400px]">
        You have successfully sent {amount} {tokenSymbol} to {recipientName}.
      </p>
    </div>);
};
const PaymentLinkDetailPage = () => {
    const params = useParams();
    const code = params.code as string;
    const wallet = useArcWallet();
    const walletAddress = wallet.address;
    const { data: paymentLink, isLoading, error } = useGetPaymentLinkByCode(code);
    const recordPaymentMutation = useRecordPayment();
    const { openModal, closeModal } = useModal();
    const [isSending, setIsSending] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState<{
        amount: string;
        tokenSymbol: string;
        recipientName: string;
        transactionHash?: string;
    } | null>(null);
    const [pendingHash, setPendingHash] = useState<TransactionHash | null>(null);
    useEffect(() => {
        const saved = sessionStorage.getItem(`settlbox-link-payment:${code}`);
        if (saved && /^0x[0-9a-f]{64}$/i.test(saved)) setPendingHash(saved as TransactionHash);
    }, [code]);
    const handleSubmitPayment = async () => {
        if (!paymentLink) return;
        if (!walletAddress && !pendingHash) return toast.error("Connect your Arc wallet first");
        setIsSending(true);
        try {
            const hash = pendingHash || await wallet.sendUsdc(paymentLink.paymentWalletAddress, paymentLink.amount);
            setPendingHash(hash);
            sessionStorage.setItem(`settlbox-link-payment:${code}`, hash);
            await recordPaymentMutation.mutateAsync({ code, data: { txid: hash } });
            sessionStorage.removeItem(`settlbox-link-payment:${code}`);
            setPaymentSuccess({ amount: paymentLink.amount, tokenSymbol: "USDC", recipientName: paymentLink.title, transactionHash: hash });
        } catch (error) { toast.error(error instanceof Error ? error.message : "Payment is pending. Retry verification before sending again."); }
        finally { setIsSending(false); }
    };
    const confirmedPayment = paymentSuccess || (paymentLink?.settlement?.status === "confirmed" ? {
        amount: paymentLink.amount, tokenSymbol: "USDC", recipientName: paymentLink.title,
        transactionHash: paymentLink.settlement.transactionHash,
    } : null);
    // Query invalidation closes single-use links immediately after verification.
    // A verified receipt must take precedence over the closed-link screen.
    if (confirmedPayment) {
        return <div className="flex flex-col w-full h-full bg-app-background p-2"><Header /><div className="flex flex-col w-full h-screen p-4 items-center justify-start gap-10 bg-background rounded-lg"><PaymentSuccess {...confirmedPayment}/></div></div>;
    }
    if (isLoading) {
        return (<div className="flex flex-col w-full h-full items-center justify-center">
        <img src="/loading-square.gif" alt="loading" className="w-12 h-12"/>
      </div>);
    }
    if (error || !paymentLink || paymentLink.status === PaymentLinkStatus.DEACTIVATED) {
        return (<div className="flex flex-col w-full h-full bg-app-background p-2 gap-2">
        <Header />

        <div className="w-full h-full relative flex justify-center items-center flex-col rounded-lg" style={{
                background: "linear-gradient(180deg, #D7D7D7 0%, #FFF 60.33%)",
            }}>
          <div className="w-fit h-fit relative flex justify-center items-center flex-col gap-4 z-2">
            <span className="text-text-primary text-7xl font-bold anton-regular leading-none uppercase">
              {error ? "Unable to load this payment link" : !paymentLink ? "Payment link not found" : "This payment link is closed"}
            </span>
            <span className="text-text-primary text-lg">
              {error ? "We could not check its status. Reload to try again; do not send another payment if you already signed." : "This checkout is unavailable. Contact the creator if you need assistance."}
            </span>
          </div>
          {error && <button className="mt-4 rounded-lg border px-4 py-2" onClick={() => window.location.reload()}>Retry loading</button>}
        </div>

        <img src="/gift/background-settlbox-text.svg" alt="Settlbox background" className="w-[1050px] absolute top-100 left-1/2 -translate-x-1/2 -translate-y-1/2 z-1"/>
      </div>);
    }
    return (<div className="flex flex-col w-full h-full bg-app-background p-2">
      <Header />

      <div className="flex flex-col w-full h-screen p-4 items-center justify-start gap-10 bg-background rounded-lg">
            
            <div className="w-full flex flex-row gap-2 px-7 items-center justify-start">
              <img src="/misc/star-icon.svg" alt="Payment Link"/>
              <h1 className="text-2xl font-bold">Payment Link</h1>
            </div>

            <div className="flex flex-col gap-5 py-5 w-[80%]">
              <PaymentLinkPreview recipient={(paymentLink as any).company?.companyName || (paymentLink as any).recipientName || ""} recipientAvatar={(paymentLink as any).company?.companyLogo || null} paymentWalletAddress={(paymentLink as any).paymentWalletAddress || (paymentLink as any).recipientAddress || ""} amount={paymentLink.amount} title={paymentLink.title} description={paymentLink.description} selectedToken={paymentLink.acceptedTokens?.[0]
                ? {
                    faucetId: paymentLink.acceptedTokens?.[0]?.address || "",
                    metadata: {
                        symbol: paymentLink.acceptedTokens?.[0]?.symbol || "",
                        decimals: paymentLink.acceptedTokens?.[0]?.decimals || 6,
                        maxSupply: 0,
                    },
                    amount: "0",
                }
                : null} handleConnectWallet={() => { void wallet.connect().catch(error => toast.error(error instanceof Error ? error.message : "Wallet connection failed")); }} handleSubmitPayment={handleSubmitPayment} isSending={isSending}/>
            </div>
      </div>
    </div>);
};
export default PaymentLinkDetailPage;
