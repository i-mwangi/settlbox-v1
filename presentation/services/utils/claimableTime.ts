import { SchedulePaymentFrequency } from "@/presentation/types/schedule-payment";
import { BLOCK_TIME } from "./constant";
const DAYS_IN_MONTH = 30;
const SECONDS_PER_DAY = 24 * 60 * 60;
export interface ClaimableTimeResult {
    claimableDate: Date;
    formattedDate: string;
    blocksToWait: number;
    timelockHeight: number;
}
function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}
export async function calculateClaimableTime(transactionIndex: number, frequency: SchedulePaymentFrequency, currentHeight: number, createdAt: Date | string | number): Promise<ClaimableTimeResult> {
    const now = new Date(createdAt);
    let firstClaimableDate: Date;
    let blocksPerPeriod: number;
    switch (frequency) {
        case SchedulePaymentFrequency.DAILY:
            blocksPerPeriod = Math.floor((1 * SECONDS_PER_DAY) / BLOCK_TIME);
            firstClaimableDate = new Date(now);
            firstClaimableDate.setUTCDate(firstClaimableDate.getUTCDate() + 1);
            firstClaimableDate.setUTCHours(0, 0, 0, 0);
            break;
        case SchedulePaymentFrequency.WEEKLY:
            blocksPerPeriod = Math.floor((7 * SECONDS_PER_DAY) / BLOCK_TIME);
            firstClaimableDate = new Date(now);
            firstClaimableDate.setUTCHours(0, 0, 0, 0);
            if (firstClaimableDate.getTime() < now.getTime()) {
                firstClaimableDate.setUTCDate(firstClaimableDate.getUTCDate() + 7);
            }
            break;
        case SchedulePaymentFrequency.MONTHLY:
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
            blocksPerPeriod = Math.floor((daysInCurrentMonth * SECONDS_PER_DAY) / BLOCK_TIME);
            firstClaimableDate = new Date(now);
            firstClaimableDate.setUTCHours(0, 0, 0, 0);
            if (firstClaimableDate.getTime() < now.getTime()) {
                firstClaimableDate.setUTCMonth(firstClaimableDate.getUTCMonth() + 1);
            }
            break;
        default:
            blocksPerPeriod = Math.floor((DAYS_IN_MONTH * SECONDS_PER_DAY) / BLOCK_TIME);
            firstClaimableDate = new Date(now);
            firstClaimableDate.setUTCDate(firstClaimableDate.getUTCDate() + 1);
            firstClaimableDate.setUTCHours(0, 0, 0, 0);
    }
    let claimableDate: Date;
    if (transactionIndex === 0) {
        claimableDate = firstClaimableDate;
    }
    else {
        claimableDate = new Date(firstClaimableDate);
        switch (frequency) {
            case SchedulePaymentFrequency.DAILY:
                claimableDate.setUTCDate(claimableDate.getUTCDate() + transactionIndex);
                break;
            case SchedulePaymentFrequency.WEEKLY:
                claimableDate.setUTCDate(claimableDate.getUTCDate() + transactionIndex * 7);
                break;
            case SchedulePaymentFrequency.MONTHLY:
                const targetMonth = new Date(claimableDate);
                targetMonth.setUTCMonth(targetMonth.getUTCMonth() + transactionIndex);
                if (targetMonth.getUTCMonth() !== (claimableDate.getUTCMonth() + transactionIndex) % 12) {
                    targetMonth.setUTCMonth(claimableDate.getUTCMonth() + transactionIndex, 0);
                }
                claimableDate = targetMonth;
                break;
            default:
                claimableDate.setUTCDate(claimableDate.getUTCDate() + transactionIndex);
        }
    }
    const millisecondsToWait = claimableDate.getTime() - Date.now();
    const secondsToWait = Math.max(0, Math.floor(millisecondsToWait / 1000));
    const blocksToWait = Math.ceil(secondsToWait / BLOCK_TIME);
    const targetHeight = currentHeight + blocksToWait;
    const day = claimableDate.getDate().toString().padStart(2, "0");
    const month = (claimableDate.getMonth() + 1).toString().padStart(2, "0");
    const year = claimableDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    return {
        claimableDate,
        formattedDate,
        blocksToWait,
        timelockHeight: targetHeight,
    };
}
export async function getClaimableTimeLabel(transactionIndex: number, frequency: SchedulePaymentFrequency, currentHeight: number, createdAt: Date | string | number): Promise<string> {
    const result = await calculateClaimableTime(transactionIndex, frequency, currentHeight, createdAt);
    return `Claimable after ${result.formattedDate}`;
}
