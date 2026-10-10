import { workspaceFetch } from "./seeded-workspace";
import { useRecordMutation } from "./record-mutation";
import type { PaymentExecution } from "@/types/finance";

export function useApproveTreasuryProposal() {
  return useRecordMutation(async (input: { proposal: { uuid: string }; accountPublicKeys?: string[] }) => {
    const result = await workspaceFetch<{ execution: PaymentExecution }>(`/api/treasury/payments/${encodeURIComponent(input.proposal.uuid)}/approve`, "POST", {});
    await workspaceFetch(`/api/business-records/${encodeURIComponent(input.proposal.uuid)}`, "PATCH", { action: "refresh" });
    window.dispatchEvent(new Event("settlbox-workspace-refresh"));
    return result;
  });
}
export function useRefreshTreasuryProposal() {
  return useRecordMutation(async (input: { proposalId?: number; proposal: { uuid: string } }) => {
    const result = await workspaceFetch(`/api/business-records/${encodeURIComponent(input.proposal.uuid)}`, "PATCH", { action: "refresh" });
    window.dispatchEvent(new Event("settlbox-workspace-refresh"));
    return result;
  });
}
export function useCancelTreasuryProposal() {
  return useRecordMutation(async (input: { proposalUuid: string }) => workspaceFetch(`/api/business-records/${encodeURIComponent(input.proposalUuid)}`, "PATCH", { action: "cancel" }));
}
