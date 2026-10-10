import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import { MODAL_IDS, PermissionRequiredModalProps } from "@/presentation/types/modal";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PrimaryButton } from "../Common/PrimaryButton";
import { SecondaryButton } from "../Common/SecondaryButton";
import InputOutlined from "../Common/Input/InputOutlined";
import FieldInput from "@/presentation/components/Common/Input/FieldInput";
import FieldTextarea from "@/presentation/components/Common/Input/FieldTextarea";
import toast from "react-hot-toast";
import { USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
import { useCreatePaymentLink } from "@/presentation/services/api/payment-link";
import { CreatePaymentLinkDto as CreatePaymentLink, TokenMetadata } from "@/presentation/types/dto/payment-link";
import { useRouter } from "next/navigation";
import { PaymentLinkPreview } from "./PaymentLinkPreview";
import { useAuth } from "@/presentation/services/auth/context";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { useListAccountsByCompany } from "@/presentation/services/api/multisig";
import { trackEvent } from "@/presentation/services/analytics/posthog";
import { PostHogEvent } from "@/presentation/types/posthog";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
interface CreatePaymentLinkFormData {
    title: string;
    description: string;
    amount: string;
    walletAddress: string;
}
const SectionTitle = ({ children, subtitle }: {
    children: React.ReactNode;
    subtitle?: string;
}) => (<div className="flex flex-col gap-0.5">
    <h2 className="text-lg font-semibold text-text-primary">{children}</h2>
    {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
  </div>);
const SectionDivider = () => <div className="h-px w-full bg-primary-divider"/>;
const CreatePaymentLinkContainer = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { setTitle, setShowBackArrow } = useTitle();
    const [selectedToken, setSelectedToken] = useState<AssetWithMetadata | null>(null);
    const { openModal } = useModal();
    const { mutateAsync, isPending } = useCreatePaymentLink();
    const { data: myCompany } = useGetMyCompany();
    const { data: multisigAccounts, isLoading: accountsLoading } = useListAccountsByCompany(myCompany?.id, {
        enabled: !!myCompany?.id,
    });
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
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
        <span className="font-medium text-text-primary">Create payment link</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    useEffect(() => {
        if (user && !isAdmin) {
            openModal<PermissionRequiredModalProps>(MODAL_IDS.PERMISSION_REQUIRED, {
                role: user?.teamMembership?.role,
                onConfirm: () => router.push("/"),
            });
        }
    }, [user, isAdmin]);
    const handleCreatePaymentLink = async (data: CreatePaymentLinkFormData) => {
        if (!data.walletAddress) {
            toast.error("Please select a receiving account");
            return;
        }
        if (!selectedToken) {
            toast.error("Please select a token");
            return;
        }
        try {
            const acceptedTokens: TokenMetadata[] = [
                {
                    symbol: selectedToken.metadata.symbol,
                    decimals: selectedToken.metadata.decimals,
                    address: selectedToken.faucetId || USDC_TOKEN_ADDRESS,
                    name: selectedToken.metadata.symbol,
                },
            ];
            const paymentLinkData: CreatePaymentLink = {
                title: data.title,
                description: data.description,
                amount: data.amount,
                paymentWalletAddress: data.walletAddress,
                acceptedTokens,
            };
            await mutateAsync(paymentLinkData);
            trackEvent(PostHogEvent.PAYMENT_LINK_CREATED, {
                amount: data.amount,
                token: selectedToken.metadata.symbol,
            });
            toast.success("Payment link created successfully!");
            reset();
            setSelectedToken(null);
            router.push("/payment-link");
        }
        catch (error: any) {
            toast.error(error?.message || "Failed to create payment link");
        }
    };
    const handleMultisigAccountSelect = (accountId: string) => {
        setValue("walletAddress", accountId, { shouldValidate: true });
    };
    if (user && !isAdmin)
        return null;
    const canCreate = isValid && !!selectedToken && watch("walletAddress") !== "" && !isPending;
    return (<div className="flex h-full w-full flex-col bg-background">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Create payment link</h1>
          <p className="text-[14px] text-text-secondary">Create a shareable link to get paid in crypto.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SecondaryButton text="Cancel" variant="light" buttonClassName="w-fit" onClick={() => openModal(MODAL_IDS.DISCARD_CHANGES, {
            onConfirm: () => router.push("/payment-link"),
        })}/>
          <PrimaryButton text={isPending ? "Creating..." : "Create Payment Link"} onClick={handleSubmit(handleCreatePaymentLink)} disabled={!canCreate} loading={isPending} containerClassName="w-fit" buttonClassName="whitespace-nowrap"/>
        </div>
      </div>

      
      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden px-6 pb-6">
        
        <div className="flex flex-1 min-w-0 flex-col overflow-y-auto pb-4">
          <div className="flex flex-col gap-6 rounded-2xl border border-primary-divider bg-background p-6">
            
            <div className="flex flex-col gap-3">
              <SectionTitle subtitle="What this payment is for.">Information</SectionTitle>
              <FieldInput label="Title" placeholder="e.g. Q3 Consulting Services" error={!!errors.title} errorMessage={errors.title?.message} {...register("title", {
        required: "Title is required",
        maxLength: { value: 100, message: "Title cannot exceed 100 characters" },
    })}/>
              <div className="flex flex-col gap-1">
                <FieldTextarea label="Description" rows={3} {...register("description", {
        required: "Description is required",
        maxLength: { value: 250, message: "Description cannot exceed 250 characters" },
    })} placeholder="Payment for software development services as per contract agreement." maxLength={250} autoComplete="off" error={!!errors.description} errorMessage={errors.description?.message}/>
                <div className="flex items-center justify-end px-1">
                  <p className="text-xs text-text-secondary">{watch("description")?.length || 0}/250</p>
                </div>
              </div>
            </div>

            <SectionDivider />

            
            <div className="flex flex-col gap-3">
              <SectionTitle subtitle="Choose the account to receive your funds.">Receive Payment To</SectionTitle>
              <div className="flex flex-col gap-2">
                {accountsLoading ? (<div className="flex w-full items-center justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border border-primary-divider border-t-primary-blue"/>
                  </div>) : !multisigAccounts || multisigAccounts.length === 0 ? (<p className="text-sm text-text-secondary">No accounts found. Create a multisig account first.</p>) : (multisigAccounts.map(account => {
            const selected = watch("walletAddress") === account.accountId;
            return (<button key={account.accountId} type="button" onClick={() => handleMultisigAccountSelect(account.accountId)} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${selected ? "border-primary-blue bg-blue-50/50" : "border-primary-divider"}`}>
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${selected ? "bg-primary-blue" : "border-2 border-primary-divider"}`}>
                          {selected && <div className="h-2 w-2 rounded-full bg-white"/>}
                        </div>
                        <img src={account.logo || "/client-invoice/payroll-icon.svg"} alt="" className="w-7"/>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-sm font-medium text-text-primary">{account.name}</p>
                          <p className="truncate font-mono text-xs text-text-secondary">{account.accountId}</p>
                        </div>
                      </button>);
        }))}
              </div>
            </div>

            <SectionDivider />

            
            <div className="flex flex-col gap-3">
              <SectionTitle subtitle="Token and amount to request.">Payment Details</SectionTitle>
              <InputOutlined label="Token" placeholder="Select token" value={selectedToken?.metadata.symbol || ""} onChange={() => { }} readOnly icon="/arrow/chevron-down.svg" iconOnClick={() => openModal(MODAL_IDS.SELECT_TOKEN, {
            selectedToken,
            onTokenSelect: (token: AssetWithMetadata) => setSelectedToken(token),
        })}/>
              <FieldInput label="Amount" placeholder="Enter amount" error={!!errors.amount} errorMessage={errors.amount?.message} {...register("amount", {
        required: "Amount is required",
        pattern: {
            value: /^\d+(\.\d+)?$/,
            message: "Amount must be a valid positive number",
        },
    })}/>
            </div>
          </div>
        </div>

        
        <div className="flex flex-1 min-w-0 flex-col gap-3 overflow-y-auto">
          <PaymentLinkPreview chrome recipient={myCompany?.companyName || "Your Company"} recipientAvatar={myCompany?.logo} paymentWalletAddress={watch("walletAddress") || ""} amount={watch("amount") || ""} title={watch("title") || ""} description={watch("description") || ""} selectedToken={selectedToken || null}/>
          <p className="px-1 text-[13px] leading-relaxed text-text-secondary">
            This is a preview of what your payers will see when they open the link. The values here are filled in from
            the form on the left, this side is view-only.
          </p>
        </div>
      </div>
    </div>);
};
export default CreatePaymentLinkContainer;
