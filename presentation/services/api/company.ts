import { useDemo } from "@/presentation/contexts/DemoProvider";
import type { DemoCompany } from "@/presentation/contexts/DemoProvider";
import { modifyWorkspace, useRecordMutation } from "./record-mutation";

type CompanyChanges = Partial<DemoCompany> & { companyType?: string; notificationEmail?: string };
export function useGetMyCompany(_options?: { enabled?: boolean }) {
  const { data, isLoaded } = useDemo();
  return { data: data?.company ? { ...data.company, logo: data.company.logo || undefined, verificationStatus: "PENDING" as const, isActive: true, createdBy: data.user.id } : undefined, isLoading: !isLoaded, isError: false, error: null, refetch: async () => window.dispatchEvent(new Event("settlbox-workspace-refresh")) };
}
export function useUpdateCompany() {
  return useRecordMutation(async (input: CompanyChanges) => modifyWorkspace("company", company => ({ ...company, ...input, id: company.id, uuid: company.uuid, industry: input.companyType || input.industry || company.industry, updatedAt: new Date().toISOString() })));
}
export function useCreateCompany() { return useUpdateCompany(); }
export function useDeleteCompany() {
  return useRecordMutation(async (_input: void) => { throw new Error("Company deletion is unavailable while the workspace contains financial history"); });
}
