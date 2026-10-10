"use client";

import { useWorkspaceMutation, useWorkspaceRecords } from "./workspace";
import type { EmployeeContact } from "@/types/workspace";
import type { CompanyGroupResponseDto, CreateCompanyGroupDto } from "@/types/dto/employee";

type Options = { enabled?: boolean };
export function getEmployeeGroupIds(employee: { groupIds?: number[]; groupId?: number } | null | undefined): number[] {
  return employee?.groupIds?.length ? employee.groupIds : employee?.groupId ? [employee.groupId] : [];
}

export function useGetAllEmployees(page = 1, limit = 1000, options?: Options) {
  const query = useWorkspaceRecords<EmployeeContact>("employees", options?.enabled);
  const employees = query.data || [];
  return { ...query, data: { data: employees.slice((page - 1) * limit, page * limit), pagination: { total: employees.length, page, limit, totalPages: Math.ceil(employees.length / limit) } } };
}
export function useGetAllEmployeeGroups(options?: Options) { return useWorkspaceRecords<CompanyGroupResponseDto>("employee-groups", options?.enabled); }
export function useGetEmployeesByGroup(groupId?: number, page = 1, limit = 1000) {
  const query = useGetAllEmployees(1, 1000);
  const employees = query.data.data.filter(employee => !groupId || getEmployeeGroupIds(employee).includes(groupId));
  return { ...query, data: { data: employees.slice((page - 1) * limit, page * limit), pagination: { total: employees.length, page, limit, totalPages: Math.ceil(employees.length / limit) } } };
}
export function useSearchEmployees(search = "", groupId?: number, page = 1, limit = 1000) {
  const query = useGetEmployeesByGroup(groupId, page, limit);
  return { ...query, data: { ...query.data, data: query.data.data.filter(employee => `${employee.name} ${employee.email} ${employee.walletAddress}`.toLowerCase().includes(search.toLowerCase())) } };
}
export function useGetEmployeeById(id?: number) { const query = useWorkspaceRecords<EmployeeContact>("employees"); return { ...query, data: query.data?.find(employee => employee.id === id) }; }
export function useGetEmployeeStatistics() { const query = useWorkspaceRecords<EmployeeContact>("employees"); const employees = query.data || []; return { ...query, data: { total: employees.length, active: employees.filter(employee => employee.isActive).length, inactive: employees.filter(employee => !employee.isActive).length } }; }
export function useCheckEmployeeNameDuplicate(name = "") { const query = useWorkspaceRecords<EmployeeContact>("employees"); return { ...query, data: { isDuplicate: !!name && !!query.data?.some(employee => employee.name.toLowerCase() === name.toLowerCase()) } }; }
export function useCheckEmployeeAddressDuplicate(address = "") { const query = useWorkspaceRecords<EmployeeContact>("employees"); return { ...query, data: { isDuplicate: !!address && !!query.data?.some(employee => employee.walletAddress.toLowerCase() === address.toLowerCase()) } }; }
export function useCheckEmployeeGroupExists(name = "") { const query = useGetAllEmployeeGroups(); return { ...query, data: { exists: !!name && !!query.data?.some(group => group.name.toLowerCase() === name.toLowerCase()) } }; }
export function useCreateEmployee() { return useWorkspaceMutation<EmployeeContact, unknown>("employees", "POST"); }
export function useCreateEmployeeGroup() { return useWorkspaceMutation<CompanyGroupResponseDto, CreateCompanyGroupDto>("employee-groups", "POST"); }
export function useUpdateEmployee() {
  const mutation = useWorkspaceMutation<EmployeeContact, { id: number; data: unknown }>("employees", "PATCH");
  return { ...mutation, mutateAsync: (id: number, data: unknown) => mutation.mutateAsync({ id, data }), mutate: (id: number, data: unknown) => mutation.mutate({ id, data }) };
}
export function useDeleteEmployee() {
  const mutation = useWorkspaceMutation<{ deleted: number }, { ids: number[] }>("employees", "DELETE");
  return { ...mutation, mutateAsync: (id: number) => mutation.mutateAsync({ ids: [id] }), mutate: (id: number) => mutation.mutate({ ids: [id] }) };
}
export function useBulkDeleteEmployees() {
  const mutation = useWorkspaceMutation<{ deleted: number }, { ids: number[] }>("employees", "DELETE");
  return { ...mutation, mutateAsync: (ids: number[]) => mutation.mutateAsync({ ids }), mutate: (ids: number[], options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => mutation.mutate({ ids }, options) };
}
export function useUpdateEmployeesOrder() { return useWorkspaceMutation<EmployeeContact, { id: number; data: { order: number } }>("employees", "PATCH"); }
