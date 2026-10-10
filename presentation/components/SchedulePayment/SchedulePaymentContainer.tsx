"use client";
import React, { useState, useEffect } from "react";
import { SchedulePaymentItem, SchedulePaymentItemProps } from "./SchedulePaymentItem";
import { useGetSchedulePayments } from "@/presentation/services/api/schedule-payment";
import { SchedulePaymentStatus, SchedulePayment } from "@/presentation/types/schedule-payment";
import { useAccountContext } from "@/presentation/contexts/AccountProvider";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import { useArcNetworkStore } from "@/presentation/contexts/ArcNetworkProvider";
import { ConsumableNote, TransactionStatus } from "@/presentation/types/transaction";
import { USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { useRouter } from "next/navigation";
const UpcomingPaymentHeader = ({ schedulePayments }: {
    schedulePayments: any[] | undefined;
}) => {
    const getNextUpcomingPayment = () => {
        if (!schedulePayments || schedulePayments.length === 0)
            return null;
        const now = new Date();
        const upcomingPayments: Array<{
            payment: any;
            nextDate: Date;
            amount: number;
        }> = [];
        schedulePayments.forEach(payment => {
            if (!payment.transactions || payment.transactions.length === 0)
                return;
            const nextTransaction = payment.transactions.find((tx: any) => {
                if (tx.status === "recalled" || tx.status === "consumed")
                    return false;
                const creationDate = new Date(payment.createdAt);
                creationDate.setHours(0, 0, 0, 0);
                let scheduledDate = new Date(creationDate);
                const txIndex = payment.transactions.indexOf(tx);
                switch (payment.frequency) {
                    case "DAILY":
                        scheduledDate.setDate(creationDate.getDate() + txIndex + 1);
                        break;
                    case "WEEKLY":
                        scheduledDate.setDate(creationDate.getDate() + (txIndex + 1) * 7);
                        break;
                    case "MONTHLY":
                        scheduledDate.setMonth(creationDate.getMonth() + txIndex + 1);
                        break;
                    case "YEARLY":
                        scheduledDate.setFullYear(creationDate.getFullYear() + txIndex + 1);
                        break;
                    default:
                        scheduledDate.setDate(creationDate.getDate() + txIndex + 1);
                }
                return scheduledDate > now;
            });
            if (nextTransaction) {
                const creationDate = new Date(payment.createdAt);
                creationDate.setHours(0, 0, 0, 0);
                let scheduledDate = new Date(creationDate);
                const txIndex = payment.transactions.indexOf(nextTransaction);
                switch (payment.frequency) {
                    case "DAILY":
                        scheduledDate.setDate(creationDate.getDate() + txIndex + 1);
                        break;
                    case "WEEKLY":
                        scheduledDate.setDate(creationDate.getDate() + (txIndex + 1) * 7);
                        break;
                    case "MONTHLY":
                        scheduledDate.setMonth(creationDate.getMonth() + txIndex + 1);
                        break;
                    case "YEARLY":
                        scheduledDate.setFullYear(creationDate.getFullYear() + txIndex + 1);
                        break;
                    default:
                        scheduledDate.setDate(creationDate.getDate() + txIndex + 1);
                }
                upcomingPayments.push({
                    payment,
                    nextDate: scheduledDate,
                    amount: parseFloat(nextTransaction.assets?.[0]?.amount) || 0,
                });
            }
        });
        if (upcomingPayments.length === 0)
            return null;
        const paymentsByDate = upcomingPayments.reduce((acc, item) => {
            const dateKey = item.nextDate.toDateString();
            if (!acc[dateKey] || acc[dateKey].amount < item.amount) {
                acc[dateKey] = item;
            }
            return acc;
        }, {} as Record<string, (typeof upcomingPayments)[0]>);
        const earliestDate = Object.keys(paymentsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
        const result = earliestDate ? paymentsByDate[earliestDate] : null;
        return result;
    };
    const nextPayment = getNextUpcomingPayment();
    if (!nextPayment) {
        return (<div className="flex flex-col justify-center items-center flex-1 h-fit">
        <article className="relative flex-1 text-text-primary rounded-2xl border border-primary-divider bg-background min-w-60 w-full">
          <div className="flex text-lg font-normal font-['Barlow'] rounded-tl-2xl w-[45%] justify-center items-center px-4 py-2">
            <span className="text-text-secondary font-normal">Next upcoming payment</span>
          </div>
          <div className="rounded-[10px] flex justify-center items-center h-[90px] m-2 bg-app-background border border-primary-divider">
            <div className="text-center text-text-secondary">
              <span className="font-['Barlow'] text-sm">No upcoming payments</span>
            </div>
          </div>
        </article>
      </div>);
    }
    const { payment, nextDate, amount } = nextPayment;
    const recipientAddress = payment.payee && payment.payee.length > 14
        ? `${payment.payee.slice(0, 8)}...${payment.payee.slice(-6)}`
        : payment.payee || "Unknown";
    const tokenSymbol = payment.tokens?.[0]?.metadata?.symbol || "USDC";
    let formattedDate = "Unknown";
    let formattedTime = "Unknown";
    try {
        formattedDate = nextDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
        formattedTime = nextDate.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    catch (error) {
        console.error("Error formatting date:", error);
    }
    return (<div className="flex flex-col justify-center items-center flex-1 h-fit">
      <article className="relative flex-1 text-text-primary rounded-2xl border border-primary-divider bg-background min-w-60 w-full">
        <div className="flex text-lg font-normal font-['Barlow'] rounded-tl-2xl w-[45%] justify-center items-center px-4 py-2">
          <span className="text-text-secondary font-normal">Next upcoming payment</span>
        </div>
        <div className="rounded-[10px] flex justify-center items-center h-[90px] m-2 bg-app-background border border-primary-divider">
          
          <div className="flex items-center justify-between overflow-hidden px-4 rounded-[10px] h-full w-full relative">
            
            <div className="flex items-center gap-3 z-10">
              
              <img src={payment.payee ? blo(identiconSeed(payment.payee)) : "/gift/flower.png"} alt="Recipient" className="w-10 h-10 rounded-full bg-cover" onError={e => {
            (e.target as HTMLImageElement).src = "/gift/flower.png";
        }}/>

              
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-['Barlow'] text-text-secondary leading-5">Recipient</span>
                <span className="font-['Barlow'] font-medium text-text-primary leading-5">{recipientAddress}</span>
              </div>
            </div>

            
            <div className="flex flex-col gap-2 items-end z-10">
              
              <div className="flex items-center gap-2">
                <img alt={tokenSymbol} className="w-5 h-5" src={payment.tokens?.[0]?.faucetId === USDC_TOKEN_ADDRESS
            ? "/token/usdc.svg" : `/token/${tokenSymbol.toLowerCase()}.svg`} onError={e => {
            (e.target as HTMLImageElement).src = "/token/any-token.svg";
        }}/>
                <span className="font-repetition-scrolling text-text-primary text-2xl tracking-[2.16px]">
                  {isNaN(amount)
            ? "0.00" : amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              
              <div className="bg-primary-blue flex items-center px-3 py-0.5 rounded">
                <span className="font-['Barlow'] font-medium text-white text-xs leading-[18px]">
                  {formattedDate}, {formattedTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>);
};
const LockedAmountHeader = ({ schedulePayments }: {
    schedulePayments: any[] | undefined;
}) => {
    const calculateLockedAmount = () => {
        if (!schedulePayments || schedulePayments.length === 0)
            return 0;
        return schedulePayments.reduce((total, payment) => {
            if (!payment.transactions || payment.transactions.length === 0)
                return total;
            const transactionTotal = payment.transactions
                .filter((transaction: any) => transaction.status !== "recalled")
                .reduce((sum: number, transaction: any) => {
                const amount = parseFloat(transaction.assets?.[0]?.amount) || 0;
                return sum + amount;
            }, 0);
            return total + transactionTotal;
        }, 0);
    };
    const lockedAmount = calculateLockedAmount();
    return (<div className="flex flex-col justify-center items-center flex-1 h-fit">
      <article className="relative flex-1 text-text-primary rounded-2xl border border-primary-divider bg-background min-w-60 w-full">
        <div className="flex text-lg font-normal font-['Barlow'] rounded-tl-2xl w-[40%] justify-center items-center h-fit px-4 py-2">
          <span className="text-text-secondary text-lg font-normal">Locked Amount</span>
        </div>
        <div className="rounded-[10px] flex justify-center items-center h-[90px] m-2 bg-app-background border border-primary-divider">
          <span className="font-repetition-scrolling text-text-primary text-4xl tracking-[2.16px] flex items-center justify-center gap-2">
            <img alt="USDC" className="w-8 h-8" src="/token/usdc.svg"/>
            {lockedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </article>
    </div>);
};
export const SchedulePaymentContainer = () => {
    const router = useRouter();
    const { setTitle, setShowBackArrow } = useTitle();
    const { accountId } = useAccountContext();
    const { data: schedulePayments } = useGetSchedulePayments({
        payer: accountId,
        status: SchedulePaymentStatus.ACTIVE,
    }) as {
        data: any[] | undefined;
    };
    const blockNum = useArcNetworkStore(state => state.blockNum);
    console.log("schedulePayments", schedulePayments);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Dashboard
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Schedule payment</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [claimableDates, setClaimableDates] = useState<{
        [key: string]: string;
    }>({});
    const calculateTransactionBasedProgress = (executionCount: number, maxExecutions: number, createdAt: string | number, frequency: string): number => {
        try {
            if (maxExecutions === 0)
                return 0;
            const startDate = new Date(createdAt);
            const now = new Date();
            startDate.setHours(0, 0, 0, 0);
            const elapsed = now.getTime() - startDate.getTime();
            let intervalDuration: number;
            switch (frequency) {
                case "DAILY":
                    intervalDuration = 24 * 60 * 60 * 1000;
                    break;
                case "WEEKLY":
                    intervalDuration = 7 * 24 * 60 * 60 * 1000;
                    break;
                case "MONTHLY":
                    intervalDuration = 30 * 24 * 60 * 60 * 1000;
                    break;
                case "YEARLY":
                    intervalDuration = 365 * 24 * 60 * 60 * 1000;
                    break;
                default:
                    intervalDuration = 30 * 24 * 60 * 60 * 1000;
            }
            const intervalsElapsed = Math.floor(elapsed / intervalDuration);
            const progressWithinInterval = ((elapsed % intervalDuration) / intervalDuration) * 100;
            const progressPerInterval = 100 / maxExecutions;
            const completedIntervalsProgress = intervalsElapsed * progressPerInterval;
            const currentIntervalProgress = (progressWithinInterval / 100) * progressPerInterval;
            const totalProgress = completedIntervalsProgress + currentIntervalProgress;
            return Math.min(Math.max(0, totalProgress), 100);
        }
        catch (error) {
            console.error("Error calculating transaction-based progress:", error);
            return 0;
        }
    };
    const startDemo = () => {
        setIsLoading(true);
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsLoading(false);
                    return 100;
                }
                return prev + 2;
            });
        }, 100);
    };
    const renderSchedulePaymentItem = () => {
        return schedulePayments?.map(payment => {
            const totalAmount = parseFloat(payment.amount) * (payment.maxExecutions || 0);
            const claimedAmount = parseFloat(payment.amount) * (payment.executionCount || 0);
            const transformedTransactions: SchedulePaymentItemProps["transactions"] = payment.transactions?.map((tx: ConsumableNote, index: number) => {
                const creationDate = new Date(payment.createdAt);
                creationDate.setHours(0, 0, 0, 0);
                let scheduledDate = new Date(creationDate);
                switch (payment.frequency) {
                    case "DAILY":
                        scheduledDate.setDate(creationDate.getDate() + index + 1);
                        break;
                    case "WEEKLY":
                        scheduledDate.setDate(creationDate.getDate() + (index + 1) * 7);
                        break;
                    case "MONTHLY":
                        scheduledDate.setMonth(creationDate.getMonth() + index + 1);
                        break;
                    case "YEARLY":
                        scheduledDate.setFullYear(creationDate.getFullYear() + index + 1);
                        break;
                    default:
                        scheduledDate.setDate(creationDate.getDate() + index + 1);
                }
                const transactionDate = scheduledDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                });
                const now = Date.now();
                const recallableTime = new Date(tx.recallableTime!).getTime();
                const createdAt = new Date(tx.createdAt!).getTime();
                const totalTimeToRecall = recallableTime - createdAt;
                const elapsedTime = now - createdAt;
                const progress = Math.min(100, Math.max(0, (elapsedTime / totalTimeToRecall) * 100));
                if (tx.timelockHeight &&
                    blockNum &&
                    tx.timelockHeight <= blockNum &&
                    tx.status !== TransactionStatus.RECALLED &&
                    tx.status !== TransactionStatus.CONSUMED) {
                    return {
                        id: tx.id.toString(),
                        noteId: tx.noteId,
                        date: transactionDate,
                        status: "ready_to_claim",
                        label: `Txn ${index + 1}`,
                        progress: progress,
                        amount: tx.assets[0].amount,
                        timelockHeight: tx.timelockHeight,
                        recallableTime: tx.recallableTime,
                        createdAt: tx.createdAt,
                    };
                }
                const result = {
                    id: tx.id.toString(),
                    noteId: tx.noteId,
                    date: transactionDate,
                    status: tx.status as TransactionStatus,
                    label: `Txn ${index + 1}`,
                    progress: progress,
                    amount: tx.assets[0].amount,
                    timelockHeight: tx.timelockHeight,
                    recallableTime: tx.recallableTime,
                    createdAt: tx.createdAt,
                };
                return result;
            });
            return (<SchedulePaymentItem key={payment.id} recipient={{
                    address: `${payment.payee.slice(0, 8)}...${payment.payee.slice(-6)}`,
                    avatar: blo(identiconSeed(payment.payee)),
                    name: `Recipient ${payment.id}`,
                }} totalAmount={totalAmount.toString()} claimedAmount={claimedAmount.toString()} currency={payment.tokens[0]?.metadata?.symbol || "USDC"} progress={calculateTransactionBasedProgress(payment.executionCount || 0, payment.maxExecutions || 0, payment.createdAt || Date.now(), payment.frequency)} claimProgress={(claimedAmount / totalAmount) * 100} transactions={[
                    {
                        id: `creation`,
                        date: new Date(payment.createdAt || Date.now())
                            .toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                            .replace(",", ""),
                        status: TransactionStatus.CONSUMED,
                        label: "Create",
                        progress: 100,
                    },
                    ...(transformedTransactions || []),
                ]}/>);
        });
    };
    return (<div className="flex w-full h-full flex-col bg-background overflow-hidden overflow-y-auto">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Schedule payment</h1>
          <p className="text-[14px] text-text-secondary">
            Track your recurring transfers, upcoming payments and locked balances.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-start gap-2 px-6 pb-6">
        <div className="flex flex-row gap-2">
          <UpcomingPaymentHeader schedulePayments={schedulePayments}/>
          <LockedAmountHeader schedulePayments={schedulePayments}/>
        </div>

        <div className="flex w-full">
          <span className="text-text-primary">All Recurring Transfers ({schedulePayments?.length || 0})</span>
        </div>

        {schedulePayments && schedulePayments.length > 0 ? (<>{renderSchedulePaymentItem()}</>) : (<div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <img src="/schedule-payment/empty-schedule-payment-icon.svg" alt="Empty State" className="scale-100"/>
            <span className="text-text-secondary">You haven’t created any transactions yet.</span>
          </div>)}
      </div>
    </div>);
};
