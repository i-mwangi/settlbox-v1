"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { n } from "@/presentation/services/utils/normalizeToken";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "../Common/PrimaryButton";
import { useForm } from "react-hook-form";
import { MODAL_IDS, PermissionRequiredModalProps } from "@/presentation/types/modal";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import { ContractTerm } from "./ContractTerm";
import FieldInput from "@/presentation/components/Common/Input/FieldInput";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { CompanyContactResponseDto } from "@/presentation/types/dto/employee";
import { useCreatePayroll } from "@/presentation/services/api/payroll";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { ContractTermEnum } from "@/presentation/types/enums";
import { CreatePayrollDto, PayrollModelDto } from "@/presentation/types/dto/payroll";
import toast from "react-hot-toast";
import { SecondaryButton } from "../Common/SecondaryButton";
import InvoicePreview from "../Common/Invoice/InvoicePreview";
import { useAuth } from "@/presentation/services/auth/context";
import { AuthMeResponse } from "@/presentation/services/auth/api";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import { Company } from "@/presentation/types/dto/company";
import { trackEvent } from "@/presentation/services/analytics/posthog";
import { PostHogEvent } from "@/presentation/types/posthog";
interface CreatePayrollFormData {
    employee: string;
    employeeId?: number;
    employeeEmail?: string;
    monthlyAmount: string;
    time: string;
    walletAddress?: string;
    duration?: string;
    durationUnit?: "month" | "year";
    note?: string;
    description: string;
}
type Step = "create" | "review";
const inputContainerClass = "bg-background rounded-xl p-3 border border-primary-divider";
const labelClass = "text-text-secondary text-sm";
interface EmployeeInfo {
    name: string;
    email?: string;
    walletAddress?: string;
}
interface ReviewPayrollProps {
    onBackAndEdit: () => void;
    payrollDto: CreatePayrollDto;
    employee: EmployeeInfo;
    owner: AuthMeResponse["user"];
    company: Company;
}
interface CreatePayrollProps {
    onReview: (dto: CreatePayrollDto, employee: EmployeeInfo, formData: CreatePayrollFormData, token: AssetWithMetadata, network: {
        icon: string;
        name: string;
        value: string;
    } | null, payDay: number) => void;
    initialFormData?: CreatePayrollFormData;
    initialToken?: AssetWithMetadata | null;
    initialNetwork?: {
        icon: string;
        name: string;
        value: string;
    } | null;
    initialPayDay?: number;
    onDirtyChange?: (dirty: boolean) => void;
}
const CreatePayroll = ({ onReview, initialFormData, initialToken, initialNetwork, initialPayDay = 1, onDirtyChange, }: CreatePayrollProps) => {
    const [selectedToken, setSelectedToken] = useState<AssetWithMetadata | null>(initialToken || null);
    const [selectedNetwork, setSelectedNetwork] = useState<{
        icon: string;
        name: string;
        value: string;
    } | null>(initialNetwork || null);
    const [selectedPayDay, setSelectedPayDay] = useState(initialPayDay ?? 1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { openModal } = useModal();
    const { register, handleSubmit, formState: { errors, isValid, isDirty: isFormDirty }, setValue, watch, } = useForm<CreatePayrollFormData>({
        mode: "onChange",
        defaultValues: initialFormData || {
            time: "10:00",
            employee: "",
            employeeEmail: "",
            monthlyAmount: "",
            walletAddress: "",
            duration: "",
            durationUnit: "month",
            note: "",
            description: "",
        },
    });
    useEffect(() => {
        const dirty = isFormDirty || !!selectedToken || !!selectedNetwork;
        if (dirty) {
            onDirtyChange?.(true);
        }
    }, [isFormDirty, selectedToken, selectedNetwork, onDirtyChange]);
    const handleBuildPayrollDto = (formData: CreatePayrollFormData) => {
        const { employeeId, employeeEmail, walletAddress, duration, durationUnit, monthlyAmount, description, note, employee, } = formData;
        if (!selectedNetwork || !selectedToken || !selectedToken.metadata.symbol || !employeeId || !description) {
            toast.error("Missing required fields");
            return;
        }
        if (!duration || !durationUnit) {
            toast.error("Please enter contract duration and select duration unit");
            return;
        }
        let durationValue = parseInt(duration);
        const payStart = new Date();
        payStart.setDate(selectedPayDay);
        payStart.setMonth(payStart.getMonth() + 1);
        const payEnd = new Date(payStart);
        if (durationUnit === "year") {
            payEnd.setFullYear(payEnd.getFullYear() + durationValue);
            durationValue = durationValue * 12;
        }
        else {
            payEnd.setMonth(payEnd.getMonth() + durationValue);
        }
        const createPayrollDto: CreatePayrollDto = {
            employeeId: employeeId,
            network: {
                name: selectedNetwork.name,
                chainId: parseInt(selectedNetwork.value),
            },
            token: {
                address: selectedToken.faucetId || "",
                symbol: selectedToken.metadata.symbol,
                decimals: selectedToken.metadata.decimals,
                name: selectedToken.metadata.symbol,
            },
            contractTerm: ContractTermEnum.PERMANENT,
            payrollCycle: durationValue,
            amount: monthlyAmount,
            payday: selectedPayDay,
            joiningDate: payStart.toISOString(),
            description: description,
            note: note,
            metadata: {
                durationUnit,
                payStartDate: payStart.toISOString(),
                payEndDate: payEnd.toISOString(),
            },
        };
        onReview(createPayrollDto, {
            name: employee,
            email: employeeEmail,
            walletAddress: walletAddress,
        }, formData, selectedToken, selectedNetwork, selectedPayDay);
    };
    const handleChooseRecipient = () => {
        openModal(MODAL_IDS.SELECT_EMPLOYEE, {
            onSave: (employee: CompanyContactResponseDto) => {
                setValue("employee", employee.name, { shouldValidate: true });
                setValue("employeeId", employee.id, { shouldValidate: true });
                setValue("walletAddress", employee.walletAddress, { shouldValidate: true });
                setValue("employeeEmail", employee.email, { shouldValidate: true });
                if (employee.network) {
                    setSelectedNetwork({
                        icon: "/chain/arc.svg",
                        name: employee.network.name,
                        value: String(employee.network.chainId),
                    });
                }
                if (employee.token) {
                    setSelectedToken({
                        amount: "0",
                        faucetId: employee.token.address || "",
                        metadata: {
                            symbol: n(employee.token.symbol),
                            decimals: employee.token.decimals || 0,
                            maxSupply: employee.token.maxSupply || 0,
                        },
                    });
                }
            },
        });
    };
    const handleTokenSelect = (token: AssetWithMetadata) => {
        setSelectedToken(token);
        setValue("monthlyAmount", "");
    };
    const handleNetworkSelect = (network: {
        icon: string;
        name: string;
        value: string;
    }) => {
        setSelectedNetwork(network);
    };
    const selectedEmployeeName = watch("employee");
    return (<>
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Create payroll</h1>
          <p className="text-[14px] text-text-secondary">
            Set up a recurring payroll contract for an employee with payment details and schedule.
          </p>
        </div>
      </div>

      
      <div className="mx-6 mb-6 bg-payroll-main-background border border-primary-divider rounded-[20px] flex w-[980px] gap-8">
        
        <div className="w-[45%] p-4 pr-0 flex flex-col gap-3 top-1 sticky h-fit">
          <h2 className="text-text-primary text-lg leading-none">Basic Information</h2>

          
          <div className={`${inputContainerClass} flex items-center justify-between cursor-pointer`} onClick={handleChooseRecipient}>
            <div className="flex gap-3 items-center flex-1">
              {selectedEmployeeName ? (<>
                  <div className="bg-app-background flex items-center justify-center rounded-lg w-10 h-10 border border-primary-divider">
                    <img alt="" className="w-5 h-5" src="/misc/address-book-icon.svg"/>
                  </div>
                  <div className="flex flex-col">
                    <p className={labelClass}>Employee</p>
                    <p className="text-text-primary text-sm font-bold">{selectedEmployeeName}</p>
                  </div>
                </>) : (<span className="text-text-primary py-1">Select employee</span>)}
            </div>
            <img alt="" className="w-6 h-6" src="/arrow/chevron-down.svg"/>
          </div>
          
          <input type="hidden" {...register("employee", { required: true })}/>

          
          <div className={`${inputContainerClass} flex items-center justify-between cursor-pointer`} onClick={() => openModal(MODAL_IDS.SELECT_NETWORK, {
            selectedNetwork,
            onNetworkSelect: handleNetworkSelect,
        })}>
            <div className="flex gap-3 items-center">
              {selectedNetwork ? (<>
                  <img alt="" className="w-10 rounded-lg" src={selectedNetwork.icon}/>
                  <div className="flex flex-col">
                    <p className="text-text-secondary text-sm">Payment network</p>
                    <p className="text-text-primary text-sm font-bold">{selectedNetwork.name}</p>
                  </div>
                </>) : (<span className="text-text-primary py-1">Select network</span>)}
            </div>
            <img alt="" className="w-6 h-6" src="/arrow/chevron-down.svg"/>
          </div>

          
          <div className={`${inputContainerClass} flex items-center justify-between cursor-pointer`} onClick={() => openModal(MODAL_IDS.SELECT_TOKEN, {
            selectedToken,
            onTokenSelect: handleTokenSelect,
        })}>
            <div className="flex gap-3 items-center">
              {selectedToken && selectedToken.metadata.symbol ? (<>
                  <div className="relative w-10 h-10">
                    <img alt="" className="w-full h-full rounded-full" src={selectedToken.metadata.symbol === "USDC"
                ? "/token/usdc.svg" : blo(identiconSeed(selectedToken.faucetId))}/>
                    <img alt="" className="absolute bottom-0 right-0 w-5 h-5" src="/chain/arc.svg"/>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-text-primary text-sm">{selectedToken.metadata.symbol}</p>
                    <p className="text-text-secondary text-sm">Arc Testnet</p>
                  </div>
                </>) : (<span className="text-text-primary py-1">Select token</span>)}
            </div>
            <img alt="" className="w-6 h-6" src="/arrow/chevron-down.svg"/>
          </div>

          <FieldInput label="Wallet address" {...register("walletAddress")} type="text" placeholder="Paste wallet address" autoComplete="off" error={!!errors.walletAddress} errorMessage={errors.walletAddress?.message}/>
        </div>

        
        <div className="w-[55%] p-4 pl-0 flex flex-col gap-4 ">
          
          <ContractTerm selectedToken={selectedToken} selectedPayDay={selectedPayDay} setSelectedPayDay={setSelectedPayDay} register={register} errors={errors} setValue={setValue} watch={watch} inputContainerClass={inputContainerClass} labelClass={labelClass}/>

          
          <PrimaryButton text="Create now" onClick={handleSubmit(handleBuildPayrollDto)} disabled={isSubmitting || !selectedNetwork || !selectedToken?.metadata?.symbol || !isValid}/>
        </div>
      </div>
    </>);
};
function createInvoiceDataFromPayroll(payroll: CreatePayrollDto, company?: any, employee?: EmployeeInfo, owner?: AuthMeResponse["user"]): any {
    if (!payroll || !company || !employee || !owner) {
        console.warn("Missing data to create invoice");
        return null;
    }
    if (!payroll.metadata?.payStartDate) {
        console.warn("Missing payStartDate in payroll metadata");
        return null;
    }
    const employeeName = employee?.name;
    const dueDate = new Date(payroll.metadata?.payStartDate);
    const invoiceDate = new Date(dueDate);
    invoiceDate.setDate(dueDate.getDate() - 5);
    const billToName = company?.companyName;
    const billToEmail = owner?.email;
    return {
        invoiceNumber: `INV0001`,
        date: invoiceDate.toISOString().split("T")[0],
        dueDate: payroll.metadata?.payStartDate.split("T")[0],
        note: payroll.note,
        from: {
            name: employeeName,
            email: employee?.email,
            company: company?.companyName,
            token: n(payroll?.token?.symbol),
            network: payroll?.network?.name || "Arc Testnet",
            walletAddress: employee.walletAddress,
        },
        billTo: {
            name: billToName,
            email: billToEmail,
            company: company?.companyName,
            address: [company?.address1, company?.address2, company?.city, company?.country, company?.postalCode]
                .filter(Boolean)
                .join(", "),
        },
        items: [
            {
                description: payroll?.description || "Payroll Payment",
                price: Number(payroll?.amount),
                qty: 1,
                amount: Number(payroll?.amount),
            },
        ],
        subtotal: Number(payroll?.amount),
        total: Number(payroll?.amount),
        currency: n(payroll?.token?.symbol),
    };
}
const ReviewPayroll = ({ onBackAndEdit, payrollDto, employee, owner, company }: ReviewPayrollProps) => {
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const router = useRouter();
    const { mutateAsync: createPayroll } = useCreatePayroll();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleConfirmAndCreate = async () => {
        setIsSubmitting(true);
        try {
            await createPayroll({
                employeeId: payrollDto.employeeId,
                network: payrollDto.network,
                token: payrollDto.token,
                contractTerm: payrollDto.contractTerm,
                payrollCycle: payrollDto.payrollCycle,
                amount: payrollDto.amount,
                joiningDate: payrollDto.joiningDate,
                payday: payrollDto.payday,
                generateDaysBefore: 5,
                description: payrollDto.description,
                note: payrollDto.note,
            }).catch(err => {
                throw err;
            });
            toast.success("Payroll created successfully");
            trackEvent(PostHogEvent.PAYROLL_CREATED, {
                totalAmount: payrollDto.amount,
            });
            setTimeout(() => {
                router.push("/payroll");
            }, 1000);
        }
        catch (err: any) {
            toast.error(err?.message || "Error creating payroll");
            setIsSubmitting(false);
        }
    };
    useEffect(() => {
        const data = createInvoiceDataFromPayroll(payrollDto, company, employee, owner);
        setInvoiceData(data);
    }, [payrollDto, employee]);
    if (!invoiceData) {
        return <div>Loading invoice preview...</div>;
    }
    return (<div className="flex flex-col w-full h-full overflow-hidden">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Review payroll</h1>
          <p className="text-[14px] text-text-secondary">
            Preview the invoice generated for your employee and confirm before creating the payroll.
          </p>
        </div>
      </div>

      <div className="w-full h-full flex-row flex px-6 pb-6">
        <div className="flex flex-col items-center justify-center w-full h-full gap-8">
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex flex-col items-center gap-2 w-full">
              <img src="/misc/blue-review-invoice-icon.svg" alt="password-check" className="w-12 h-12"/>

              <p className="font-barlow font-medium text-[32px] leading-[1] tracking-[-0.01em] text-text-primary text-center w-[318px]">
                Review & Confirm Monthly Invoice from {invoiceData.from.name}
              </p>
            </div>
            <div className="font-barlow font-medium text-base leading-6 text-text-secondary text-center w-[440px]">
              <p>Preview the invoice that will be generated for your employee. </p>
              <p>Make sure all payment details are accurate before confirming.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start" data-node-id="2626:120802">
            
            <SecondaryButton text="Edit payroll" onClick={() => {
            onBackAndEdit();
        }} buttonClassName="w-fit whitespace-nowrap" variant="light" disabled={isSubmitting}/>
            
            <PrimaryButton text={isSubmitting ? "Creating..." : "Confirm and create"} onClick={handleConfirmAndCreate} containerClassName="w-fit" buttonClassName="whitespace-nowrap" disabled={isSubmitting}/>
          </div>
        </div>
        <InvoicePreview {...invoiceData}/>
      </div>
    </div>);
};
const CreateAndReviewPayroll = () => {
    const { user } = useAuth();
    const { data: company } = useGetMyCompany();
    const router = useRouter();
    const [step, setStep] = useState<Step>("create");
    const [payrollDto, setPayrollDto] = useState<CreatePayrollDto | null>(null);
    const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
    const [formData, setFormData] = useState<CreatePayrollFormData | undefined>(undefined);
    const [selectedToken, setSelectedToken] = useState<AssetWithMetadata | null>(null);
    const [selectedNetwork, setSelectedNetwork] = useState<{
        icon: string;
        name: string;
        value: string;
    } | null>(null);
    const [selectedPayDay, setSelectedPayDay] = useState<number | undefined>(undefined);
    const { setTitle, setShowBackArrow, setOnBackClick } = useTitle();
    const { openModal } = useModal();
    const [isDirty, setIsDirty] = useState(false);
    const isDirtyRef = useRef(false);
    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);
    useEffect(() => {
        if (payrollDto) {
            setIsDirty(true);
        }
    }, [payrollDto]);
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    const confirmLeave = useCallback((onLeave: () => void) => {
        openModal("PAYROLL_NOT_SAVED", {
            onConfirm: () => {
                setIsDirty(false);
                isDirtyRef.current = false;
                onLeave();
            },
        });
    }, [openModal]);
    useEffect(() => {
        if (user && !isAdmin) {
            openModal<PermissionRequiredModalProps>(MODAL_IDS.PERMISSION_REQUIRED, {
                role: user?.teamMembership?.role,
                onConfirm: () => {
                    router.push("/");
                },
            });
        }
    }, [user, isAdmin]);
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirtyRef.current) {
                e.preventDefault();
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);
    useEffect(() => {
        if (!isDirty)
            return;
        window.history.pushState(null, "", window.location.href);
        const handlePopState = () => {
            if (isDirtyRef.current) {
                window.history.pushState(null, "", window.location.href);
                confirmLeave(() => router.back());
            }
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [isDirty, router]);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/payroll")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Payroll
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Create</span>
      </div>);
        setShowBackArrow(false);
        return () => {
            setOnBackClick(undefined);
            setShowBackArrow(false);
        };
    }, [router]);
    const onReview = (dto: CreatePayrollDto, emp: EmployeeInfo, formDataToSave: CreatePayrollFormData, tokenToSave: AssetWithMetadata, networkToSave: {
        icon: string;
        name: string;
        value: string;
    } | null, payDayToSave: number) => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/payroll")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Payroll
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Review</span>
      </div>);
        setFormData(formDataToSave);
        setSelectedToken(tokenToSave);
        setSelectedNetwork(networkToSave);
        setSelectedPayDay(payDayToSave);
        setPayrollDto(dto);
        setEmployee(emp);
        setStep("review");
    };
    const renderContent = () => {
        if (user && !isAdmin)
            return null;
        switch (step) {
            case "create":
                return (<CreatePayroll onReview={(dto, emp, formDataToSave, tokenToSave, networkToSave, payDayToSave) => onReview(dto, emp, formDataToSave, tokenToSave, networkToSave, payDayToSave)} initialFormData={formData} initialToken={selectedToken} initialNetwork={selectedNetwork} initialPayDay={selectedPayDay} onDirtyChange={setIsDirty}/>);
            case "review":
                return payrollDto && employee && user && company ? (<ReviewPayroll onBackAndEdit={() => setStep("create")} payrollDto={payrollDto} employee={employee} company={company} owner={user as AuthMeResponse["user"]}/>) : null;
            default:
                return null;
        }
    };
    return <div className="flex w-full h-full flex-col bg-background">{renderContent()}</div>;
};
export default CreateAndReviewPayroll;
