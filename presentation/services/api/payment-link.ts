import { useGetPaymentLinks as useLivePaymentLinks } from "@/services/api/payment-link";
import { demoPaymentLink } from "./demo-shapes";
import { useMemo } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import type { PaymentLinkResponseDto } from "@/presentation/types/dto/payment-link";
export function useGetPaymentLinks() {
    const { data, isLoaded } = useDemo();
    const live = useLivePaymentLinks();
    const links = useMemo<PaymentLinkResponseDto[]>(() => {
        const imported = data?.paymentLinks.map(link => {
            const view = demoPaymentLink(link, data.company);
            return {
                ...view,
                acceptedTokens: view.acceptedTokens ?? [],
                records: (link.payments as unknown[]).map(payment => {
                    const record = payment && typeof payment === "object" ? payment as Record<string, unknown> : {};
                    return {
                        id: Number(record.id),
                        payer: typeof record.payer === "string" ? record.payer : "",
                        payerName: typeof record.payerName === "string" ? record.payerName : null,
                        txid: typeof record.txid === "string" ? record.txid : undefined,
                        paymentMethod: record.paymentMethod === "card" ? "card" as const : "crypto" as const,
                        createdAt: String(record.createdAt ?? record.paidAt ?? link.createdAt),
                        updatedAt: String(record.updatedAt ?? record.createdAt ?? record.paidAt ?? link.createdAt),
                    };
                }),
            };
        }) ?? [];
        return [...(live.data ?? []), ...imported.filter(link => !live.data?.some(current => current.code === link.code))];
    }, [data, live.data]);
    return { ...live, data: links, isLoading: !isLoaded || live.isLoading };
}
export { useGetPaymentLinkByCode } from "@/services/api/payment-link";
export function useGetPaymentLinkByCodeForOwner(code?: string) {
    const links = useGetPaymentLinks();
    const paymentLink = useMemo(() => {
        const link = links.data.find(link => link.code === code);
        return link ? { ...link, acceptedTokens: link.acceptedTokens ?? [], records: link.records ?? [] } : undefined;
    }, [links.data, code]);
    return { ...links, data: paymentLink };
}
export { useCreatePaymentLink, useRecordPayment, useUpdatePaymentLink, useDeactivatePaymentLink, useActivatePaymentLink, useUpdatePaymentTxid, useUpdatePaymentLinkOrder, useDeletePaymentLinks } from "@/services/api/payment-link";
export { useGetPaymentLinks as default };
