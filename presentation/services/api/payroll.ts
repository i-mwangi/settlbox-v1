import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import type { DemoData } from "@/presentation/contexts/DemoProvider";
import type { PayrollContract } from "@/types/payroll-contract";
import type { CreatePayroll, PayrollQueryDto, UpdatePayrollDto } from "@/presentation/types/dto/payroll";
import { workspaceFetch } from "./seeded-workspace";

const token = { address: "native-usdc", name: "USD Coin", symbol: "USDC", decimals: 18 };
const network = { name: "Arc Testnet", chainId: 5042002 };

function payrollView(contract: PayrollContract, data: DemoData) {
  return { ...contract, employee: { ...contract.employee, token, network }, company: { companyName: data.company.companyName, companyType: data.company.industry }, paydayDay: contract.payday, network, token, metadata: { durationUnit: "month" as const, payDay: contract.payday, payStartDate: contract.payStartDate, payEndDate: contract.payEndDate }, invoices: data.invoices.filter(invoice => invoice.payrollContractId === contract.id).map(invoice => ({ ...invoice, total: invoice.amountExact || String(invoice.amount), fromDetails: { name: contract.employee.name, email: contract.employee.email }, paymentToken: token })), imported: false };
}
function importedPayrolls(data: DemoData) {
  return data.payrolls.map(payroll => ({ id: -payroll.id, uuid: payroll.uuid, amount: String(payroll.totalAmount), status: payroll.status, createdAt: payroll.createdAt, employee: { id: 0, name: payroll.name, groupId: 0 }, token, network, paydayDay: 0, payrollCycle: 0, contractTerm: "PERMANENT", imported: true }));
}
function useContracts() {
  const { activeEntityId, isLoaded, isLoggedIn } = useDemo();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["payroll-contracts", activeEntityId], queryFn: () => workspaceFetch<PayrollContract[]>(`/api/payroll-contracts?entity=${encodeURIComponent(activeEntityId)}`), enabled: isLoaded && isLoggedIn, staleTime: 0 });
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ["payroll-contracts", activeEntityId] }); };
    window.addEventListener("settlbox-workspace-refresh", refresh);
    return () => window.removeEventListener("settlbox-workspace-refresh", refresh);
  }, [client, activeEntityId]);
  return query;
}
export function useGetPayrolls(query?: PayrollQueryDto) {
  const { data, isLoaded } = useDemo();
  const contracts = useContracts();
  const all = data ? [...(contracts.data || []).map(contract => payrollView(contract, data)), ...importedPayrolls(data)] : [];
  const filtered = all.filter(payroll => (!query?.search || payroll.employee.name.toLowerCase().includes(query.search.toLowerCase())) && (!query?.employeeId || payroll.employee.id === query.employeeId) && (!query?.contractTerm || payroll.contractTerm === query.contractTerm));
  const page = query?.page || 1;
  const limit = query?.limit || 10;
  return { ...contracts, isLoading: !isLoaded || contracts.isLoading, data: { payrolls: filtered.slice((page - 1) * limit, page * limit), pagination: { total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit), hasNext: page * limit < filtered.length, hasPrev: page > 1 } } };
}
export { useGetPayrolls as default };
export function useGetPayrollDetails(id?: number, byEmployee = false) {
  const { data } = useDemo();
  const contracts = useContracts();
  const contract = contracts.data?.find(contract => byEmployee ? contract.employee.id === id : contract.id === id);
  return { ...contracts, data: contract && data ? payrollView(contract, data) : undefined };
}
export function useGetPayrollStats(_companyId?: unknown, _options?: unknown) {
  const contracts = useContracts();
  const records = contracts.data || [];
  const active = records.filter(record => record.status === "ACTIVE");
  return { ...contracts, data: { schedule: active.map(row => ({ name: row.employee.name, date: row.payStartDate, amount: row.amount })).sort((a, b) => a.date.localeCompare(b.date)), totalActive: active.length, totalPaused: records.filter(record => record.status === "PAUSED").length, totalCompleted: records.filter(record => record.status === "COMPLETED").length, totalMonthlyAmount: active.reduce((sum, record) => sum + Number(record.amount), 0).toString(), totalPayees: active.length, dueThisMonth: active.length, nextPayDate: active.map(record => record.payStartDate).sort()[0] || null } };
}
export function useGetPayrollPendingReviews(id?: number) {
  const { data, isLoaded } = useDemo();
  const pending = data?.invoices.filter(invoice => invoice.payrollContractId === id && invoice.status === "SENT") || [];
  return { data: { pending, hasPendingReviews: pending.length > 0, pendingCount: pending.length, pendingInvoiceUuids: pending.map(invoice => invoice.uuid) }, isLoading: !isLoaded, isError: false, error: null };
}
function useContractMutation<Input>(method: "POST" | "PATCH", build: (input: Input) => unknown) {
  const { activeEntityId } = useDemo();
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: Input) => workspaceFetch<PayrollContract>(`/api/payroll-contracts?entity=${encodeURIComponent(activeEntityId)}`, method, build(input)), onSuccess: async () => {
    await client.invalidateQueries({ queryKey: ["payroll-contracts", activeEntityId] });
    window.dispatchEvent(new Event("settlbox-workspace-refresh"));
  } });
}
export function useCreatePayroll() { return useContractMutation<CreatePayroll>("POST", input => input); }
export function useUpdatePayroll() { return useContractMutation<{ id: number; data: UpdatePayrollDto }>("PATCH", input => ({ ...input, action: "update" })); }
export function usePausePayroll() { return useContractMutation<number>("PATCH", id => ({ id, action: "pause" })); }
export function useResumePayroll() { return useContractMutation<number>("PATCH", id => ({ id, action: "resume" })); }
export function useDeletePayroll() { return useContractMutation<number>("PATCH", id => ({ id, action: "cancel" })); }
export function useCreateSandboxPayroll() { return useMutation({ mutationFn: async (_input: unknown) => { throw new Error("Create a payroll contract and prepare a test period from its detail screen"); } }); }
