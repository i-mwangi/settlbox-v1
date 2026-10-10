import type { PaymentLinkStatusEnum } from '../enums/index';
import { PaymentLinkStatusEnum as PaymentLinkStatusEnumValue } from '../enums/index';
import type { TokenDto } from './token';
import type { NetworkDto } from './network';
export type TokenMetadata = TokenDto;
export type ChainMetadata = NetworkDto;
export { PaymentLinkStatusEnumValue as PaymentLinkStatus };
export { PaymentLinkStatusEnumValue };
export type { PaymentLinkStatusEnum };
export interface CreatePaymentLinkDto {
    title: string;
    description: string;
    amount: string;
    paymentWalletAddress: string;
    acceptedTokens?: TokenDto[];
    acceptedChains?: NetworkDto[];
}
export interface UpdatePaymentLinkDto {
    title?: string;
    description?: string;
    amount?: string;
    status?: PaymentLinkStatusEnum;
    acceptedTokens?: TokenDto[];
    acceptedChains?: NetworkDto[];
}
export interface PaymentRecordDto {
    payer: string;
    txid?: string;
    token?: TokenDto;
    chain?: NetworkDto;
}
export interface PaymentLinkOrderDto {
    linkIds: number[];
}
export interface DeletePaymentLinksDto {
    codes: string[];
}
export interface PaymentLinkRecordDto {
    payerName?: string | null;
    paymentMethod?: "crypto" | "card";
    id: number;
    payer: string;
    txid?: string;
    token?: TokenDto;
    chain?: NetworkDto;
    createdAt: Date | string;
    updatedAt: Date | string;
}
export interface PaymentLinkResponseDto {
    id: number;
    code: string;
    title: string;
    description: string;
    amount: string;
    paymentWalletAddress: string;
    status: PaymentLinkStatusEnum;
    order: number;
    acceptedTokens?: TokenDto[];
    acceptedChains?: NetworkDto[];
    records?: PaymentLinkRecordDto[];
    company: {
        companyName: string;
        companyLogo?: string;
        metadata?: Record<string, any>;
    };
    createdAt: Date | string;
    updatedAt: Date | string;
}
export type PaymentLink = PaymentLinkResponseDto;
export type PaymentLinkRecord = PaymentLinkRecordDto;
