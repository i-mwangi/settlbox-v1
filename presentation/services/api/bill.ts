import { useDemo } from "@/presentation/contexts/DemoProvider";
import { modifyWorkspace, useRecordMutation } from "./record-mutation";
import { readWorkspace, workspaceAction } from "./seeded-workspace";
import type { PayBillsDto, BillQueryDto } from "@/presentation/types/dto/bill";
export function useGetBills(query?: BillQueryDto) {
    const { data, isLoaded } = useDemo();
    const all = (data?.bills ?? []).filter(bill => (!query?.status || bill.status === query.status) && (!query?.search || `${bill.vendor} ${bill.description}`.toLowerCase().includes(query.search.toLowerCase())) && (!query?.groupId || data?.employees.some(employee => employee.name === bill.vendor && (employee.groupIds || [employee.groupId]).includes(query.groupId!))));
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const bills = all.slice((page - 1) * limit, page * limit).map(b => ({
        ...b,
        invoice: {
            dueDate: b.dueDate,
            uuid: b.uuid,
            invoiceNumber: `BILL-${b.id}`,
            fromDetails: { name: b.vendor, companyName: b.vendor },
            total: b.amount,
            paymentToken: { name: "USDC" },
            employee: b.category === "payroll" ? data?.employees.find(employee => employee.name === b.vendor && employee.walletAddress.toLowerCase() === b.recipient?.toLowerCase()) || null : null,
        },
    }));
    return {
        data: {
            bills,
            pagination: { total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) },
        },
        isLoading: !isLoaded,
        isError: false,
        refetch: async () => { },
    };
}
export function useGetBillStats() {
    const { data, isLoaded } = useDemo();
    const bills = data?.bills || [];
    const pending = bills.filter(bill => bill.status === "PENDING" || bill.status === "DRAFT");
    const proposed = bills.filter(bill => ["AWAITING_APPROVAL", "READY", "PROCESSING", "SUBMITTED"].includes(bill.status));
    const paid = bills.filter(bill => bill.status === "PAID");
    const overdue = bills.filter(bill => !["PAID", "CANCELLED"].includes(bill.status) && bill.dueDate < new Date().toISOString().slice(0, 10));
    const amount = (records: typeof bills) => records.reduce((sum, bill) => sum + bill.amount, 0).toString();
    return { data: { totalBills: bills.length, totalPending: pending.length, totalProposed: proposed.length, totalPaid: paid.length, totalOverdue: overdue.length, totalAmount: amount(bills), pendingAmount: amount(pending), proposedAmount: amount(proposed), paidAmount: amount(paid), overdueAmount: amount(overdue) }, isLoading: !isLoaded, isError: false };
}
export function usePayBills() {
    return useRecordMutation(async (input: PayBillsDto) => {
        if (input.transactionHash) throw new Error("Payments require verified Arc settlement");
        const workspace = await readWorkspace();
        const ids = [...new Set(input.billUUIDs)];
        if (!ids.length || ids.length > 100) throw new Error("Select between 1 and 100 bills");
        const bills = ids.map(id => workspace.data.bills.find(bill => bill.uuid === id));
        if (bills.some(bill => !bill || bill.status === "PAID" || !bill.recipient)) throw new Error("Each selected bill needs an unpaid balance and an Arc recipient");
        for (const bill of bills) if (bill) await workspaceAction("bills", bill.uuid, "pay", bill.recipient);
        return { totalAmount: bills.reduce((sum, bill) => sum + Number(bill?.amount || 0), 0).toString() };
    });
}
export function useUpdateBillStatus() {
    return useRecordMutation(async (input: { uuid: string; status: string }) => {
        if (!["PAID", "CANCELLED"].includes(input.status)) throw new Error("Bill status follows its payment lifecycle");
        return workspaceAction("bills", input.uuid, input.status === "PAID" ? "refresh" : "cancel");
    });
}
export function useDeleteBill() {
    return useRecordMutation(async (uuid: string) => {
        await modifyWorkspace("bills", bills => {
            const bill = bills.find(bill => bill.uuid === uuid);
            if (!bill || bill.businessRecordId || !["DRAFT", "PENDING"].includes(bill.status)) throw new Error("Only unsubmitted drafts can be deleted. Cancel linked bills instead");
            return bills.filter(bill => bill.uuid !== uuid);
        });
        return { uuid };
    });
}
export function useGetBillDetail(uuid?: string, _options?: any) {
    const { data } = useDemo();
    const bill = data?.bills.find(b => b.uuid === uuid);
    return { data: bill ? { bill, timeline: [] } : undefined, isLoading: false, isError: false };
}
