"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavArrowRight } from "iconoir-react";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import { Table } from "@/presentation/components/Common/Table";
import { TabContainer } from "@/presentation/components/Common/TabContainer";
import { Badge, BadgeStatus } from "@/presentation/components/Common/Badge";
import { ModalHeader } from "@/presentation/components/Common/ModalHeader";
import FieldInput from "@/presentation/components/Common/Input/FieldInput";
import BaseModal from "@/presentation/components/Modal/BaseModal";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { MODAL_IDS } from "@/presentation/types/modal";
import toast from "react-hot-toast";
import type { Reimbursement } from "@/types/reimbursement";
import type { CompanyContactResponseDto } from "@/presentation/types/dto/employee";
import { ReimbursementActions } from "@/presentation/components/Reimbursement/ReimbursementActions";
import { useReimbursements } from "@/presentation/services/api/reimbursements";
const CATEGORY_OPTIONS = ["Meals", "Travel", "Transport", "Software", "Office", "Conference", "Other"];
function ReimbursementSidebar({ isOpen, onClose, onSubmit, }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (r: Reimbursement) => Promise<void>;
}) {
    const { openModal } = useModal();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [employee, setEmployee] = useState("");
    const [employeeEmail, setEmployeeEmail] = useState("");
    const [recipient, setRecipient] = useState("");
    const [requestId, setRequestId] = useState(() => crypto.randomUUID());
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [categoryOpen, setCategoryOpen] = useState(false);
    const categoryRef = useRef<HTMLDivElement>(null);
    const [selectedToken, setSelectedToken] = useState<{
        symbol: string;
        icon: string;
    } | null>({ symbol: "USDC", icon: "/token/usdc.svg" });
    useEffect(() => {
        if (!categoryOpen)
            return;
        const handler = (e: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node))
                setCategoryOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [categoryOpen]);
    const resetForm = () => {
        setFile(null);
        setFilePreview(null);
        setEmployee("");
        setEmployeeEmail("");
        setRecipient("");
        setRequestId(crypto.randomUUID());
        setDescription("");
        setAmount("");
        setCategory("");
        setSelectedToken({ symbol: "USDC", icon: "/token/usdc.svg" });
    };
    const handleFile = useCallback((f: File) => {
        if (!["image/png", "image/jpeg"].includes(f.type) || f.size > 2 * 1024 * 1024) {
            toast.error("Upload a PNG or JPEG receipt up to 2 MB");
            return;
        }
        setFile(f);
        setFilePreview(null);
    }, []);
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === "dragenter" || e.type === "dragover");
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0])
            handleFile(e.dataTransfer.files[0]);
    };
    const handleSubmit = async () => {
        if (!employee.trim()) {
            toast.error("Employee name is required");
            return;
        }
        if (!amount || Number(amount) <= 0) {
            toast.error("Valid amount is required");
            return;
        }
        setExtracting(true);
        try {
        let receiptUrl: string | null = filePreview;
        if (file && !receiptUrl) {
            const form = new FormData();
            form.append("file", file);
            const response = await fetch("/api/uploads", { method: "POST", body: form });
            const result = await response.json() as { url?: string; error?: string };
            if (!response.ok || !result.url) throw new Error(result.error || "Receipt upload failed");
            receiptUrl = result.url;
            setFilePreview(result.url);
        }
        await onSubmit({
            id: requestId,
            recipient, amountExact: amount, historical: false, businessRecordId: null, transactionHash: null,
            employeeName: employee.trim(),
            description: description.trim() || "Expense",
            amount: Number(amount),
            currency: "USDC",
            category: category || "Other",
            date: new Date().toISOString().split("T")[0],
            status: "pending",
            receiptUrl,
            receiptName: file?.name || null,
        });
        toast.success("Reimbursement submitted");
        resetForm();
        onClose();
        } catch (error) { toast.error(error instanceof Error ? error.message : "Expense was not saved"); }
        finally { setExtracting(false); }
    };
    const inputClass = "bg-background rounded-xl border border-primary-divider";
    const labelClass = "text-text-secondary text-xs font-medium leading-none";
    return (<>
      
      {isOpen && (<div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose}/>)}

      
      <div className="fixed top-0 right-0 h-full w-[460px] z-50 bg-background border-l border-primary-divider flex flex-col transition-transform duration-300 ease-in-out" style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}>
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-divider">
          <div className="flex items-center gap-2">
            <img src="/sidebar/bill.svg" alt="" className="w-5 h-5"/>
            <span className="text-text-primary font-bold">New Reimbursement</span>
          </div>
          <div className="w-7 h-7 bg-app-background rounded-lg flex justify-center items-center border-b-2 border-secondary-divider cursor-pointer" onClick={() => { resetForm(); onClose(); }}>
            <img src="/misc/close-icon.svg" alt="close"/>
          </div>
        </div>

        
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          
          {!file ? (<div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors ${dragActive ? "border-primary-blue bg-blue-50" : "border-primary-divider bg-app-background"}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden"/>
              <img src="/sidebar/bill.svg" alt="" className="w-8 h-8 opacity-30"/>
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-text-primary">Drop receipt here</p>
                <p className="text-xs text-text-secondary">JPG and PNG supported</p>
              </div>
              <SecondaryButton text="Choose File" onClick={() => inputRef.current?.click()} buttonClassName="w-fit" variant="light"/>
            </div>) : (<div className="flex flex-col gap-3">
              
              {filePreview && (<div className="relative rounded-xl overflow-hidden border border-primary-divider bg-app-background">
                  <img src={filePreview} alt="Receipt" className="w-full max-h-[240px] object-contain"/>
                </div>)}

              
              {!filePreview && file && (<div className="rounded-xl border border-primary-divider bg-app-background flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-12 h-12 rounded-xl bg-[#E93544]/10 flex items-center justify-center">
                    <span className="text-[#E93544] text-sm font-bold">PDF</span>
                  </div>
                  <span className="text-text-primary text-sm font-medium">{file.name}</span>
                  <span className="text-text-secondary text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                </div>)}

              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-app-background border border-primary-divider">
                <div className="w-8 h-8 rounded-lg bg-primary-blue/10 flex items-center justify-center shrink-0">
                  <span className="text-primary-blue text-[10px] font-bold">{file.name.split(".").pop()?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium truncate">{file.name}</p>
                </div>
                {extracting ? (<div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-blue border-t-transparent rounded-full animate-spin"/>
                    <span className="text-xs text-primary-blue">Saving...</span>
                  </div>) : (<Badge status={BadgeStatus.SUCCESS} text="Attached"/>)}
                <img src="/misc/close-icon.svg" alt="remove" className="w-4 h-4 cursor-pointer opacity-40 hover:opacity-100" onClick={resetForm}/>
              </div>
            </div>)}

          
          <div className={`${inputClass} cursor-pointer`} onClick={() => openModal(MODAL_IDS.SELECT_EMPLOYEE, {
            onSave: (emp: CompanyContactResponseDto) => {
                setRecipient(emp.walletAddress);
                setEmployee(emp.name);
                setEmployeeEmail(emp.email || "");
            },
        })}>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              {employee ? (<div className="flex items-center gap-3 flex-1">
                  <div className="w-7 h-7 rounded-full bg-primary-blue/10 flex items-center justify-center text-primary-blue text-xs font-bold shrink-0">
                    {employee.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-text-primary text-sm font-medium">{employee}</span>
                    {employeeEmail && <span className="text-text-secondary text-xs">{employeeEmail}</span>}
                  </div>
                </div>) : (<div className="flex flex-col gap-1 flex-1">
                  <span className={labelClass}>Employee</span>
                  <span className="text-text-secondary text-sm">Select employee</span>
                </div>)}
              <img src="/arrow/chevron-down.svg" alt="" className="w-5 h-5"/>
            </div>
          </div>

          <FieldInput label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?"/>

          
          <div className={`${inputClass} cursor-pointer`} onClick={() => openModal(MODAL_IDS.SELECT_TOKEN, {
            selectedToken: null,
            onTokenSelect: () => { setSelectedToken({ symbol: "USDC", icon: "/token/usdc.svg" }); },
        })}>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <div className="flex items-center gap-3 flex-1">
                {selectedToken ? (<>
                    <img src={selectedToken.icon} alt="" className="w-7 h-7 shrink-0"/>
                    <div className="flex flex-col">
                      <span className={labelClass}>Reimburse with</span>
                      <span className="text-text-primary text-sm font-medium">{selectedToken.symbol}</span>
                    </div>
                  </>) : (<div className="flex flex-col gap-1">
                    <span className={labelClass}>Reimburse with</span>
                    <span className="text-text-secondary text-sm">Select token</span>
                  </div>)}
              </div>
              <img src="/arrow/chevron-down.svg" alt="" className="w-5 h-5"/>
            </div>
          </div>

          <div className="flex gap-3">
            <FieldInput containerClassName="flex-1" label="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"/>
            <div className="relative flex flex-1 flex-col" ref={categoryRef}>
              <label className="mb-1.5 text-[13px] font-medium text-text-primary">Category</label>
              <button type="button" onClick={() => setCategoryOpen((o) => !o)} className={`flex h-[46px] w-full items-center justify-between rounded-xl border bg-background pl-3.5 pr-3 text-left text-[14px] outline-none transition ${categoryOpen ? "border-primary-blue ring-2 ring-primary-blue/15" : "border-primary-divider"} ${category ? "text-text-primary" : "text-[#C1C1C1]"}`}>
                <span className="truncate">{category || "Select category"}</span>
                <img src="/arrow/chevron-down.svg" alt="" className={`h-4 w-4 shrink-0 transition-transform ${categoryOpen ? "rotate-180" : ""}`}/>
              </button>
              {categoryOpen && (<div className="absolute bottom-full left-0 right-0 z-50 mb-1.5 max-h-60 overflow-y-auto rounded-xl border border-primary-divider bg-background p-1.5 shadow-lg">
                  {(category && !CATEGORY_OPTIONS.includes(category)
                ? [category, ...CATEGORY_OPTIONS]
                : CATEGORY_OPTIONS).map((c) => (<button key={c} type="button" onClick={() => {
                    setCategory(c);
                    setCategoryOpen(false);
                }} className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-app-background ${category === c ? "bg-app-background font-medium text-text-primary" : "text-text-primary"}`}>
                      {c}
                    </button>))}
                </div>)}
            </div>
          </div>
        </div>

        
        <div className="flex gap-2 p-5 border-t border-primary-divider">
          <SecondaryButton text="Cancel" onClick={() => { resetForm(); onClose(); }} variant="light" buttonClassName="flex-1"/>
          <PrimaryButton text="Submit" onClick={handleSubmit} containerClassName="flex-1" disabled={extracting}/>
        </div>
      </div>
    </>);
}
function ReceiptPreviewModal({ isOpen, onClose, reimbursement, }: {
    isOpen: boolean;
    onClose: () => void;
    reimbursement: Reimbursement | null;
}) {
    if (!isOpen || !reimbursement)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Receipt Preview" onClose={onClose} icon="/sidebar/bill.svg"/>
      <div className="flex flex-col w-[480px] p-5 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background gap-4">
        {reimbursement.receiptUrl && (<div className="rounded-xl overflow-hidden border border-primary-divider bg-app-background">
            <img src={reimbursement.receiptUrl} alt="Receipt" className="w-full max-h-[280px] object-contain"/>
          </div>)}

        <div className="flex flex-col gap-3">
          {[
            { label: "From", value: reimbursement.employeeName },
            { label: "Description", value: reimbursement.description },
            { label: "Amount", value: `$${reimbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, bold: true },
            { label: "Date", value: new Date(reimbursement.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
        ].map(({ label, value, bold }) => (<div key={label} className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">{label}</span>
              <span className={`text-text-primary text-sm ${bold ? "font-bold" : "font-medium"}`}>{value}</span>
            </div>))}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Category</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-app-background border border-primary-divider text-text-primary">
              {reimbursement.category}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">Status</span>
            <Badge status={reimbursement.status === "paid" ? BadgeStatus.SUCCESS
            : reimbursement.status === "rejected" ? BadgeStatus.FAIL
                : reimbursement.status === "approved" ? BadgeStatus.AWAITING
                    : BadgeStatus.NEUTRAL} text={reimbursement.status.charAt(0).toUpperCase() + reimbursement.status.slice(1)} className="px-3"/>
          </div>
        </div>

        <SecondaryButton text="Close" onClick={onClose} variant="light"/>
      </div>
    </BaseModal>);
}
const Card = ({ title, text }: {
    title: string;
    text: React.ReactNode;
}) => {
    return (<div className="relative w-full h-full rounded-xl border border-primary-divider p-4 flex flex-col overflow-hidden gap-3" style={{
            backgroundImage: `url(/card/background.svg)`,
            backgroundSize: "30%",
            backgroundPosition: "right",
            backgroundRepeat: "no-repeat",
        }}>
      <span className="text-text-secondary text-sm leading-none">{title}</span>
      {text}
    </div>);
};
const ReimbursementPage = () => {
    const router = useRouter();
    const { setTitle, setShowBackArrow } = useTitle();
    const { records: reimbursements, error, busy, action } = useReimbursements();
    const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "paid">("all");
    const [showSidebar, setShowSidebar] = useState(false);
    const [previewItem, setPreviewItem] = useState<Reimbursement | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <span className="text-text-secondary">Expenses</span>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Reimbursement</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    const pending = reimbursements.filter(r => !r.historical && r.status === "pending");
    const pendingTotal = pending.reduce((sum, r) => sum + r.amount, 0);
    const filteredReimbursements = activeTab === "all" ? reimbursements : reimbursements.filter((r) => r.status === activeTab);
    const handleAddReimbursement = async (record: Reimbursement) => {
        await action({ action: "create", record });
    };
    const handlePayAll = () => {
        router.push("/reimbursement/review");
    };
    const tableHeaders = ["Employee", "Description", "Category", "Date", "Amount", "Status", "Receipt", "Actions"];
    const tableData = filteredReimbursements.map((r) => ({
        Actions: <ReimbursementActions record={r} busy={busy} execute={(operation, id) => action({ action: operation, id })}/>,
        Employee: (<div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#7D52F4]/10 flex items-center justify-center text-[#7D52F4] text-xs font-bold shrink-0">
          {r.employeeName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <span className="text-text-primary text-sm font-medium">{r.employeeName}</span>
      </div>),
        Description: <span className="text-text-primary text-sm">{r.description}</span>,
        Category: (<div className="flex items-center justify-center">
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-app-background border border-primary-divider text-text-primary">
          {r.category}
        </span>
      </div>),
        Date: (<span className="text-text-secondary text-sm">
        {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>),
        Amount: (<div className="flex items-center justify-center gap-1.5">
        <img src={`/token/${r.currency.toLowerCase()}.svg`} alt={r.currency} className="w-4 h-4"/>
        <span className="text-text-primary text-sm font-medium">
          {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {r.currency}
        </span>
      </div>),
        Status: (<div className="flex justify-center">
        <Badge status={r.status === "paid" ? BadgeStatus.SUCCESS
                : r.status === "rejected" ? BadgeStatus.FAIL
                    : r.status === "approved" ? BadgeStatus.AWAITING
                        : BadgeStatus.NEUTRAL} text={r.status.charAt(0).toUpperCase() + r.status.slice(1)}/>
      </div>),
        Receipt: r.receiptName ? (<div className="flex items-center justify-center">
        <div className="flex items-center gap-1.5 bg-app-background rounded-full px-2.5 py-1 border border-primary-divider">
          <span className="text-primary-blue text-[10px] font-bold">
            {r.receiptName.split(".").pop()?.toUpperCase()}
          </span>
          <span className="text-text-secondary text-xs">View</span>
        </div>
      </div>) : (<span className="text-text-secondary text-xs text-center block">No file</span>),
    }));
    const handleRowClick = (_: Record<string, any>, index: number) => {
        setPreviewItem(filteredReimbursements[index]);
    };
    const paidThisMonthTotal = reimbursements
        .filter(r => !r.historical && r.status === "paid" && r.settledAt?.startsWith(new Date().toISOString().slice(0, 7)))
        .reduce((s, r) => s + r.amount, 0);
    return (<div className="flex w-full h-full flex-col">{error && <p role="alert" className="p-4 text-red-600">{error}</p>}
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Reimbursement</h1>
          <p className="text-[14px] text-text-secondary">
            Review saved expense claims, attach receipts and submit approved USDC payments.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SecondaryButton text="New Reimbursement" variant="light" onClick={() => setShowSidebar(true)} buttonClassName="w-fit whitespace-nowrap"/>
          <PrimaryButton text={`Review (${pending.length})`} onClick={handlePayAll} containerClassName="w-fit" buttonClassName="whitespace-nowrap" disabled={pending.length === 0}/>
        </div>
      </div>

      
      <div className="flex w-full flex-row gap-2 px-6 pb-2">
        <Card title="Pending requests" text={<span className="num text-text-primary text-2xl leading-none">{pending.length}</span>}/>
        <Card title="Pending amount" text={<span className="num text-text-primary text-2xl leading-none">
              ${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>}/>
        <Card title="Total this month" text={<span className="num text-text-primary text-2xl leading-none">{reimbursements.filter(record => !record.historical && record.date.startsWith(new Date().toISOString().slice(0, 7))).length}</span>}/>
        <Card title="Paid this month" text={<span className="num text-text-primary text-2xl leading-none">
              ${paidThisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>}/>
      </div>

      
      <div className="mt-2 flex w-full items-center justify-between gap-2 border-b border-primary-divider px-6 pb-3">
        <TabContainer tabs={[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "approved", label: "Approved" },
            { id: "paid", label: "Paid" },
        ]} activeTab={activeTab} setActiveTab={setActiveTab} textSize="sm"/>
        <span className="text-sm text-text-secondary">{filteredReimbursements.length} requests</span>
      </div>

      
      <div className="w-full p-5">
        <Table data={tableData} headers={tableHeaders} showFooter={false} showPagination={true} currentPage={currentPage} rowsPerPage={rowsPerPage} onPageChange={setCurrentPage} onRowsPerPageChange={setRowsPerPage} onRowClick={handleRowClick}/>
      </div>

      
      <ReimbursementSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} onSubmit={handleAddReimbursement}/>

      
      <ReceiptPreviewModal isOpen={!!previewItem} onClose={() => setPreviewItem(null)} reimbursement={previewItem}/>

      
    </div>);
};
export default ReimbursementPage;
