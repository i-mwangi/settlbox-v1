"use client";
import { n } from "@/presentation/services/utils/normalizeToken";
import React, { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { Table } from "../Common/Table";
import { TabContainer } from "../Common/TabContainer";
import { Badge, BadgeStatus } from "../Common/Badge";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { useRouter } from "next/navigation";
import { useGetPayrollDetails } from "@/presentation/services/api/payroll";
import toast from "react-hot-toast";
import { CategoryBadge } from "../ContactBook/ContactBookContainer";
import { useGetAllEmployeeGroups, useGetEmployeeById, useUpdateEmployee, useDeleteEmployee, getEmployeeGroupIds, } from "@/presentation/services/api/employee";
import { CategoryShapeEnum } from "@/presentation/types/enums";
import { InvoiceStatusEnum } from "@/presentation/types/enums";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { InvoiceModalProps, MODAL_IDS } from "@/presentation/types/modal";
import { useInvoice } from "@/presentation/hooks/server/useInvoice";
import { SecondaryButton } from "../Common/SecondaryButton";
import { ToggleSwitch } from "../Common/ToggleSwitch";
import { NavArrowRight } from "iconoir-react";
import { EmployeeAvatar } from "../Common/EmployeeAvatar";
import { generateInvoice, confirmInvoice } from "@/presentation/services/api/invoice";
const labelStyles = "py-1 text-base font-medium text-text-secondary";
const TOKEN_USD: Record<string, number> = {
    USDC: 1, USDT: 1, DAI: 1, ETH: 3000, WETH: 3000, BTC: 60000, WBTC: 60000, STRK: 1.2, MID: 2,
};
const usdOf = (s: string) => TOKEN_USD[(s || "").toUpperCase()] ?? 1;
const PayrollDetail = () => {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { setTitle, setShowBackArrow, setOnBackClick } = useTitle();
    const { openModal } = useModal();
    const payrollId = parseInt((params?.id as string) || searchParams.get("id") || "0", 10);
    const { data: payrollData, isLoading, error } = useGetPayrollDetails(payrollId);
    const { data: groups } = useGetAllEmployeeGroups();
    const { data: employeeData } = useGetEmployeeById(payrollData?.employee.id);
    const { mutateAsync: updateEmployeeMutate } = useUpdateEmployee();
    const { mutate: deleteEmployeeMutate } = useDeleteEmployee();
    const { fetchInvoiceByUUID } = useInvoice();
    const [preparingInvoice, setPreparingInvoice] = useState(false);
    const handlePrepareInvoice = async () => {
        setPreparingInvoice(true);
        try {
            await generateInvoice(payrollId);
            toast.success("Payroll invoice prepared");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to prepare payroll invoice");
        } finally {
            setPreparingInvoice(false);
        }
    };
    const isActive = (employeeData as any)?.isActive !== false;
    const isContractor = (employeeData as any)?.employeeType === "contractor";
    const nextPaymentDate = (() => {
        if (!isActive || !payrollData)
            return null;
        const now = new Date();
        const payday = payrollData.paydayDay || 28;
        const next = new Date(now.getFullYear(), now.getMonth(), payday);
        if (next <= now)
            next.setMonth(next.getMonth() + 1);
        const endDate = new Date(payrollData.payEndDate);
        if (next > endDate)
            return null;
        return next;
    })();
    const contractMonthsLeft = (() => {
        if (!payrollData)
            return 0;
        const now = new Date();
        const end = new Date(payrollData.payEndDate);
        const diff = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
        return Math.max(0, diff);
    })();
    const handleToggleActive = async (newActive?: boolean) => {
        if (!employeeData)
            return;
        const active = typeof newActive === "boolean" ? newActive : !isActive;
        try {
            await updateEmployeeMutate(employeeData.id, { isActive: active });
            toast.success(active ? "Payment enabled" : "Payment disabled");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update employee");
        }
    };
    const handleRemove = () => {
        openModal(MODAL_IDS.REMOVE_CONTACT_CONFIRMATION, {
            contactName: payrollData?.employee?.name,
            contactAddress: payrollData?.employee?.walletAddress,
            onRemove: () => {
                const id = (employeeData as any)?.id ?? payrollId;
                deleteEmployeeMutate(id);
                toast.success("Employee removed");
                router.push("/contact-book");
            },
        });
    };
    const handleEditContact = () => {
        if (!payrollData)
            return;
        openModal(MODAL_IDS.EDIT_EMPLOYEE_CONTACT, {
            contactData: {
                id: String((employeeData as any)?.id ?? payrollId),
                name: payrollData.employee.name,
                address: payrollData.employee.walletAddress || "",
                email: payrollData.employee.email,
                group: groups?.find((g: any) => g.id === payrollData?.employee?.groupId)?.name ?? "",
                groupIds: getEmployeeGroupIds(employeeData ?? payrollData?.employee),
                token: payrollData.token,
                network: payrollData.network,
                avatar: (employeeData as any)?.avatar || (payrollData.employee as any).avatar,
            },
        });
    };
    const [activeTab, setActiveTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const getFilteredInvoices = () => {
        if (!payrollData?.invoices)
            return [];
        const invoices = payrollData.invoices;
        switch (activeTab) {
            case "awaiting":
                return invoices.filter(invoice => invoice.status === "SENT");
            case "paid":
                return invoices.filter(invoice => invoice.status === "PAID");
            case "all":
            default:
                return invoices;
        }
    };
    const handleRowClick = async (_: Record<string, any>, index: number) => {
        const invoices = getFilteredInvoices();
        const inv = invoices[index];
        if (!inv || !payrollData)
            return;
        let invoice = await fetchInvoiceByUUID(inv.uuid).catch(() => null);
        const company = `${payrollData.company?.companyName || ""} ${payrollData.company?.companyType || ""}`.trim();
        const total = typeof inv.total === "string" ? parseFloat(inv.total) : inv.total || 0;
        const tokenSymbol = n(payrollData.token?.symbol || "USDC");
        openModal<InvoiceModalProps>("INVOICE_MODAL", {
            onConfirm: inv.status === "SENT" ? async () => {
                await confirmInvoice(inv.uuid);
                toast.success("Invoice confirmed and bill created");
                router.push("/bill");
            } : undefined,
            invoice: {
                invoiceNumber: invoice?.invoiceNumber || inv.invoiceNumber || "",
                from: {
                    name: invoice?.fromDetails?.name || inv.fromDetails?.name || payrollData.employee.name || "",
                    company: "",
                    address: invoice?.fromDetails?.address || "",
                    email: invoice?.fromDetails?.email || inv.fromDetails?.email || payrollData.employee.email || "",
                },
                billTo: {
                    name: company,
                    company: company,
                    address: invoice ? [
                        invoice.toDetails?.address1,
                        invoice.toDetails?.address2,
                        invoice.toDetails?.city,
                        invoice.toDetails?.country,
                    ].filter(Boolean).join(", ") : "",
                    email: invoice?.toDetails?.email || "",
                },
                date: invoice?.createdAt || inv.createdAt,
                dueDate: invoice?.dueDate || inv.dueDate || "",
                network: payrollData.network?.name || "",
                paymentToken: payrollData.token,
                currency: invoice?.currency || inv.currency || tokenSymbol,
                items: invoice?.items
                    ? invoice.items.map((item: any) => ({
                        name: item?.description || "",
                        rate: item?.unitPrice || 0,
                        qty: item?.quantity || 0,
                        amount: item?.total || 0,
                    }))
                    : [{ name: `Monthly salary - ${new Date(inv.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, rate: total, qty: 1, amount: total }],
                subtotal: total,
                tax: 0,
                total,
                walletAddress: payrollData.employee.walletAddress || "",
                amountDue: total.toString(),
            },
        });
    };
    const isEmployeeRoute = typeof params?.id === "string";
    const employeeGroupList = (groups || []).filter((g: any) => getEmployeeGroupIds(employeeData ?? payrollData?.employee).includes(g.id));
    const breadcrumbGroupName = (employeeGroupList[0] as any)?.name;
    useEffect(() => {
        if (payrollData?.employee) {
            const crumbClass = "text-text-secondary transition-colors cursor-pointer hover:text-text-primary";
            setTitle(<div className="flex items-center gap-1.5 text-[14px]">

          {isEmployeeRoute && (<>

              <span className="text-text-secondary">Contact</span>

              <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>

            </>)}

          <button type="button" onClick={() => router.push(isEmployeeRoute ? "/contact-book" : "/payroll")} className={crumbClass}>

            {isEmployeeRoute ? "Employee" : "Payroll"}

          </button>

          <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>

          {isEmployeeRoute && breadcrumbGroupName && (<>

              <button type="button" onClick={() => router.push(`/contact-book?group=${payrollData.employee.groupId ?? ""}`)} className={crumbClass}>

                {breadcrumbGroupName}

              </button>

              <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>

            </>)}

          <span className="font-medium text-text-primary">{payrollData.employee.name}{isEmployeeRoute ? "" : "'s payroll"}</span>

        </div>);
        }
        setShowBackArrow(false);
        setOnBackClick(undefined);
        return () => {
            setOnBackClick(undefined);
            setShowBackArrow(false);
        };
    }, [payrollData?.employee?.name, isEmployeeRoute, breadcrumbGroupName]);
    if (isLoading) {
        return (<div className="p-5 flex flex-col items-center justify-center w-full h-full">

        <div role="status">

          <svg aria-hidden="true" className="w-8 h-8 text-neutral-tertiary animate-spin fill-brand" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">

            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>

            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>

          </svg>

          <span className="sr-only">Loading...</span>

        </div>

      </div>);
    }
    if (error || !payrollData) {
        return (<div className="p-5 flex flex-col items-center justify-center w-full h-full">

        <p className="text-red-500">Failed to load payroll details</p>

      </div>);
    }
    const paymentHistoryData = getFilteredInvoices().map(invoice => ({
        "Creation date": new Date(invoice.createdAt).toLocaleDateString(),
        Invoice: `${invoice.invoiceNumber}`,
        Chain: (<div className="flex items-center gap-2 justify-center">

        <img className="w-4" alt={payrollData.network?.name || "Arc Testnet"} src={`/chain/${(payrollData.network?.name || "Arc Testnet").toLowerCase().replace(" ", "-")}.svg`}/>

        <span>{payrollData.network?.name || "Arc Testnet"}</span>

      </div>),
        Amount: (<div className="flex items-center gap-2 justify-center">

        <span>{invoice.total}</span>

        <img alt={n(invoice.paymentToken?.symbol)} className="w-4" src={`/token/${n(invoice.paymentToken?.symbol).toLowerCase()}.svg`}/>

      </div>),
        "Due Date": new Date(invoice.dueDate ?? "").toLocaleDateString(),
        Status: (<div className="w-full flex justify-center items-center">

        <Badge text={invoice.status} status={invoice?.status === InvoiceStatusEnum?.CANCELLED
                ? BadgeStatus.FAIL
                : invoice?.status === InvoiceStatusEnum.PAID
                    ? BadgeStatus.SUCCESS
                    : BadgeStatus.AWAITING}/>

      </div>),
    }));
    return (<div className="flex w-full h-full flex-col bg-background">

      

      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">

        <div className="flex items-center gap-3">

          <EmployeeAvatar src={(employeeData as any)?.avatar || (payrollData.employee as any).avatar} seed={payrollData.employee.email || payrollData.employee.walletAddress || payrollData.employee.name} name={payrollData.employee.name} className="w-12 h-12" textClassName="text-lg"/>

          <div className="flex flex-col gap-0.5">

            <div className="flex items-center gap-2">

              <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">{payrollData.employee.name}</h1>

              {isContractor && (<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E97135]/10 text-[#E97135]">Contractor</span>)}

              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? "bg-[#1DAF61]/10 text-[#1DAF61]" : "bg-[#E93544]/10 text-[#E93544]"}`}>

                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#1DAF61]" : "bg-[#E93544]"}`}/>

                {isActive ? "Active" : "Disabled"}

              </span>

            </div>

            <p className="text-[14px] text-text-secondary">{payrollData.employee.email}</p>

          </div>

        </div>

        <div className="flex shrink-0 items-center gap-2.5">

          

          <div className="flex items-center gap-2 rounded-xl border border-primary-divider bg-background px-3 py-2">

            <span className="text-sm font-medium text-text-secondary whitespace-nowrap">

              {isActive ? "Enabled" : "Disabled"}

            </span>

            <ToggleSwitch enabled={isActive} onChange={handleToggleActive}/>

          </div>

          <SecondaryButton text="Edit contact" onClick={handleEditContact} variant="light" buttonClassName="w-fit whitespace-nowrap"/>

          <SecondaryButton text="Remove" onClick={handleRemove} variant="red" buttonClassName="w-fit whitespace-nowrap"/>

        </div>

      </div>



      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 flex flex-col items-start justify-start w-full gap-4">

      

      <div className="flex gap-3 items-stretch w-full">

        

        <div className="flex-1 border border-primary-divider rounded-2xl px-5 py-4 flex flex-col gap-1">

          <span className="text-text-secondary text-sm">Next Payment</span>

          {isActive && nextPaymentDate ? (<span className="text-text-primary text-xl font-bold">

              {nextPaymentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}

            </span>) : (<span className="text-text-secondary text-xl font-bold">None</span>)}

          <span className="text-text-secondary text-xs">{payrollData.paydayDay}th every month</span>

        </div>



        

        <div className="flex-1 border border-primary-divider rounded-2xl px-5 py-4 flex flex-col gap-1">

          <span className="text-text-secondary text-sm">Monthly Amount</span>

          <div className="flex items-center gap-2">

            <img alt={n(payrollData.token.symbol)} className="w-5 h-5" src={`/token/${n(payrollData.token.symbol).toLowerCase()}.svg`}/>

            <span className="text-text-primary text-xl font-bold">

              {payrollData.amount?.toLocaleString()} {n(payrollData.token.symbol)}

            </span>

          </div>

          <span className="text-text-secondary text-xs">

            ≈ ${(Number(payrollData.amount || 0) * usdOf(n(payrollData.token.symbol))).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} USD

          </span>

        </div>



        

        <div className="flex-1 border border-primary-divider rounded-2xl px-5 py-4 flex flex-col gap-1">

          <span className="text-text-secondary text-sm">Contract Remaining</span>

          <span className="text-text-primary text-xl font-bold">{contractMonthsLeft} months</span>

          <span className="text-text-secondary text-xs">

            Until {new Date(payrollData.payEndDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}

          </span>

        </div>



        

        <div className="flex-1 border border-primary-divider rounded-2xl px-5 py-4 flex flex-col gap-1">

          <span className="text-text-secondary text-sm">{employeeGroupList.length > 1 ? "Groups" : "Group"}</span>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">

            {employeeGroupList.length ? (employeeGroupList.map((g: any) => <CategoryBadge key={g.id} color={g.color || "#35ADE9"} name={g.name}/>)) : (<CategoryBadge color="#35ADE9" name="-"/>)}

          </div>

        </div>

      </div>



      

      <div className="flex gap-3 items-start w-full">

        

        <div className="flex-1 border border-primary-divider rounded-2xl px-4 py-3 flex gap-3 items-center">

          <div className="flex flex-col gap-1 w-[99px]">

            <div className={labelStyles}>Network</div>

            <div className={labelStyles}>Token</div>

            <div className={labelStyles}>Address</div>

          </div>

          <div className="flex-1 flex flex-col gap-1">

            <div className="py-1 flex items-center gap-2">

              <img className="w-5" alt={payrollData.network?.name || ""} src={`/chain/${(payrollData.network?.name || "Arc Testnet").toLowerCase().replace(" ", "-")}.svg`}/>

              <span className="text-base font-medium text-text-primary">{payrollData.network?.name || "-"}</span>

            </div>

            <div className="py-1 flex items-center gap-2">

              <img alt={n(payrollData.token.symbol)} className="w-5 h-5" src={`/token/${n(payrollData.token.symbol).toLowerCase()}.svg`}/>

              <span className="text-base font-medium text-text-primary">{n(payrollData.token.symbol)}</span>

            </div>

            <div className="py-1 flex items-center gap-2 justify-start">

              <span className="text-base font-medium text-text-primary">{payrollData.employee.walletAddress || "-"}</span>

              {payrollData.employee.walletAddress && (<img alt="Copy" className="w-5 h-5 cursor-pointer" src="/misc/copy-icon.svg" onClick={async () => {
                await navigator.clipboard.writeText(payrollData.employee.walletAddress);
                toast.success("Address copied to clipboard");
            }}/>)}

            </div>

          </div>

        </div>



        

        <div className="flex-1 border border-primary-divider rounded-2xl px-4 py-3 flex gap-3 items-center">

          <div className="flex flex-col gap-1 w-[99px]">

            <div className={labelStyles}>Created on</div>

            <div className={labelStyles}>Contract</div>

            <div className={labelStyles}>Payday</div>

          </div>

          <div className="flex-1 flex flex-col gap-1">

            <div className="py-1 text-base font-medium text-text-primary">

              {new Date(payrollData.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}

            </div>

            <div className="py-1 text-base font-medium text-text-primary">

              {new Date(payrollData.joiningDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} - {new Date(payrollData.payEndDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}

            </div>

            <div className="py-1 text-base font-medium text-text-primary">{payrollData.paydayDay}th every month</div>

          </div>

        </div>

      </div>



      

      <div className="w-full flex flex-col">

        <div className="w-full flex items-center justify-between gap-2 border-b border-primary-divider pb-3">

          <TabContainer tabs={[
            { id: "all", label: "All" },
            { id: "awaiting", label: "Awaiting" },
            { id: "paid", label: "Paid" },
        ]} activeTab={activeTab} setActiveTab={setActiveTab} textSize="sm"/>

          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">{getFilteredInvoices().length} invoices</span>
            {payrollData.status === "ACTIVE" && <SecondaryButton text={preparingInvoice ? "Preparing…" : "Prepare invoice"} onClick={() => { if (!preparingInvoice) void handlePrepareInvoice(); }} buttonClassName="w-fit whitespace-nowrap"/>}
          </div>

        </div>

        <div className="w-full pt-5">

          <Table headers={["Creation date", "Invoice", "Chain", "Amount", "Due Date", "Status"]} data={paymentHistoryData} className="w-full" rowClassName="py-5" headerClassName="py-3" showFooter={false} showPagination={false} onRowClick={handleRowClick} actionColumn actionRenderer={(_, index) => {
            const invoice = getFilteredInvoices()[index];
            return invoice?.status === "SENT" ? <button type="button" className="text-primary-blue" onClick={event => { event.stopPropagation(); void handleRowClick({}, index); }}>Review invoice</button> : null;
          }}/>

        </div>

      </div>

      </div>

    </div>);
};
export default PayrollDetail;
