import type { NotificationsStatusEnum, NotificationsTypeEnum, NotificationResponseDto, NotificationWithPaginationDto, UnreadCountResponseDto, MarkAllReadResponseDto, } from "@/presentation/types";
export type { NotificationsStatusEnum, NotificationsTypeEnum, NotificationResponseDto, NotificationWithPaginationDto, UnreadCountResponseDto, MarkAllReadResponseDto, };
export enum NotificationType {
    SEND = "SEND",
    CLAIM = "CLAIM",
    REFUND = "REFUND",
    BATCH_SEND = "BATCH_SEND",
    WALLET_CREATE = "WALLET_CREATE",
    REQUEST_PAYMENT = "REQUEST_PAYMENT",
    GIFT_SEND = "GIFT_SEND",
    GIFT_OPEN = "GIFT_OPEN",
    GIFT_CLAIM = "GIFT_CLAIM",
    NOP = "NOP"
}
export enum NotificationStatus {
    UNREAD = "UNREAD",
    READ = "READ"
}
export interface NotificationCardType {
    id: number;
    type: NotificationType;
    title: string;
    subtitle: string | null;
    time: string;
    amount: string;
    tokenAddress: string;
    tokenName: string;
    address: string;
    payee: string;
    recipientCount: number;
    isRead: boolean;
    transactionId: string;
    giftOpener: string;
}
export interface NotificationResponse {
    notifications: NotificationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
