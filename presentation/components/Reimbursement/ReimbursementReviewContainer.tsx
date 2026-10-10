"use client";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PrimaryButton } from "../Common/PrimaryButton";
import { useReimbursements } from "@/presentation/services/api/reimbursements";

import toast from "react-hot-toast";
const ROW_GRID = "grid grid-cols-[1.7fr_1.5fr_104px_72px_132px] gap-3 items-center";
const ReimbursementItem = ({ employeeName, description, amount, currency, category, date, }: {
    employeeName: string;
    description: string;
    amount: number;
    currency: string;
    category: string;
    date: string;
}) => {
    const initials = employeeName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    return (<div className={`${ROW_GRID} border-b border-primary-divider px-5 py-3.5 transition-colors last:border-b-0 hover:bg-app-background/50`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7D52F4]/10 text-xs font-bold text-[#7D52F4]">
          {initials}
        </div>
        <span className="truncate text-sm font-medium text-text-primary">{employeeName}</span>
      </div>
      <span className="truncate text-sm text-text-secondary">{description}</span>
      <span className="w-fit rounded-full bg-app-background px-2.5 py-1 text-xs font-medium text-text-secondary">
        {category}
      </span>
      <span className="text-sm text-text-secondary">
        {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
        <img src={`/token/${currency.toLowerCase()}.svg`} alt={currency} className="h-5 w-5"/>
        <span className="text-sm font-semibold text-text-primary">
          {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
        </span>
      </div>
    </div>);
};
const ReimbursementReviewContainer = () => {
    const router = useRouter();
    const { setTitle, setShowBackArrow } = useTitle();
    const { records, error, busy, action } = useReimbursements();
    const [submitting, setSubmitting] = useState(false);
    const pending = records.filter(row => !row.historical && row.status === "pending");
    const total = pending.reduce((sum, r) => sum + r.amount, 0);
    const { register, watch } = useForm({
        defaultValues: {
            proposalDescription: "",
        },
    });
    const proposalDescription = watch("proposalDescription");
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/reimbursement")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Reimbursement
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Review</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    const handlePropose = async () => {
        setSubmitting(true);
        try {
            for (const record of pending) await action({ action: "approve", id: record.id, note: proposalDescription });
            toast.success("Expenses approved. Submit each payment from the reimbursement list.");
            router.push("/reimbursement");
        } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Approval did not complete; refresh to see saved changes"); }
        finally { setSubmitting(false); }
    };
    return (<div className="flex w-full h-full flex-col bg-background">{error && <p role="alert" className="p-4 text-red-600">{error}</p>}
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Review reimbursements</h1>
          <p className="text-[14px] text-text-secondary">
            Review pending expenses before submitting individual treasury payments.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-1 min-h-0 flex-row gap-5 px-6 pb-6">
        
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-primary-divider bg-background">
          <div className="flex items-center justify-between gap-2 border-b border-primary-divider px-5 py-4">
            <h2 className="text-lg font-semibold text-text-primary">Pending reimbursements</h2>
            <span className="text-sm text-text-secondary">{pending.length} pending</span>
          </div>

          <div className="flex-1 overflow-auto">
            
            <div className={`${ROW_GRID} border-b border-primary-divider bg-app-background px-5 py-2.5`}>
              <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Employee</span>
              <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Description</span>
              <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Category</span>
              <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Date</span>
              <span className="text-right text-xs font-medium uppercase tracking-wide text-text-secondary">Amount</span>
            </div>

            {pending.map((r) => (<ReimbursementItem key={r.id} employeeName={r.employeeName} description={r.description} amount={r.amount} currency={r.currency} category={r.category} date={r.date}/>))}
          </div>
        </div>

        
        <div className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-primary-divider bg-background">
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-text-primary">Payment Overview</h2>
              <p className="text-sm text-text-secondary">Make sure the details are correct before proceeding.</p>
            </div>

            <div className="flex flex-col gap-1">
              <textarea {...register("proposalDescription")} placeholder={`Reimbursement payout for ${pending.length} employee(s)`} aria-label="Proposal description" maxLength={500} className="h-24 w-full resize-none rounded-xl border border-primary-divider bg-background p-3 text-sm text-text-primary outline-none placeholder:text-text-secondary"/>
              {proposalDescription && proposalDescription.length > 0 && (<div className="px-1 text-right text-xs text-text-secondary">{proposalDescription.length}/500</div>)}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <span className="text-sm font-medium text-text-secondary">Total by token</span>
              <div className="flex items-center gap-2 rounded-xl border border-primary-divider bg-app-background px-3 py-2.5">
                <img src="/token/usdc.svg" alt="USDC" className="h-6 w-6"/>
                <span className="text-sm font-semibold text-text-primary">
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-primary-divider px-5 py-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs leading-none text-text-secondary">Total amount</span>
              <span className="num text-xl font-bold leading-none text-text-primary">
                {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
              </span>
            </div>
            <PrimaryButton text="Approve expenses" containerClassName="w-fit" buttonClassName="whitespace-nowrap" onClick={handlePropose} disabled={pending.length === 0 || busy || submitting}/>
          </div>
        </div>
      </div>
    </div>);
};
export default ReimbursementReviewContainer;
