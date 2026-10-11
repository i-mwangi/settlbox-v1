"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { CreateEmployeeContactModalProps } from "@/presentation/types/modal";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { ModalHeader } from "../../Common/ModalHeader";
import { PrimaryButton } from "../../Common/PrimaryButton";
import { SecondaryButton } from "../../Common/SecondaryButton";
import { CategoryDropdown } from "../../Common/Dropdown/CategoryDropdown";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { MODAL_IDS } from "@/presentation/types/modal";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import toast from "react-hot-toast";
import { CompanyGroupResponseDto, CreateContactDto } from "@/presentation/types/dto/employee";
import { useCheckEmployeeAddressDuplicate, useCheckEmployeeNameDuplicate, useCreateEmployee, useGetAllEmployeeGroups, } from "@/presentation/services/api/employee";
import { EmployeeGroupDropdown } from "@/presentation/components/Common/Dropdown/EmployeeGroupDropdown";
import { useAuth } from "@/presentation/services/auth/context";
import { USDC_TOKEN_ADDRESS, USDC_TOKEN_DECIMALS, USDC_TOKEN_MAX_SUPPLY, USDC_TOKEN_SYMBOL, } from "@/presentation/services/utils/constant";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import { NetworkDto } from "@/presentation/types/dto/network";
import { TokenDto } from "@/presentation/types/dto/token";
import { FiatPayoutFields, FiatPayoutData } from "@/presentation/components/Common/FiatPayoutFields";
import InvoicePreview from "@/presentation/components/Common/Invoice/InvoicePreview";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { n } from "@/presentation/services/utils/normalizeToken";
import FieldInput from "../../Common/Input/FieldInput";
import { NavArrowDown } from "iconoir-react";
interface CreateContactFormData {
    name: string;
    walletAddress: string;
    email: string;
    groupId?: number;
    duration: string;
    durationUnit: "month" | "year";
    monthlyAmount: string;
    description: string;
    note: string;
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
const FormInput = ({ label, placeholder, type = "text", register, error, disabled, required }: FormInputProps) => (<FieldInput label={required ? label : `${label} (Optional)`} type={type} placeholder={placeholder} error={!!error} errorMessage={error} disabled={disabled} autoFocus={label === "Name"} autoComplete="off" {...register}/>);
const DEFAULT_TOKEN: AssetWithMetadata = {
    amount: "0",
    faucetId: USDC_TOKEN_ADDRESS,
    metadata: {
        symbol: USDC_TOKEN_SYMBOL,
        decimals: USDC_TOKEN_DECIMALS,
        maxSupply: USDC_TOKEN_MAX_SUPPLY,
    },
};
const DEFAULT_NETWORK: {
    icon: string;
    name: string;
    value: string;
} = {
    icon: "/chain/arc.svg",
    name: "Arc Testnet",
    value: "5042002",
};
export function CreateEmployeeContactModal({ isOpen, onClose, zIndex }: ModalProp<CreateEmployeeContactModalProps>) {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [employeeType, setEmployeeType] = useState<"employee" | "contractor">("employee");
    const [selectedToken, setSelectedToken] = useState<AssetWithMetadata | null>(DEFAULT_TOKEN);
    const [selectedNetwork, setSelectedNetwork] = useState<{
        icon: string;
        name: string;
        value: string;
    } | null>(DEFAULT_NETWORK);
    const [selectedGroups, setSelectedGroups] = useState<CompanyGroupResponseDto[]>([]);
    const [paymentType, setPaymentType] = useState<"crypto" | "fiat">("crypto");
    const [selectedPayDay, setSelectedPayDay] = useState(28);
    const [fiatData, setFiatData] = useState<FiatPayoutData>({
        country: "Singapore",
        countryCode: "SG",
        currency: "SGD",
        bankName: "DBS Bank",
        accountNumber: "0129876543",
        accountHolder: "Sarah Chen",
        routingOrSwift: "DBSSSGSG",
    });
    const { openModal, closeModal } = useModal();
    const networkChainIds: Record<string, number> = useMemo(() => ({
        eth: 1,
        "5042002": 5042002,
        sol: 0,
        base: 8453,
        bnb: 56,
    }), []);
    const { data: employeeGroups = [] } = useGetAllEmployeeGroups({ enabled: isAuthenticated });
    const { data: company } = useGetMyCompany();
    const createEmployee = useCreateEmployee();
    const { register, handleSubmit, formState: { errors, isValid, isSubmitted, touchedFields }, reset, setValue, watch, clearErrors, trigger, } = useForm<CreateContactFormData>({
        mode: "all",
        defaultValues: {
            name: "Sarah Chen",
            walletAddress: "",
            email: "sarah.chen@company.com",
            groupId: undefined,
            duration: "12",
            durationUnit: "month",
            monthlyAmount: "5000",
            description: "Monthly salary",
            note: "",
        },
    });
    const visibleErrors = {
        name: touchedFields.name ? errors.name : undefined,
        walletAddress: touchedFields.walletAddress ? errors.walletAddress : undefined,
        email: touchedFields.email ? errors.email : undefined,
        groupId: touchedFields.groupId ? errors.groupId : undefined,
    };
    const watchedName = watch("name");
    const watchedAddress = watch("walletAddress");
    const { data: nameDuplicate } = useCheckEmployeeNameDuplicate();
    const { data: addressDuplicate } = useCheckEmployeeAddressDuplicate();
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedToken(DEFAULT_TOKEN);
            setSelectedNetwork(DEFAULT_NETWORK);
            setSelectedGroups([]);
            setPaymentType("crypto");
            setSelectedPayDay(28);
            setFiatData({
                country: "Singapore",
                countryCode: "SG",
                currency: "SGD",
                bankName: "DBS Bank",
                accountNumber: "0129876543",
                accountHolder: "Sarah Chen",
                routingOrSwift: "DBSSSGSG",
            });
            reset({
                name: "Sarah Chen",
                walletAddress: "",
                email: "sarah.chen@company.com",
                groupId: undefined,
                duration: "12",
                durationUnit: "month",
                monthlyAmount: "5000",
                description: "Monthly salary",
                note: "",
            }, { keepErrors: false, keepIsSubmitted: false, keepTouched: false });
            clearErrors();
        }
    }, [isOpen, reset, clearErrors]);
    const groupIdRegister = register("groupId", {
        required: "Group is required",
    });
    const nameRegister = register("name", {
        required: "Name is required",
        minLength: {
            value: 1,
            message: "Name must be at least 1 character",
        },
        maxLength: {
            value: 100,
            message: "Name cannot exceed 100 characters",
        },
        pattern: {
            value: /^[a-zA-Z0-9\s\-_]+$/,
            message: "Name can only contain letters, numbers, spaces, hyphens, and underscores",
        },
        validate: () => {
            if (!selectedGroups.length)
                return true;
            if (nameDuplicate?.isDuplicate)
                return "This name already exists in the selected group";
            return true;
        },
    });
    const addressRegister = register("walletAddress", {
        required: "Wallet address is required",
        minLength: {
            value: 10,
            message: "Address is too short",
        },
        pattern: {
            value: /^0x[0-9a-f]{40}$/i,
            message: "Enter a valid Arc wallet address (0x followed by 40 hexadecimal characters)",
        },
        validate: () => {
            if (!selectedGroups.length)
                return true;
            if (addressDuplicate?.isDuplicate)
                return "This address already exists in the selected group";
            return true;
        },
    });
    const emailRegister = register("email", {
        required: "Email is required",
        pattern: {
            value: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
            message: "Email must be a valid email address",
        },
        maxLength: {
            value: 255,
            message: "Email cannot be longer than 255 characters",
        },
    });
    const handleNext = async () => {
        const step1Fields: (keyof CreateContactFormData)[] = ["name", "email"];
        if (paymentType === "crypto") {
            step1Fields.push("walletAddress");
        }
        step1Fields.push("groupId");
        const valid = await trigger(step1Fields);
        if (!valid)
            return;
        if (!selectedGroups.length) {
            toast.error("Please select a group");
            return;
        }
        if (paymentType === "crypto") {
            if (!selectedToken) {
                toast.error("Please select a token");
                return;
            }
            if (!selectedNetwork) {
                toast.error("Please select a network");
                return;
            }
        }
        else {
            if (!fiatData.countryCode) {
                toast.error("Please select a country");
                return;
            }
        }
        setStep(2);
    };
    const onSubmit = async (data: CreateContactFormData) => {
        if (!selectedGroups.length) {
            toast.error("Please select a group");
            return;
        }
        try {
            const tokenPayload: TokenDto | undefined = paymentType === "crypto" && selectedToken
                ? {
                    address: selectedToken.faucetId,
                    symbol: selectedToken.metadata.symbol,
                    decimals: selectedToken.metadata.decimals,
                    name: selectedToken.metadata.symbol,
                }
                : undefined;
            const networkPayload: NetworkDto | undefined = paymentType === "crypto" && selectedNetwork
                ? { name: selectedNetwork.name, chainId: networkChainIds[selectedNetwork.value] ?? 0 }
                : undefined;
            const employeePayload: any = {
                groupId: selectedGroups[0]?.id,
                groupIds: selectedGroups.map(g => g.id),
                name: data.name.trim(),
                walletAddress: paymentType === "crypto" ? data.walletAddress.trim() : "",
                email: data.email?.trim() || undefined,
                token: tokenPayload || null,
                network: networkPayload || null,
                employeeType,
                isActive: true,
                paymentMethod: paymentType,
                fiatDetails: paymentType === "fiat" ? {
                    country: fiatData.country,
                    bank: fiatData.bankName,
                    currency: fiatData.currency,
                } : undefined,
                payroll: {
                    duration: data.duration,
                    durationUnit: data.durationUnit,
                    monthlyAmount: data.monthlyAmount,
                    paydayDay: selectedPayDay,
                    description: data.description,
                    note: data.note,
                },
            };
            await createEmployee.mutateAsync(employeePayload);
            toast.success(`${employeeType === "contractor" ? "Contractor" : "Employee"} created successfully`);
            reset();
            setStep(1);
            setSelectedToken(DEFAULT_TOKEN);
            setSelectedNetwork(DEFAULT_NETWORK);
            setSelectedGroups([]);
            setSelectedPayDay(28);
            onClose();
            closeModal("CHOOSE_CONTACT_TYPE");
        }
        catch (error) {
            console.error("Failed to create contact:", error);
            toast.error("Failed to create contact");
        }
    };
    const handleTokenSelect = (token: AssetWithMetadata | null) => {
        setSelectedToken(token);
    };
    const handleToggleGroup = (group: CompanyGroupResponseDto) => {
        const next = selectedGroups.some(g => g.id === group.id)
            ? selectedGroups.filter(g => g.id !== group.id)
            : [...selectedGroups, group];
        setSelectedGroups(next);
        setValue("groupId", next[0]?.id, { shouldValidate: true, shouldTouch: true });
    };
    const handleCancel = () => {
        reset();
        setStep(1);
        setSelectedToken(DEFAULT_TOKEN);
        setSelectedNetwork(DEFAULT_NETWORK);
        setSelectedGroups([]);
        setSelectedPayDay(28);
        onClose();
    };
    const [durationUnit, setDurationUnit] = useState<"month" | "year">("month");
    const handleToggleDurationUnit = () => {
        const newUnit = durationUnit === "month" ? "year" : "month";
        setDurationUnit(newUnit);
        setValue("durationUnit", newUnit, { shouldValidate: true });
    };
    const handleNextToReview = async () => {
        const valid = await trigger(["duration", "monthlyAmount", "description"]);
        if (!valid)
            return;
        setStep(3);
    };
    const buildInvoiceData = () => {
        const formValues = watch();
        const tokenSymbol = selectedToken ? n(selectedToken.metadata.symbol) : "USDC";
        const networkName = selectedNetwork?.name || "Arc Testnet";
        const payStart = new Date();
        payStart.setDate(selectedPayDay);
        payStart.setMonth(payStart.getMonth() + 1);
        const dueDate = payStart.toISOString().split("T")[0];
        const invoiceDate = new Date(payStart);
        invoiceDate.setDate(payStart.getDate() - 5);
        const amount = Number(formValues.monthlyAmount) || 0;
        return {
            invoiceNumber: "INV0001",
            date: invoiceDate.toISOString().split("T")[0],
            dueDate,
            note: formValues.note || undefined,
            from: {
                name: formValues.name,
                email: formValues.email,
                company: "",
                address: "",
                network: networkName,
                token: tokenSymbol,
                walletAddress: formValues.walletAddress || "",
            },
            billTo: {
                name: company?.companyName || "",
                email: user?.email || "",
                company: company?.companyName || "",
                address: "",
            },
            items: [
                {
                    description: formValues.description || "Payroll Payment",
                    price: amount,
                    qty: 1,
                    amount,
                },
            ],
            subtotal: amount,
            total: amount,
            currency: tokenSymbol,
        };
    };
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div className={step === 3 ? "w-[1100px]" : "w-[620px]"} style={{ transition: "width 0.3s ease" }}>
      <ModalHeader title={step === 1 ? "Add new contact" : step === 2 ? "Set up payroll" : "Review invoice"} icon={step === 1 ? "/misc/blue-user-hexagon-icon.svg" : "/sidebar/payroll.svg"} onClose={onClose}/>
      <div className="bg-background border-2 border-primary-divider rounded-b-2xl max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 flex flex-col gap-4">
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 ${step >= 1 ? "text-primary-blue" : "text-text-secondary"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? "bg-primary-blue text-white" : "bg-primary-blue/10 text-primary-blue"}`}>1</div>
              <span className="text-sm font-medium">Contact</span>
            </div>
            <div className="flex-1 h-px bg-primary-divider"/>
            <div className={`flex items-center gap-1.5 ${step >= 2 ? "text-primary-blue" : "text-text-secondary"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? "bg-primary-blue text-white" : step > 2 ? "bg-primary-blue/10 text-primary-blue" : "bg-primary-divider text-text-secondary"}`}>2</div>
              <span className="text-sm font-medium">Payroll</span>
            </div>
            <div className="flex-1 h-px bg-primary-divider"/>
            <div className={`flex items-center gap-1.5 ${step === 3 ? "text-primary-blue" : "text-text-secondary"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 3 ? "bg-primary-blue text-white" : "bg-primary-divider text-text-secondary"}`}>3</div>
              <span className="text-sm font-medium">Review</span>
            </div>
          </div>

          {step === 1 ? (<>
              <label className="flex flex-col gap-2 text-sm text-text-primary">
                Contact type
                <select value={employeeType} onChange={event => setEmployeeType(event.target.value as "employee" | "contractor")} disabled={createEmployee.isPending} className="rounded-lg border border-primary-divider bg-background p-3">
                  <option value="employee">Employee</option>
                  <option value="contractor">Contractor</option>
                </select>
              </label>
              <FormInput label="Name" placeholder="Enter contact name" register={nameRegister} error={visibleErrors.name?.message} disabled={createEmployee.isPending} required/>

              <FormInput label="Email" placeholder="Enter email" type="email" register={emailRegister} error={visibleErrors.email?.message} disabled={createEmployee.isPending} required/>

              
              <div className="flex flex-col gap-2">
                <label className="text-text-secondary text-sm font-medium px-1">Payment method</label>
                <div className="flex rounded-xl bg-app-background p-1 border border-primary-divider">
                  <button type="button" className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${paymentType === "crypto"
                ? "bg-background text-text-primary shadow-sm border border-primary-divider" : "text-text-secondary hover:text-text-primary"}`} onClick={() => setPaymentType("crypto")}>
                    Crypto
                  </button>
                  <button type="button" className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${paymentType === "fiat"
                ? "bg-background text-text-primary shadow-sm border border-primary-divider" : "text-text-secondary hover:text-text-primary"}`} onClick={() => setPaymentType("fiat")}>
                    Fiat Payout
                  </button>
                </div>
                {paymentType === "fiat" && (<p className="text-xs text-text-secondary px-1">Pay from your stablecoin balance. Our licensed partner handles fiat conversion and bank transfer.</p>)}
              </div>

              {paymentType === "crypto" ? (<>
                  <FormInput label="Wallet address" placeholder="Enter wallet address" register={addressRegister} error={visibleErrors.walletAddress?.message} disabled={createEmployee.isPending} required/>

                  <input type="hidden" {...groupIdRegister} value={selectedGroups[0]?.id ?? ""}/>

                  
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => openModal(MODAL_IDS.SELECT_NETWORK, { onNetworkSelect: setSelectedNetwork })} className="flex items-center gap-2 rounded-xl border border-primary-divider bg-background px-3 py-2.5 text-left transition-colors cursor-pointer hover:bg-app-background disabled:opacity-50 disabled:cursor-not-allowed" disabled={createEmployee.isPending}>
                      {selectedNetwork && <img src={selectedNetwork.icon} alt="network" className="h-7 w-7 flex-shrink-0"/>}
                      <div className="min-w-0 flex-1">
                        <p className="text-text-secondary text-xs leading-none">Select network</p>
                        <p className="mt-0.5 truncate text-text-primary text-sm font-medium">{selectedNetwork?.name || "-"}</p>
                      </div>
                      <NavArrowDown width={16} height={16} strokeWidth={2} className="flex-shrink-0 text-text-secondary"/>
                    </button>

                    <button type="button" onClick={() => openModal(MODAL_IDS.SELECT_TOKEN, { onTokenSelect: handleTokenSelect })} className="flex items-center gap-2 rounded-xl border border-primary-divider bg-background px-3 py-2.5 text-left transition-colors cursor-pointer hover:bg-app-background disabled:opacity-50 disabled:cursor-not-allowed" disabled={createEmployee.isPending}>
                      {selectedToken && (<img src={selectedToken.metadata.symbol === "USDC"
                        ? "/token/usdc.svg" : blo(identiconSeed(selectedToken.faucetId))} alt="token" className="h-7 w-7 rounded-full flex-shrink-0"/>)}
                      <div className="min-w-0 flex-1">
                        <p className="text-text-secondary text-xs leading-none">Select token</p>
                        <p className="mt-0.5 truncate text-text-primary text-sm font-medium">{selectedToken?.metadata.symbol || "-"}</p>
                      </div>
                      <NavArrowDown width={16} height={16} strokeWidth={2} className="flex-shrink-0 text-text-secondary"/>
                    </button>
                  </div>
                </>) : (<>
                  <input type="hidden" {...groupIdRegister} value={selectedGroups[0]?.id ?? ""}/>

                  <FiatPayoutFields data={fiatData} onChange={setFiatData} disabled={createEmployee.isPending}/>
                </>)}

              
              <div className="rounded-xl border border-primary-divider bg-background py-2.5">
                <EmployeeGroupDropdown groups={employeeGroups} selectedGroupIds={selectedGroups.map(g => g.id)} onToggleGroup={handleToggleGroup}/>
              </div>

              
              <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-1 flex flex-row gap-3 border-t border-primary-divider bg-background px-4 py-3">
                <SecondaryButton text="Cancel" onClick={() => openModal(MODAL_IDS.DISCARD_CHANGES, { onConfirm: handleCancel })} buttonClassName="flex-1" disabled={createEmployee.isPending} variant="light"/>
                <PrimaryButton text="Next" onClick={handleNext} containerClassName="flex-1" disabled={selectedGroups.length === 0 || !isValid}/>
              </div>
            </>) : step === 2 ? (<>
              
              
              <div className="flex flex-col gap-2">
                <div className="rounded-xl border border-primary-divider bg-background p-3 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5 flex-1">
                    <p className="text-text-secondary text-sm">Duration</p>
                    <input {...register("duration", { required: "Duration is required" })} type="text" autoComplete="off" placeholder="Enter contract duration" className="outline-none bg-transparent text-text-primary placeholder:text-text-secondary"/>
                  </div>
                  <button type="button" onClick={handleToggleDurationUnit} className="bg-background flex items-center justify-center rounded-lg w-fit cursor-pointer border border-primary-divider px-4 py-2 gap-2 shadow-lg">
                    <span className="leading-none">{durationUnit}</span>
                    <img src="/arrow/chevron-up-down.svg" alt="toggle" className="w-4"/>
                  </button>
                </div>
                <input type="hidden" {...register("durationUnit")}/>
                {errors.duration && (<div className="flex items-center gap-1 pl-2">
                    <img src="/misc/red-circle-warning.svg" alt="warning" className="w-4 h-4"/>
                    <span className="text-[#E93544] text-sm">{errors.duration?.message}</span>
                  </div>)}
              </div>

              
              <div className="relative">
                <FieldInput label="Amount (Monthly)" {...register("monthlyAmount", {
            required: "Amount is required",
            pattern: {
                value: /^\d+(\.\d+)?$/,
                message: "Amount must be a valid positive number",
            },
        })} type="text" placeholder="Enter amount" autoComplete="off" className="pr-14" error={!!errors.monthlyAmount} errorMessage={errors.monthlyAmount?.message}/>
                {selectedToken && (<span className="pointer-events-none absolute right-3.5 top-[34px] text-text-primary">
                    {selectedToken.metadata.symbol}
                  </span>)}
              </div>

              
              <div className="flex flex-col gap-2">
                <p className="text-text-primary text-base font-medium">Scheduled pay date</p>
                <div className="bg-app-background border border-primary-divider rounded-2xl p-3">
                  <div className="grid grid-cols-8 gap-1">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (<button key={day} type="button" onClick={() => setSelectedPayDay(day)} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm cursor-pointer ${selectedPayDay === day ? "bg-primary-blue text-white" : "text-text-secondary hover:bg-gray-100"}`}>
                        {day}
                      </button>))}
                  </div>
                </div>
              </div>

              
              <FormInput label="Item description" placeholder="Add a description" register={register("description", { required: "Description is required" })} error={errors.description?.message} disabled={createEmployee.isPending} required/>

              
              <FormInput label="Note" placeholder="Add a note" register={register("note")} error={errors.note?.message} disabled={createEmployee.isPending}/>

              
              <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-1 flex flex-row gap-3 border-t border-primary-divider bg-background px-4 py-3">
                <SecondaryButton text="Back" onClick={() => setStep(1)} buttonClassName="flex-1" disabled={createEmployee.isPending} variant="light"/>
                <PrimaryButton text="Next" onClick={handleNextToReview} containerClassName="flex-1"/>
              </div>
            </>) : (<>
              
              <div className="flex flex-row gap-6 w-full min-h-[500px]">
                
                <div className="flex flex-col items-center justify-center flex-1 gap-6 py-8">
                  <div className="flex flex-col items-center gap-3">
                    <img src="/misc/blue-review-invoice-icon.svg" alt="review" className="w-12 h-12"/>
                    <p className="font-medium text-xl text-text-primary text-center max-w-[300px]">
                      Review & Confirm Monthly Invoice from {watch("name")}
                    </p>
                  </div>
                  <p className="text-text-secondary text-sm text-center max-w-[320px]">
                    Preview the invoice that will be generated for your employee. Make sure all payment details are accurate before confirming.
                  </p>
                  <div className="flex gap-3">
                    <SecondaryButton text="Back" onClick={() => setStep(2)} variant="light" buttonClassName="min-w-[140px]" disabled={createEmployee.isPending}/>
                    <PrimaryButton text="Create" onClick={handleSubmit(onSubmit)} containerClassName="min-w-[140px]" loading={createEmployee.isPending}/>
                  </div>
                </div>
                
                <div className="w-[500px] h-[560px] overflow-hidden rounded-xl flex-shrink-0">
                  <div className="origin-top-left scale-[0.78]" style={{ width: "640px" }}>
                    <InvoicePreview {...buildInvoiceData() as any}/>
                  </div>
                </div>
              </div>
            </>)}
        </form>
      </div>
      </div>
    </BaseModal>);
}
export default CreateEmployeeContactModal;
