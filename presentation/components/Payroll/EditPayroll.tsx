"use client";
import React, { useEffect, useState } from "react";
import { n } from "@/presentation/services/utils/normalizeToken";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { PrimaryButton } from "../Common/PrimaryButton";
import { useForm } from "react-hook-form";
import { MODAL_IDS } from "@/presentation/types/modal";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import { ContractTerm } from "./ContractTerm";
import FieldInput from "@/presentation/components/Common/Input/FieldInput";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { CompanyContactResponseDto } from "@/presentation/types/dto/employee";
import { useGetPayrollDetails, useUpdatePayroll } from "@/presentation/services/api/payroll";
import { ContractTermEnum } from "@/presentation/types/enums";
import { UpdatePayrollDto } from "@/presentation/types/dto/payroll";
import toast from "react-hot-toast";
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
    description?: string;
}
interface CreatePayrollProps {
    onReview: () => void;
    initialFormData?: CreatePayrollFormData;
    initialToken?: AssetWithMetadata;
    initialNetwork?: {
        icon: string;
        name: string;
        value: string;
    } | null;
    initialPayDay?: number;
}
const inputContainerClass = "bg-background rounded-xl p-3 border border-primary-divider";
const labelClass = "text-text-secondary text-sm";
const EditPayroll = () => {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const payrollId = (params?.id as string) || searchParams.get("id");
    const { setTitle, setShowBackArrow } = useTitle();
    const [selectedToken, setSelectedToken] = useState<AssetWithMetadata>({
        amount: "0",
        faucetId: "",
        metadata: {
            symbol: "",
            decimals: 0,
            maxSupply: 0,
        },
    });
    const [selectedNetwork, setSelectedNetwork] = useState<{
        icon: string;
        name: string;
        value: string;
    } | null>(null);
    const [selectedPayDay, setSelectedPayDay] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { openModal } = useModal();
    const { register, handleSubmit, formState: { errors }, setValue, watch, } = useForm<CreatePayrollFormData>({
        mode: "onChange",
        defaultValues: {
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
    const { data: payrollData, isLoading } = useGetPayrollDetails(payrollId ? parseInt(payrollId) : 0);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/payroll")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Payroll
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Edit</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    useEffect(() => {
        if (payrollData) {
            const startDate = new Date(payrollData.payStartDate);
            const payDay = startDate.getDate();
            setValue("employee", payrollData.employee.name, { shouldValidate: true });
            setValue("employeeId", payrollData.employee.id, { shouldValidate: true });
            setValue("employeeEmail", payrollData.employee.email, { shouldValidate: true });
            setValue("monthlyAmount", payrollData.amount.toString(), { shouldValidate: true });
            setValue("walletAddress", payrollData.employee.walletAddress || "", { shouldValidate: true });
            setValue("duration", payrollData.payrollCycle?.toString() || "", { shouldValidate: true });
            setValue("durationUnit", payrollData.metadata?.durationUnit || "month", { shouldValidate: true });
            setValue("note", payrollData.note || "", { shouldValidate: true });
            setValue("description", payrollData.description || "", { shouldValidate: true });
            setSelectedPayDay(payDay);
            const token: AssetWithMetadata = {
                amount: payrollData.amount.toString(),
                faucetId: payrollData.token.address || "",
                metadata: {
                    symbol: n(payrollData.token.symbol),
                    decimals: payrollData.token.decimals,
                    maxSupply: 0,
                },
            };
            setSelectedToken(token);
            const mockNetwork = {
                icon: "/chain/arc.svg",
                name: payrollData.network.name,
                value: payrollData.network.chainId.toString(),
            };
            setSelectedNetwork(mockNetwork);
        }
    }, [payrollData, setValue]);
    const { mutateAsync: updatePayroll } = useUpdatePayroll();
    const handleBuildPayrollDto = async (formData: CreatePayrollFormData) => {
        const { employeeId, employeeEmail, walletAddress, duration, durationUnit, monthlyAmount, description, note, employee, } = formData;
        if (!selectedNetwork || !selectedToken.metadata.symbol || !employeeId || !payrollId) {
            toast.error("Missing required fields");
            return;
        }
        if (!duration || !durationUnit) {
            toast.error("Please enter contract duration and select duration unit");
            return;
        }
        const durationValue = parseInt(duration);
        const payStart = new Date();
        payStart.setDate(selectedPayDay);
        const payEnd = new Date(payStart);
        if (durationUnit === "year") {
            payEnd.setFullYear(payEnd.getFullYear() + durationValue);
        }
        else {
            payEnd.setMonth(payEnd.getMonth() + durationValue);
        }
        const payrollCycle = durationUnit === "year" ? durationValue * 12 : durationValue;
        const updatePayrollDto: UpdatePayrollDto = {
            network: {
                name: selectedNetwork.name,
                chainId: parseInt(selectedNetwork.value),
            },
            token: {
                address: selectedToken.faucetId,
                symbol: selectedToken.metadata.symbol,
                decimals: selectedToken.metadata.decimals,
                name: selectedToken.metadata.symbol,
            },
            paydayDay: selectedPayDay,
            contractTerm: ContractTermEnum.PERMANENT,
            payrollCycle: payrollCycle,
            amount: monthlyAmount,
            note: note,
            description: description || "",
            metadata: {
                payDay: selectedPayDay,
                durationUnit,
            },
        };
        setIsSubmitting(true);
        try {
            const payrollIdNum = payrollId ? parseInt(payrollId) : payrollData?.id;
            if (!payrollIdNum) {
                toast.error("Missing payroll id");
                setIsSubmitting(false);
                return;
            }
            await updatePayroll({ id: payrollIdNum, data: updatePayrollDto });
            toast.success("Payroll updated successfully");
            router.push("/payroll");
        }
        catch (err: any) {
            toast.error(err?.message || "Error updating payroll");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleChooseRecipient = () => {
        openModal(MODAL_IDS.SELECT_EMPLOYEE, {
            onSave: (employee: CompanyContactResponseDto) => {
                setValue("employee", employee.name, { shouldValidate: true });
                setValue("employeeId", employee.id, { shouldValidate: true });
                setValue("walletAddress", employee.walletAddress, { shouldValidate: true });
                setValue("employeeEmail", employee.email, { shouldValidate: true });
            },
        });
    };
    const selectedEmployeeName = watch("employee");
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
    if (payrollId && isLoading) {
        return (<div className="w-full h-full flex items-center justify-center">
        <div role="status">
          <svg aria-hidden="true" className="w-8 h-8 text-neutral-tertiary animate-spin fill-brand" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
          </svg>
          <span className="sr-only">Loading...</span>
        </div>
      </div>);
    }
    return (<div className="flex w-full h-full flex-col bg-background">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Edit payroll</h1>
          <p className="text-[14px] text-text-secondary">Update the contract details for this employee payroll.</p>
        </div>
      </div>

      
      <div className="flex w-full justify-center px-6 pb-6">
        <div className="bg-payroll-main-background border border-primary-divider rounded-[20px] flex w-[980px] gap-8">
        
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
              {selectedToken.metadata.symbol ? (<>
                  <div className="relative w-10 h-10">
                    <img alt="" className="w-full h-full" src={`/token/${selectedToken.metadata.symbol.toLowerCase()}.svg`}/>
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

          <FieldInput label="Wallet address" {...register("walletAddress")} type="text" placeholder="Paste wallet address" autoFocus={true} autoComplete="off" error={!!errors.walletAddress} errorMessage={errors.walletAddress?.message}/>
        </div>

        
        <div className="w-[55%] p-4 pl-0 flex flex-col gap-4 ">
          
          <ContractTerm selectedToken={selectedToken} selectedPayDay={selectedPayDay} setSelectedPayDay={setSelectedPayDay} register={register} errors={errors} setValue={setValue} watch={watch} inputContainerClass={inputContainerClass} labelClass={labelClass}/>

          
          <PrimaryButton text="Save changes" onClick={handleSubmit(handleBuildPayrollDto)} disabled={isSubmitting || !selectedNetwork || !selectedToken.metadata.symbol}/>
        </div>
      </div>
      </div>
    </div>);
};
export default EditPayroll;
