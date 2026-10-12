"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { PrimaryButton } from "../Common/PrimaryButton";

import FieldInput from "@/presentation/components/Common/Input/FieldInput";

import InvoicePreview from "../Common/Invoice/InvoicePreview";

import { useInvoice } from "@/presentation/hooks/server/useInvoice";

import { useSearchParams } from "next/navigation";

import toast from "react-hot-toast";

import { useAuth } from "@/presentation/services/auth/context";

import { useRouter } from "next/navigation";

import { useModal } from "@/presentation/contexts/ModalManagerProvider";

import { ConfirmAndReviewInvoiceModalProps, MODAL_IDS } from "@/presentation/types/modal";

import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";

import { blo } from "blo";

import { identiconSeed } from "@/services/arc/identicon";

import { getTokenIcon } from "@/presentation/services/utils/tokenIcon";

import { AssetWithMetadata } from "@/presentation/types/faucet";

import { USDC_TOKEN_ADDRESS, USDC_TOKEN_DECIMALS, USDC_TOKEN_MAX_SUPPLY, USDC_TOKEN_SYMBOL, } from "@/presentation/services/utils/constant";

import { importAndGetAccount } from "@/presentation/services/unsupported/account";

import { TransactionOverviewModalProps } from "@/presentation/types/modal";

import { confirmB2BInvoice, getB2BInvoiceByUUID, getB2BInvoiceByUUIDPublic } from "@/presentation/services/api/invoice";

import { formatAddress } from "@/presentation/services/utils/address";

import { useDemo } from "@/presentation/contexts/DemoProvider";


type PaymentMethod = "crypto" | "card";

export interface InvoiceItem {

    description: string;

    qty: number;

    price: number;

    amount: number;

    currency: string;

}

export interface InvoiceData {

    invoiceNumber: string;

    date: string;

    dueDate: string;

    logo?: string | null;

    from: {

        name: string;

        email: string;

        company: string;

        address: string;

        network: string;

        token: string;

        walletAddress: string;

    };

    billTo: {

        name: string;

        email: string;

        company: string;

        address: string;

    };

    note?: string;

    items: InvoiceItem[];

    subtotal: number;

    total: number;

    amountDue: number;

    currency: string;

    status: string;

}

const Header = () => {

    return (<div className="w-full flex justify-between items-center p-2 pt-1">

      <div className="flex items-center justify-center">

        <img src="/logo/settlbox-icon.svg" alt="Settlbox Logo"/>

        <img src="/logo/settlbox-wordmark.svg" alt="Settlbox Logo" className="w-12" style={{ transition: "width 200ms ease" }}/>

      </div>



      <div className="flex items-center justify-center gap-3">

        <span className="text-text-secondary text-sm">Powered by Settlbox</span>

      </div>

    </div>);

};

export const ClientInvoiceReviewContainer = () => {

    const { openModal, closeModal } = useModal();

    const searchParams = useSearchParams();

    const invoiceUUID = searchParams.get("uuid") || searchParams.get("id") || "";

    const { address: walletAddress, openModal: openParaModal, client } = useArcPayment();

    const { data: demoData } = useDemo();

    const invoiceSettings = demoData?.invoiceSettings;

    const [processingPayment, setProcessingPayment] = useState(false);

    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

    const [selectedNetwork, setSelectedNetwork] = useState<{

        icon: string;

        name: string;

        value: string;

    } | null>(null);

    const [selectedToken, setSelectedToken] = useState<AssetWithMetadata | null>(null);

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("crypto");

    const [showMethodDropdown, setShowMethodDropdown] = useState(false);

    const [cardNumber, setCardNumber] = useState("");

    const [cardExpiry, setCardExpiry] = useState("");

    const [cardCvc, setCardCvc] = useState("");

    const [cardName, setCardName] = useState("");

    const [isProcessingCard, setIsProcessingCard] = useState(false);

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

    const handleCardPay = async () => {
        toast.error("Card payments require a configured payment provider");
    };
    const { isLoading, error, fetchInvoiceByUUID, confirmInvoiceData, downloadPdf } = useInvoice();

    const mapNetworkToOption = (network: any) => {

        const name = network?.name || "Arc Testnet";

        const lname = name.toLowerCase();

        let icon = "/chain/arc.svg";

        let value = "5042002";

        if (lname.includes("ethereum")) {

            icon = "/chain/ethereum.svg";

            value = "eth";

        }

        else if (lname.includes("arc")) {

            icon = "/chain/arc.svg";

            value = "5042002";

        }

        else if (lname.includes("sol")) {

            icon = "/chain/solana.svg";

            value = "sol";

        }

        else if (lname.includes("bnb") || lname.includes("bsc")) {

            icon = "/chain/bnb.svg";

            value = "bnb";

        }

        else if (lname.includes("base")) {

            icon = "/chain/base.svg";

            value = "base";

        }

        return { icon, name, value };

    };

    const makeAssetFromPaymentToken = (token: any): AssetWithMetadata => {

        if (!token) {

            return {

                amount: "0",

                faucetId: USDC_TOKEN_ADDRESS,

                metadata: {

                    symbol: USDC_TOKEN_SYMBOL,

                    decimals: USDC_TOKEN_DECIMALS,

                    maxSupply: USDC_TOKEN_MAX_SUPPLY,

                },

            };

        }

        const faucetId = token.address || token.faucetId || USDC_TOKEN_ADDRESS;

        const symbol = token.symbol || token.name || USDC_TOKEN_SYMBOL;

        const decimals = typeof token.decimals === "number" ? token.decimals : parseInt(token.decimals || String(USDC_TOKEN_DECIMALS), 10);

        return {

            amount: "0",

            faucetId,

            metadata: {

                symbol,

                decimals,

                maxSupply: USDC_TOKEN_MAX_SUPPLY,

            },

        };

    };

    useEffect(() => {

        if (!invoiceUUID)

            return;

        loadInvoice();

    }, [invoiceUUID]);

    const loadInvoice = async () => {

        try {

            const data = await getB2BInvoiceByUUIDPublic(invoiceUUID);

            if (!data)

                return;

            const mappedData = mapApiResponseToInvoiceData(data);

            setInvoiceData(mappedData);

            if (data?.paymentNetwork) {

                setSelectedNetwork(mapNetworkToOption(data.paymentNetwork));

            }

            if (data?.paymentToken) {

                setSelectedToken(makeAssetFromPaymentToken(data.paymentToken));

            }

            else if (mappedData?.from?.token) {

                setSelectedToken(makeAssetFromPaymentToken({ symbol: mappedData.from.token }));

            }

        }

        catch (err) {

            console.error("Failed to load invoice:", err);

        }

    };

    const mapApiResponseToInvoiceData = (apiData: any): InvoiceData => {

        const invoiceNumber = apiData.invoiceNumber;

        const fromDetails = apiData.fromDetails || {};

        const fromCompany = apiData.fromCompany || {};

        const toDetails = apiData.toDetails || {};

        const paymentNetwork = apiData.paymentNetwork || {};

        const paymentToken = apiData.paymentToken || {};

        const fromAddress = [fromDetails.address1, fromDetails.address2, fromDetails.city, fromDetails.state, fromDetails.postalCode]

            .filter(Boolean)

            .join(", ") ||

            [fromCompany.address1, fromCompany.address2, fromCompany.city, fromCompany.postalCode].filter(Boolean).join(", ");

        const toAddress = [toDetails.address, toDetails.city, toDetails.country, toDetails.postalCode]

            .filter(Boolean)

            .join(", ");

        return {

            invoiceNumber: invoiceNumber,

            date: apiData.issueDate ? new Date(apiData.issueDate).toLocaleDateString() : "",

            dueDate: apiData.dueDate ? new Date(apiData.dueDate).toLocaleDateString() : "",

            logo: invoiceSettings?.logo || fromCompany.logo || demoData?.company?.logo || null,

            from: {

                name: fromDetails.contactName || fromCompany.companyName || "",

                email: fromDetails.email || apiData.emailTo || "",

                company: fromDetails.companyName || fromCompany.companyName || "",

                address: fromAddress,

                network: paymentNetwork.name || "Ethereum",

                token: paymentToken.symbol || "USD",

                walletAddress: apiData.paymentWalletAddress || "",

            },

            billTo: {

                name: toDetails.contactName || apiData.toCompanyName || "",

                email: toDetails.email || apiData.toCompanyEmail || apiData.emailTo || "",

                company: toDetails.companyName || apiData.toCompanyName || "",

                address: toAddress,

            },

            items: (apiData.items || []).map((item: any) => ({

                description: item.description || "",

                qty: parseFloat(item.quantity || "1"),

                price: parseFloat(item.unitPrice || "0"),

                amount: parseFloat(item.total || "0"),

                currency: apiData.currency || "USD",

            })),

            subtotal: parseFloat(apiData.subtotal || "0"),

            total: parseFloat(apiData.total || "0"),

            amountDue: parseFloat(apiData.total || "0"),

            currency: apiData.currency || "USD",

            status: apiData.status,

        };

    };

    const handleDownloadPdf = async () => {

        try {

            const blob = await downloadPdf(invoiceUUID);

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;

            link.download = `invoice-${invoiceData?.invoiceNumber}.pdf`;

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);

        }

        catch (err) {

            console.error("Failed to download PDF:", err);

        }

    };

    const handleConfirmInvoice = async () => {

        if (invoiceData && !invoiceData.from.address) {

            toast.error("Please update the address before confirming the invoice");

            return;

        }

        try {

            openModal<ConfirmAndReviewInvoiceModalProps>("CONFIRM_AND_REVIEW_INVOICE", {

                onConfirm: async () => {

                    await confirmInvoiceData(invoiceUUID);

                    closeModal("CONFIRM_AND_REVIEW_INVOICE");

                    toast.success("Invoice confirmed successfully");

                    loadInvoice();

                },

            });

        }

        catch (err) {

            console.error("Failed to confirm invoice:", err);

        }

    };

    const handlePayNow = async () => {

        throw new Error("This action is unavailable in the demo workspace.");

    };

    if (isLoading) {

        return (<div className="flex flex-col w-full h-full items-center justify-center">

        <img src="/loading-square.gif" alt="loading" className="w-12 h-12"/>

      </div>);

    }

    if (error || !invoiceData || invoiceData.status === "DELETED") {

        return (<div className="flex flex-col w-full h-full bg-app-background p-2 gap-2">

        <Header />

        <div className="w-full h-full relative flex justify-center items-center flex-col rounded-lg" style={{

                background: "linear-gradient(180deg, #D7D7D7 0%, #FFF 60.33%)",

            }}>

          <div className="w-fit h-fit relative flex justify-center items-center flex-col gap-4 z-2">

            <span className="text-text-primary text-7xl font-bold anton-regular leading-none uppercase">

              Oops, this invoice isn’t available anymore.

            </span>

            <span className="text-text-primary text-lg">

              Looks like the employer has deleted the invoice. You can reach out to your employer if anything wrong.

            </span>

          </div>

        </div>



        <img src="/gift/background-settlbox-text.svg" alt="Settlbox background" className="w-[1050px] absolute top-100 left-1/2 -translate-x-1/2 -translate-y-1/2 z-1"/>

      </div>);

    }

    return (<div className="flex flex-col w-full h-full bg-app-background p-2" style={{ ["--invoice-accent" as any]: invoiceSettings?.accentColor || "#194BFA" }}>

      <Header />



      <div className="flex flex-col w-full flex-1 items-center justify-start bg-background rounded-lg overflow-y-auto">

        

        <div className="w-full flex flex-row gap-2 px-7 pt-6 items-center justify-start">

          <img src="/misc/star-icon.svg" alt="Invoice"/>

          <h1 className="text-2xl font-bold">Invoice Link</h1>

        </div>



        

        <div className="w-full flex flex-col">

          <div className="w-full flex flex-row py-4 px-30">

            

            <div className="flex-2/5 flex flex-col gap-4">

              

              <div className="flex flex-col gap-2 mb-4">

                <p className="font-barlow font-medium text-[32px] text-text-primary">Pay with</p>

                <p className="font-barlow font-medium text-[16px] text-text-secondary">

                  Pay in your preferred chain and currency

                </p>

              </div>



              

              <div className="border border-primary-divider rounded-2xl p-8 flex flex-col gap-6">

                

                <div className="relative">

                  <div className="bg-background rounded-lg border border-primary-divider cursor-pointer" onClick={() => setShowMethodDropdown(!showMethodDropdown)}>

                    <div className="flex items-center gap-3 px-4 py-3 h-16 w-full">

                      {paymentMethod === "crypto" ? (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">

                          <path d="M13 11.15H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>

                          <path d="M2 11.15V7.53C2 5.49 3.65 3.84 5.69 3.84H11.31C13.35 3.84 15 5.17 15 7.21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>

                          <path d="M17.48 12.2C16.98 12.68 16.74 13.42 16.94 14.18C17.19 15.11 18.11 15.7 19.07 15.7H20V17.15C20 19.36 18.21 21.15 16 21.15H6C3.79 21.15 2 19.36 2 17.15V10.15C2 7.94 3.79 6.15 6 6.15H16C17.83 6.15 20 7.95 20 10.15V11.6H18.92C18.36 11.6 17.85 11.82 17.48 12.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>

                          <path d="M22 12.62V14.88C22 15.44 21.54 15.9 20.97 15.9H19.04C17.96 15.9 16.97 15.12 16.88 14.04C16.82 13.41 17.06 12.82 17.48 12.4C17.85 12.02 18.36 11.8 18.92 11.8H20.97C21.54 11.8 22 12.26 22 12.62Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>

                        </svg>) : (<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">

                          <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>

                          <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.5"/>

                          <path d="M4 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>

                        </svg>)}

                      <div className="flex-1">

                        <p className="text-text-secondary text-sm">Payment method</p>

                        <p className="text-text-primary text-base font-medium">

                          {paymentMethod === "crypto" ? "Cryptocurrency" : "Credit / Debit Card"}

                        </p>

                      </div>

                      <img src="/arrow/chevron-down.svg" alt="dropdown" className={`w-6 h-6 transition-transform ${showMethodDropdown ? "rotate-180" : ""}`}/>

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

                    

                    <div className="flex flex-col gap-2">

                      <button type="button" onClick={() => openModal(MODAL_IDS.SELECT_NETWORK, { onNetworkSelect: setSelectedNetwork })} className="flex items-center gap-3 px-4 py-3 h-16 w-full text-left cursor-pointer bg-background rounded-lg border border-primary-divider">

                        {selectedNetwork && <img src={selectedNetwork.icon} alt="network" className="w-8 h-8"/>}

                        <div className="flex-1">

                          <p className="text-text-secondary text-sm">Select network</p>

                          <p className="text-text-primary text-base font-medium">{selectedNetwork?.name || "Network"}</p>

                        </div>

                        <img src="/arrow/chevron-down.svg" alt="dropdown" className="w-6 h-6"/>

                      </button>

                    </div>



                    

                    <div className="flex flex-col gap-2">

                      <button type="button" onClick={() => openModal(MODAL_IDS.SELECT_TOKEN, { onTokenSelect: setSelectedToken })} className="flex items-center gap-3 px-4 py-3 h-16 w-full text-left cursor-pointer bg-background rounded-lg border border-primary-divider">

                        {selectedToken && (<img src={getTokenIcon(selectedToken.metadata.symbol, selectedToken.faucetId)} alt="token" className="w-8 h-8 rounded-full"/>)}

                        <div className="flex-1">

                          <p className="text-text-secondary text-sm">Select token</p>

                          <p className="text-text-primary text-base font-medium">

                            {selectedToken?.metadata.symbol || "Token"}

                          </p>

                        </div>

                        <img src="/arrow/chevron-down.svg" alt="dropdown" className="w-6 h-6"/>

                      </button>

                    </div>



                    

                    <div className="flex flex-col gap-2">

                      <div className="flex items-center justify-between px-4 py-3 h-16 w-full bg-background rounded-lg border border-primary-divider">

                        <div className="flex-1">

                          <p className="text-text-secondary text-sm leading-none mb-1">Total Amount</p>

                          <p className="text-text-primary text-base font-medium">{invoiceData?.total || "0"}</p>

                        </div>

                        <div className="flex items-center gap-3">

                          <p className="text-text-primary text-base font-medium">

                            {selectedToken?.metadata.symbol || invoiceData?.currency}

                          </p>

                        </div>

                      </div>

                    </div>



                    

                    {walletAddress ? (<PrimaryButton text="Pay now" onClick={handlePayNow} containerClassName="w-full" disabled={!selectedNetwork || !selectedToken || processingPayment} loading={processingPayment}/>) : (<PrimaryButton text="Connect Wallet" onClick={openParaModal} containerClassName="w-full"/>)}

                  </>) : (<>

                    

                    <div className="relative">

                      <FieldInput label="Card number" placeholder="1234 5678 9012 3456" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} className="pr-20" autoComplete="cc-number" inputMode="numeric"/>

                      {getCardBrand(cardNumber) && (<span className="pointer-events-none absolute bottom-0 right-3.5 flex h-[46px] items-center text-text-secondary text-xs font-medium whitespace-nowrap">

                          {getCardBrand(cardNumber)}

                        </span>)}

                    </div>



                    

                    <div className="flex gap-2">

                      <FieldInput containerClassName="flex-1" label="Expiry" placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} autoComplete="cc-exp" inputMode="numeric"/>

                      <FieldInput containerClassName="flex-1" label="CVC" placeholder="123" value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} autoComplete="cc-csc" inputMode="numeric"/>

                    </div>



                    

                    <FieldInput label="Cardholder name" placeholder="John Doe" value={cardName} onChange={e => setCardName(e.target.value)} autoComplete="cc-name"/>



                    

                    <div className="bg-background rounded-lg border border-primary-divider">

                      <div className="flex flex-col gap-1 px-4 py-3">

                        <label className="text-text-secondary text-sm font-medium">Amount</label>

                        <span className="text-text-primary text-base font-medium">

                          ${(invoiceData?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {invoiceData?.currency || "USD"}

                        </span>

                      </div>

                    </div>



                    <p className="text-text-secondary text-xs text-center">

                      Card payments are converted to stablecoin and delivered on-chain to the recipient.

                    </p>



                    <PrimaryButton text={`Pay $${(invoiceData?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} onClick={handleCardPay} containerClassName="w-full" disabled={!cardNumber || !cardExpiry || !cardCvc || !cardName || isProcessingCard} loading={isProcessingCard}/>

                  </>)}

              </div>



              

              <div className="border border-primary-divider rounded-2xl bg-background p-5 flex flex-col gap-4">

                <p className="text-text-secondary text-sm font-medium">Receiver will get</p>

                <div className="flex items-center gap-3">

                  <img src="/token/usdc.svg" alt="USDC" className="w-8 h-8"/>

                  <div className="flex-1">

                    <p className="text-text-primary text-lg font-semibold">

                      {invoiceData?.total || "0"} {invoiceData?.from?.token || "USDC"}

                    </p>

                    <p className="text-text-secondary text-sm">

                      on {invoiceData?.from?.network || "Arc Testnet"}

                    </p>

                  </div>

                  <img src="/chain/arc.svg" alt="Arc Testnet" className="w-6 h-6"/>

                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-app-background rounded-lg">

                  <span className="text-xs text-text-secondary">Wallet:</span>

                  <span className="text-xs text-text-primary font-mono truncate">{invoiceData?.from?.walletAddress}</span>

                </div>

              </div>



              

              <div className="border border-primary-divider rounded-lg bg-background p-6" style={{

            backgroundImage: `url(/card/background.svg)`,

            backgroundSize: "contain",

            backgroundPosition: "right",

            backgroundRepeat: "no-repeat",

        }}>

                <p className="text-text-secondary text-sm">You pay</p>

                <div className="flex items-center gap-2">

                  <p className="text-text-primary text-2xl font-medium">

                    {invoiceData?.total || "0"} {selectedToken?.metadata.symbol || invoiceData?.currency}

                  </p>

                </div>

                {selectedToken && selectedNetwork && selectedToken.metadata.symbol !== (invoiceData?.from?.token || "USDC") && (<p className="text-xs text-text-secondary mt-1">

                    Auto-converted to {invoiceData?.from?.token || "USDC"} on {invoiceData?.from?.network || "Arc Testnet"} for the receiver

                  </p>)}

              </div>

            </div>



            

            <div className="flex-3/5">

              <InvoicePreview {...invoiceData} logo={invoiceSettings?.logo || invoiceData.logo || demoData?.company?.logo || null}/>

            </div>

          </div>

        </div>

      </div>

    </div>);

};

