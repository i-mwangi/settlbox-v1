import { useMemo } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import type { DemoEmployee, DemoEmployeeGroup } from "@/presentation/contexts/DemoProvider";
import type { CreateCompanyGroupDto } from "@/presentation/types/dto/employee";
import { CategoryShapeEnum } from "@/presentation/types/enums";
import { modifyWorkspace, useRecordMutation } from "./record-mutation";

type EmployeeInput = Partial<DemoEmployee> & Pick<DemoEmployee, "name" | "walletAddress">;
type EmployeeChanges = Partial<DemoEmployee> & { address?: string; avatar?: string };
export function getEmployeeGroupIds(employee: { groupIds?: number[]; groupId?: number } | null | undefined): number[] {
  return employee?.groupIds?.length ? employee.groupIds : employee?.groupId ? [employee.groupId] : [];
}
function employeeView(employee: DemoEmployee) {
  return { ...employee, token: employee.token || { address: "native-usdc", name: "USD Coin", symbol: "USDC", decimals: 18 }, network: employee.network || { name: "Arc Testnet", chainId: 5042002 } };
}
function useEmployeeList(search?: string, groupId?: number, page = 1, limit = 1000) {
  const { data, isLoaded } = useDemo();
  const all = (data?.employees ?? []).filter(employee => (!search || `${employee.name} ${employee.email}`.toLowerCase().includes(search.toLowerCase())) && (!groupId || getEmployeeGroupIds(employee).includes(groupId))).map(employeeView);
  return { data: { data: all.slice((page - 1) * limit, page * limit), pagination: { total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) } }, isLoading: !isLoaded, isError: false, error: null, refetch: async () => window.dispatchEvent(new Event("settlbox-workspace-refresh")) };
}
export function useGetAllEmployees(page?: number, limit?: number, _options?: unknown) { return useEmployeeList(undefined, undefined, page, limit); }
export function useSearchEmployees(search?: string, groupId?: number, page?: number, limit?: number) { return useEmployeeList(search, groupId, page, limit); }
export function useGetEmployeesByGroup(groupId?: number, page?: number, limit?: number) { return useEmployeeList(undefined, groupId, page, limit); }
export function useGetAllEmployeeGroups(_options?: unknown) {
  const { data, isLoaded } = useDemo();
  const groups = useMemo(() => (data?.employeeGroups ?? []).map(group => ({ ...group, shape: Object.values(CategoryShapeEnum).find(shape => shape === group.shape) || CategoryShapeEnum.CIRCLE })), [data?.employeeGroups]);
  return { data: groups, isLoading: !isLoaded, isError: false, error: null, refetch: async () => window.dispatchEvent(new Event("settlbox-workspace-refresh")) };
}
export function useGetEmployeeStatistics() {
  const { data, isLoaded } = useDemo();
  const all = data?.employees || [];
  const active = all.filter(employee => employee.isActive !== false).length;
  return { data: { total: all.length, active, inactive: all.length - active }, isLoading: !isLoaded };
}
export function useGetEmployeeById(id?: number) {
  const { data, isLoaded } = useDemo();
  const employee = data?.employees.find(employee => employee.id === id);
  return { data: employee ? employeeView(employee) : undefined, isLoading: !isLoaded };
}
export function useCheckEmployeeNameDuplicate(name?: string) {
  const { data, isLoaded } = useDemo();
  return { data: { isDuplicate: !!name && !!data?.employees.some(employee => employee.name.toLowerCase() === name.trim().toLowerCase()) }, isLoading: !isLoaded };
}
export function useCheckEmployeeAddressDuplicate(address?: string) {
  const { data, isLoaded } = useDemo();
  return { data: { isDuplicate: !!address && !!data?.employees.some(employee => employee.walletAddress.toLowerCase() === address.toLowerCase()) }, isLoading: !isLoaded };
}
export function useCheckEmployeeGroupExists(name?: string) {
  const { data, isLoaded } = useDemo();
  return { data: { exists: !!name && !!data?.employeeGroups.some(group => group.name.toLowerCase() === name.trim().toLowerCase()) }, isLoading: !isLoaded };
}
export function useCreateEmployee() {
  return useRecordMutation(async (input: EmployeeInput) => {
    const now = new Date().toISOString();
    let saved: DemoEmployee | undefined;
    await modifyWorkspace("employees", (employees, data) => {
      saved = { ...input, id: Math.max(0, ...employees.map(employee => employee.id)) + 1, email: input.email || "", groupId: input.groupId ?? input.groupIds?.[0] ?? 0, companyId: data.company.id, token: input.token || { address: "native-usdc", name: "USD Coin", symbol: "USDC", decimals: 18 }, network: input.network || { name: "Arc Testnet", chainId: 5042002 }, isActive: input.isActive !== false, createdAt: now, updatedAt: now };
      return [...employees, saved];
    });
    return saved!;
  });
}
export function useCreateEmployeeGroup() {
  return useRecordMutation(async (input: CreateCompanyGroupDto) => {
    const now = new Date().toISOString();
    let saved: DemoEmployeeGroup | undefined;
    await modifyWorkspace("employeeGroups", (groups, data) => {
      saved = { ...input, id: Math.max(0, ...groups.map(group => group.id)) + 1, companyId: data.company.id, order: groups.length, createdAt: now, updatedAt: now };
      return [...groups, saved];
    });
    return saved!;
  });
}
export function useUpdateEmployee() {
  const mutation = useRecordMutation(async (input: { id: number; changes: EmployeeChanges }) => {
    await modifyWorkspace("employees", employees => {
      if (!employees.some(employee => employee.id === input.id)) throw new Error("Employee not found");
      return employees.map(employee => employee.id === input.id ? { ...employee, ...input.changes, walletAddress: input.changes.walletAddress ?? input.changes.address ?? employee.walletAddress, updatedAt: new Date().toISOString() } : employee);
    });
    return { id: input.id };
  });
  return { ...mutation, mutateAsync: (id: number, changes: EmployeeChanges) => mutation.mutateAsync({ id, changes }), mutate: (id: number, changes: EmployeeChanges) => mutation.mutate({ id, changes }) };
}
export function useUpdateEmployeesOrder() {
  return useRecordMutation(async (input: { id: number; order: number }[]) => {
    await modifyWorkspace("employees", employees => employees.map(employee => ({ ...employee, order: input.find(item => item.id === employee.id)?.order ?? employee.order })));
    return { updated: input.length };
  });
}
export function useDeleteEmployee() {
  return useRecordMutation(async (id: number) => {
    await modifyWorkspace("employees", employees => employees.filter(employee => employee.id !== id));
    return { id };
  });
}
export function useBulkDeleteEmployees() {
  return useRecordMutation(async (ids: number[]) => {
    await modifyWorkspace("employees", employees => employees.filter(employee => !ids.includes(employee.id)));
    return { ids };
  });
}
