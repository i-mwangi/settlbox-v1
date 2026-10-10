import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import { MODAL_IDS } from "@/presentation/types/modal";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import FieldInput from "@/presentation/components/Common/Input/FieldInput";
import FieldTextarea from "@/presentation/components/Common/Input/FieldTextarea";
import { PrimaryButton } from "../Common/PrimaryButton";
import { BaseContainer } from "../Common/BaseContainer";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import { useWalletState } from "@/presentation/services/store";
import { formatAddress } from "@/presentation/services/utils/address";
import toast from "react-hot-toast";
import { Badge, BadgeStatus } from "../Common/Badge";
import { USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
import { useGetPaymentLinkByCodeForOwner, useUpdatePaymentLink } from "@/presentation/services/api/payment-link";
import { UpdatePaymentLinkDto as UpdatePaymentLink, TokenMetadata } from "@/presentation/types/dto/payment-link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PaymentLinkPreview } from "./PaymentLinkPreview";
import { useAuth } from "@/presentation/services/auth/context";
import { useListAccountsByCompany } from "@/presentation/services/api/multisig";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
interface CreatePaymentLinkFormData {
    title: string;
    description: string;
    amount: string;
    walletAddress: string;
}
interface FormInputProps {
    label: string;
    placeholder: string;
    type?: string;
    register: any;
    error?: string;
    disabled?: boolean;
    required?: boolean;
}
interface ChainItemProps {
    text: string;
    icon: string;
    isSelected: boolean;
    onClick: () => void;
}
const SubIcon = ({ icon, onClick, tooltipId, tooltipContent, }: {
    icon: string;
    onClick: () => void;
    tooltipId?: string;
    tooltipContent?: string;
}) => {
    return (<div className="flex justify-center items-center w-[28px] h-[28px] rounded-lg bg-app-background border-t-2 border-primary-divider cursor-pointer" onClick={() => {
            onClick();
        }} data-tooltip-id={tooltipId} data-tooltip-content={tooltipContent}>
      <img src={icon} className="w-4" alt={icon}/>
    </div>);
};
const ChainItem = ({ text, icon, isSelected, onClick }: ChainItemProps) => {
    return (<div className={`flex flex-row gap-2 w-fit h-fit justify-center items-center bg-app-background rounded-full px-3 py-2 cursor-pointer ${isSelected ? "outline outline-primary-blue" : "outline-none"}`} onClick={onClick}>
      {icon && <img src={icon} alt="icon" className="w-5 h-5 rounded-full"/>}
      <span className="text-text-primary leading-none">{text}</span>
      <img src="/misc/circle-close-icon.svg" alt="Selected" className="w-5 h-5"/>
    </div>);
};
const inputContainerClass = "bg-background rounded-xl p-3 border border-primary-divider";
const FormInput = ({ label, placeholder, type = "text", register, error, disabled, required }: FormInputProps) => (<FieldInput label={label} type={type} placeholder={placeholder} error={!!error} errorMessage={error} disabled={disabled} autoComplete="off" {...register}/>);
const NetworkBadge = ({ networkId }: {
    networkId: string;
}) => {
    return (<div className="flex flex-row gap-1 items-center">
      <img alt="" className="w-4 h-4" src={`/chain/${networkId}.svg`}/>
    </div>);
};
const EditPaymentLinkContainer = () => {
    const router = useRouter();
    const { setTitle, setShowBackArrow } = useTitle();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const paymentLinkCode = searchParams.get("code");
    const { walletAddress } = useWalletState(state => state);
    const [selectedToken, setSelectedToken] = useState<AssetWithMetadata | null>(null);
    const [isQRCodeCollapsed, setIsQRCodeCollapsed] = useState(true);
    const [isWalletAddressCollapsed, setIsWalletAddressCollapsed] = useState(false);
    const { openModal } = useModal();
    const { data: myCompany } = useGetMyCompany();
    const { data: multisigAccounts, isLoading: accountsLoading } = useListAccountsByCompany(myCompany?.id, {
        enabled: !!myCompany?.id,
    });
    const { data: paymentLink, isLoading, error } = useGetPaymentLinkByCodeForOwner(paymentLinkCode || "");
    const { mutateAsync: updatePaymentLink, isPending } = useUpdatePaymentLink();
    const { register, handleSubmit, formState: { errors, isValid }, reset, setValue, watch, } = useForm<CreatePaymentLinkFormData>({
        mode: "onChange",
        defaultValues: {
            title: "",
            description: "",
            amount: "",
            walletAddress: "",
        },
    });
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/payment-link")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Payment Link
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Edit</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    useEffect(() => {
        if (paymentLink) {
            setValue("title", paymentLink.title);
            setValue("description", paymentLink.description);
            setValue("amount", paymentLink.amount);
            setValue("walletAddress", paymentLink.paymentWalletAddress);
            if (paymentLink.acceptedTokens && paymentLink.acceptedTokens.length > 0) {
                const token = paymentLink.acceptedTokens[0];
                const mockAsset: AssetWithMetadata = {
                    faucetId: token.address,
                    amount: "0",
                    metadata: {
                        symbol: token.symbol,
                        decimals: token.decimals,
                        maxSupply: 0,
                    },
                };
                setSelectedToken(mockAsset);
            }
        }
    }, [paymentLink, setValue]);
    const handleUpdatePaymentLink = async (data: CreatePaymentLinkFormData) => {
        if (!paymentLink) {
            toast.error("Payment link not found");
            return;
        }
        if (!selectedToken) {
            toast.error("Please select a token");
            return;
        }
        try {
            const acceptedTokens: TokenMetadata[] = [
                {
                    name: selectedToken.metadata.symbol,
                    symbol: selectedToken.metadata.symbol,
                    decimals: selectedToken.metadata.decimals,
                    address: selectedToken.faucetId,
                },
            ];
            const updateData: UpdatePaymentLink = {
                title: data.title,
                description: data.description,
                amount: data.amount,
                acceptedTokens,
            };
            await updatePaymentLink({ code: paymentLink.code, data: updateData });
            toast.success("Payment link updated successfully!");
            router.push("/payment-link");
        }
        catch (error: any) {
            toast.error(error?.message || "Failed to update payment link");
        }
    };
    if (isLoading) {
        return (<div className="flex flex-col w-full h-full p-4 items-center justify-center gap-4">
        <img src="/loading-square.gif" alt="Loading" className="w-8 h-8"/>
        <p className="text-text-secondary">Loading payment link...</p>
      </div>);
    }
    if (error || !paymentLink || !paymentLinkCode) {
        return (<div className="flex flex-col w-full h-full p-4 items-center justify-center gap-4">
        <img src="/misc/red-circle-warning.svg" alt="Error" className="w-8 h-8"/>
        <p className="text-text-secondary">Failed to load payment link</p>
        <button onClick={() => router.push("/payment-link")} className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:opacity-80">
          Back to Payment Links
        </button>
      </div>);
    }
    const handleMultisigAccountSelect = (accountId: string) => {
        setValue("walletAddress", accountId);
        const selectedAccount = multisigAccounts?.find(acc => acc.accountId === accountId);
        if (selectedAccount) {
            setValue("walletAddress", selectedAccount.accountId);
        }
    };
    return (<div className="flex w-full h-full flex-col bg-background">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Edit payment link</h1>
          <p className="text-[14px] text-text-secondary">
            Update the details, receiving account and accepted token for this payment link.
          </p>
        </div>
      </div>

      <div className="w-full flex-1 min-h-0 px-6 pb-6">
        <div className="w-full h-full flex flex-row justify-between items-start gap-5 p-1 bg-[#E7E7E7] rounded-4xl">
        <div className="flex flex-col gap-4 w-[40%] rounded-4xl bg-app-background h-full border-t-2 border-background p-4 items-center justify-between">
          <div className="flex flex-col gap-4 w-full">
            <span className="text-text-primary text-lg font-semibold leading-none">Informations</span>
            <FormInput label="Title" placeholder="i.e XYZ Donation" register={register("title", {
            required: "Title is required",
            maxLength: { value: 100, message: "Title cannot exceed 100 characters" },
        })} error={errors.title?.message}/>
            
            <div className="flex flex-col gap-1">
              <FieldTextarea label="Description" rows={6} {...register("description", {
        maxLength: { value: 250, message: "Description cannot exceed 250 characters" },
    })} autoComplete="off" placeholder="Hey there! Just a quick note to confirm your cryptocurrency transfer." maxLength={250} error={!!errors.description} errorMessage={errors.description?.message}/>
              <div className="flex justify-between px-3">
                <p className="text-xs text-text-secondary">(Optional)</p>
                <p className="text-xs text-text-secondary">{watch("description")?.length || 0}/250</p>
              </div>
            </div>

            <div className={`${inputContainerClass} flex flex-col gap-2 h-73 overflow-y-auto`}>
              <div className="flex flex-col justify-between">
                <p className="text-sm text-text-primary">Accept payment on Arc Testnet Network</p>
                <p className="text-sm text-text-secondary">Choose account you want to receive your funds.</p>
              </div>

              {multisigAccounts?.map(account => (<button key={account.accountId} onClick={() => handleMultisigAccountSelect(account.accountId)} disabled={accountsLoading} className={`w-full flex gap-2 items-center px-4 py-3 rounded-2xl border transition-all ${accountsLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} border-primary-divider`}>
                  
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-blue" style={{
                background: watch("walletAddress") === account.accountId ? "var(--primary-blue)" : "white",
                border: watch("walletAddress") === account.accountId ? "none" : "2px solid var(--primary-divider)",
            }}>
                    {watch("walletAddress") === account.accountId && (<div className="w-2.5 h-2.5 bg-white rounded-full"/>)}
                  </div>

                  <img src={account.logo ? account.logo : "/client-invoice/payroll-icon.svg"} alt="account icon" className="w-8"/>

                  
                  <div className="flex-1 text-left">
                    <p className="text-base font-medium">{account.name}</p>
                    <p className="text-xs font-medium text-text-secondary break-all italic">{account.accountId}</p>
                  </div>
                </button>))}
            </div>

            
            <div className={`bg-background rounded-xl p-3 border border-primary-divider flex items-center justify-between cursor-pointer`} onClick={() => openModal(MODAL_IDS.SELECT_TOKEN, {
            selectedToken,
            onTokenSelect: (token: AssetWithMetadata) => {
                setSelectedToken(token);
            },
        })}>
              <div className="flex gap-3 items-center">
                {selectedToken?.metadata.symbol ? (<>
                    <div className="relative w-10 h-10">
                      <img alt="" className="w-full h-full" src={`/token/${selectedToken.metadata.symbol.toLowerCase()}.svg`}/>
                      <img alt="" className="absolute bottom-0 right-0 w-5 h-5" src="/chain/arc.svg"/>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-text-primary text-sm">{selectedToken.metadata.symbol}</p>
                      <p className="text-text-secondary text-sm">Arc Testnet</p>
                    </div>
                  </>) : (<span className="text-text-primary py-2">Select token</span>)}
              </div>
              <img alt="" className="w-6 h-6" src="/arrow/chevron-down.svg"/>
            </div>
            <FormInput label="Amount" placeholder="Enter amount" register={register("amount", {
            required: "Amount is required",
            pattern: {
                value: /^\d+(\.\d+)?$/,
                message: "Amount must be a valid positive number",
            },
        })} error={errors.amount?.message}/>
          </div>

          <PrimaryButton text="Update Payment Link" onClick={handleSubmit(handleUpdatePaymentLink)} disabled={!isValid || !selectedToken} loading={isPending}/>
        </div>

        <div className="flex flex-col gap-5 py-5 w-[60%]">
          <div className="flex flex-row gap-2 items-center">
            <img src="/misc/blue-eye-icon.svg" alt="Eye" className="w-6 h-6"/>
            <span className="text-text-primary text-2xl font-semibold">Preview</span>
          </div>
          <PaymentLinkPreview chrome recipient={myCompany?.companyName || "Your Company"} recipientAvatar={myCompany?.logo} paymentWalletAddress={watch("walletAddress") || ""} amount={watch("amount") || ""} title={watch("title") || ""} description={watch("description") || ""} selectedToken={selectedToken || null}/>
        </div>
        </div>
      </div>
    </div>);
};
export default EditPaymentLinkContainer;
