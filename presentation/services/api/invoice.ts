import { readWorkspace, saveWorkspaceFields, workspaceAction, workspaceFetch } from "./seeded-workspace";
import type { DemoInvoice } from "@/presentation/contexts/DemoProvider";
import type { InvoiceQueryDto, CreateInvoiceDto, UpdateInvoiceDto, B2BInvoiceQueryDto } from "@/presentation/types/dto/invoice";
import { modifyWorkspace } from "./record-mutation";
export const getInvoices = async (query?: InvoiceQueryDto) => {
    const workspace = await readWorkspace();
    const all = workspace.data.invoices.filter(invoice => (!query?.status || invoice.status === query.status) && (!query?.payrollId || invoice.payrollContractId === query.payrollId) && (!query?.search || invoice.invoiceNumber.toLowerCase().includes(query.search.toLowerCase())));
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    return { invoices: all.slice((page - 1) * limit, page * limit).map(invoice => transformSeedInvoice(invoice, workspace.data)), pagination: { total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) } };
};
export const getInvoiceStats = async () => {
    const invoices = (await readWorkspace()).data.invoices;
    return { totalDraft: invoices.filter(invoice => invoice.status === "DRAFT").length, totalSent: invoices.filter(invoice => invoice.status === "SENT").length, totalReviewed: invoices.filter(invoice => invoice.status === "REVIEWED").length, totalConfirmed: invoices.filter(invoice => invoice.status === "CONFIRMED").length, totalAmount: invoices.reduce((sum, invoice) => sum + invoice.amount, 0).toString(), dueThisMonth: invoices.filter(invoice => invoice.dueDate.startsWith(new Date().toISOString().slice(0, 7)) && invoice.status !== "PAID").length };
};
export const getInvoiceByUUID = async (_uuid: string) => {
    try {
        if (typeof window === "undefined")
            return null;
        const stored = (await readWorkspace()).data;
        const invoice = stored.invoices.find(invoice => invoice.uuid === _uuid);
        if (invoice) return transformSeedInvoice(invoice, stored);
        const bill = stored.bills.find(bill => bill.uuid === _uuid);
        if (!bill)
            return null;
        return {
            uuid: bill.uuid, createdAt: bill.createdAt, fromCompany: null as {
                companyName: string;
            } | null, payroll: null as {
                company: {
                    companyName: string;
                };
            } | null,
            invoiceNumber: `BILL-${bill.id}`,
            fromDetails: { name: bill.vendor, companyName: bill.vendor, address: "", email: "" },
            toDetails: {
                companyName: stored.company?.companyName || "",
                email: stored.user?.email || "",
                address1: "",
                address2: "",
                city: "",
                country: stored.company?.country || "",
            },
            toCompany: {
                companyName: stored.company?.companyName || "",
                companyType: stored.company?.industry || "", email: stored.user?.email || "",
            },
            total: bill.amount,
            subtotal: bill.amount,
            totalUsd: bill.amount,
            paymentToken: { name: "USDC", symbol: "USDC" },
            currency: bill.currency || "USDC",
            status: bill.status,
            issueDate: bill.createdAt,
            dueDate: bill.dueDate,
            paymentWalletAddress: bill.recipient || stored.accounts?.[0]?.accountId || "",
            items: [
                {
                    description: bill.description,
                    quantity: 1,
                    unitPrice: bill.amount,
                    total: bill.amount,
                },
            ],
            employee: null,
        };
    }
    catch {
        return null;
    }
};
export const downloadInvoicePdf = async (uuid: string) => {
    const entity = localStorage.getItem("settlbox_demo_entity") || "entity-3";
    const response = await fetch(`/api/seeded-workspace/document?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(uuid)}`, { cache: "no-store" });
    if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || "Document download failed");
    }
    return response.blob();
};
export const createPayrollInvoice = async (input: CreateInvoiceDto) => {
    const workspace = await readWorkspace();
    const contracts = await workspaceFetch<import("@/types/payroll-contract").PayrollContract[]>(`/api/payroll-contracts?entity=${workspace.entityId}`);
    const contract = contracts.find(contract => contract.id === input.payrollId);
    if (!contract || Number(contract.amount) !== Number(input.total)) throw new Error("Payroll invoice amount must match its saved contract");
    return generateInvoice(input.payrollId);
};
export const generateInvoice = async (payrollId: number) => {
    const workspace = await readWorkspace();
    const pending = workspace.data.invoices.find(invoice => invoice.payrollContractId === payrollId && invoice.status === "SENT");
    if (pending) return pending;
    const periods = workspace.data.invoices.filter(invoice => invoice.payrollContractId === payrollId).map(invoice => invoice.payrollPeriod ?? 0);
    const period = periods.length ? Math.max(...periods) + 1 : 0;
    const result = await workspaceFetch<DemoInvoice>(`/api/payroll-contracts?entity=${workspace.entityId}`, "PATCH", { action: "prepare", id: payrollId, period });
    window.dispatchEvent(new Event("settlbox-workspace-refresh"));
    return result;
};
export const updateInvoice = async (uuid: string, input: UpdateInvoiceDto) => {
    await modifyWorkspace("invoices", invoices => {
        const invoice = invoices.find(invoice => invoice.uuid === uuid);
        if (!invoice || invoice.status !== "DRAFT" || invoice.payrollContractId || invoice.businessRecordId) throw new Error("Only unsubmitted invoice drafts can be edited");
        return invoices.map(invoice => invoice.uuid === uuid ? { ...invoice, ...(input.address !== undefined ? { fromAddress: input.address } : {}), ...(input.walletAddress !== undefined ? { recipient: input.walletAddress } : {}), ...(input.items ? { items: input.items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })), amount: Number(input.total || input.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0)) } : {}) } : invoice);
    });
    window.dispatchEvent(new Event("settlbox-workspace-refresh"));
    return getInvoiceByUUID(uuid);
};
export const sendInvoice = async (uuid: string) => workspaceAction("invoices", uuid, "issue");
export const reviewInvoice = async (uuid: string) => {
    const invoice = (await readWorkspace()).data.invoices.find(invoice => invoice.uuid === uuid);
    if (!invoice) throw new Error("Invoice not found");
    return getInvoiceByUUID(uuid);
};
export const confirmInvoice = async (uuid: string) => {
    const workspace = await readWorkspace();
    const result = await workspaceFetch(`/api/payroll-contracts?entity=${workspace.entityId}`, "PATCH", { action: "confirm", invoiceId: uuid });
    window.dispatchEvent(new Event("settlbox-workspace-refresh"));
    return result;
};
export const cancelInvoice = async (uuid: string) => {
    const workspace = await readWorkspace();
    return workspaceAction(workspace.data.bills.some(bill => bill.uuid === uuid) ? "bills" : "invoices", uuid, "cancel");
};
const transformSeedInvoice = (inv: any, demoState: any) => {
    const company = demoState?.company || {};
    const account = demoState?.accounts?.[0] || {};
    const isSent = inv.type === "SENT";
    const matchedClients = (demoState?.clients as import("@/presentation/contexts/DemoProvider").DemoClient[] | undefined)?.filter(client => client.email.toLowerCase() === String(inv.toEmail || "").toLowerCase()) || [];
    const counterpartyName = isSent ? (inv.to === "Client" && matchedClients.length === 1 ? matchedClients[0].companyName : inv.to) : inv.from;
    const counterpartyEmail = inv.toEmail || "";
    const items = (inv.items || []).map((it: any) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: (it.quantity || 1) * (it.unitPrice || 0),
    }));
    const subtotal = items.reduce((s: number, i: any) => s + (i.total || 0), 0) || inv.amount || 0;
    return {
        id: inv.id,
        uuid: inv.uuid,
        invoiceNumber: inv.invoiceNumber,
        type: inv.type,
        status: inv.status,
        total: inv.amount,
        subtotal,
        totalUsd: inv.amount,
        currency: inv.currency || "USDC",
        issueDate: inv.createdAt,
        createdAt: inv.createdAt,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt || null,
        payroll: null,
        fromDetails: {
            name: isSent ? inv.from : counterpartyName,
            address: inv.fromAddress || "",
            companyName: isSent ? inv.issuerCompany || inv.from : counterpartyName,
            contactName: isSent ? inv.from : counterpartyName,
            email: isSent ? inv.issuerEmail || demoState?.user?.email || "" : counterpartyEmail,
            address1: "",
            address2: "",
            city: "",
            country: isSent ? company.country || "" : "",
        },
        fromCompany: isSent
            ? { companyName: company.companyName, companyType: company.industry, logo: company.logo }
            : { companyName: counterpartyName, companyType: "", logo: null },
        toDetails: {
            address1: inv.recipientAddress || "",
            address2: "",
            companyName: isSent ? counterpartyName : company.companyName,
            contactName: isSent ? counterpartyName : company.companyName,
            email: isSent ? counterpartyEmail : demoState?.user?.email || "",
            address: inv.recipientAddress || "",
            city: "",
            country: "",
        },
        toCompany: {
            email: isSent ? counterpartyEmail : demoState?.user?.email || "",
            companyName: isSent ? counterpartyName : company.companyName,
            companyType: isSent ? "" : company.industry,
        },
        toCompanyName: isSent ? counterpartyName : company.companyName,
        toCompanyEmail: isSent ? counterpartyEmail : demoState?.user?.email || "",
        emailTo: isSent ? counterpartyEmail : demoState?.user?.email || "",
        description: inv.description,
        paymentToken: { name: "USDC", symbol: "USDC", decimals: 6, address: "" },
        paymentNetwork: { name: "Arc Testnet", chainId: 5042002 },
        paymentWalletAddress: inv.recipient || account.accountId || "",
        walletAddress: inv.recipient || account.accountId || "",
        items,
        employee: null,
    };
};
const readSeedInvoices = (): any[] => {
    try {
        if (typeof window === "undefined")
            return [];
        const demoState = JSON.parse(window.localStorage.getItem("settlbox_demo_state") || "{}");
        return (demoState.invoices || []).map((inv: any) => transformSeedInvoice(inv, demoState));
    }
    catch {
        return [];
    }
};
const readStoredInvoicesMap = (): Record<string, any> => {
    try {
        if (typeof window === "undefined")
            return {};
        return JSON.parse(window.localStorage.getItem("settlbox_demo_invoices") || "{}");
    }
    catch {
        return {};
    }
};
export const getB2BInvoices = async (query?: B2BInvoiceQueryDto) => {
    const workspace = await readWorkspace();
    const matching = workspace.data.invoices.filter(invoice =>
        (!query?.status || invoice.status === query.status) &&
        (!query?.direction || query.direction === "both" || invoice.type === query.direction.toUpperCase()) &&
        (!query?.search || `${invoice.invoiceNumber} ${invoice.from} ${invoice.to}`.toLowerCase().includes(query.search.toLowerCase())) &&
        (!query?.currency || invoice.currency === query.currency) &&
        (!query?.clientId || workspace.data.clients.some(client => client.uuid === query.clientId && client.email === invoice.toEmail))
    );
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(1000, Math.max(1, query?.limit || 20));
    const invoices = matching.slice((page - 1) * limit, page * limit).map(invoice => transformSeedInvoice(invoice, workspace.data));
    return { invoices, pagination: { total: matching.length, page, limit, totalPages: Math.ceil(matching.length / limit) } };
};
export const getB2BInvoiceStats = async () => {
    const workspace = await readWorkspace();
    const invoices = workspace.data.invoices.filter(invoice => invoice.type === "SENT");
    return { total: invoices.length, sent: invoices.filter(invoice => invoice.status === "SENT").length, paid: invoices.filter(invoice => invoice.status === "PAID").length, draft: invoices.filter(invoice => invoice.status === "DRAFT").length, totalAmount: invoices.reduce((total, invoice) => total + invoice.amount, 0) };
};
export const getB2BInvoiceByUUID = async (uuid: string) => {
    const workspace = await readWorkspace();
    const invoice = workspace.data.invoices.find(invoice => invoice.uuid === uuid);
    return invoice ? transformSeedInvoice(invoice, workspace.data) : null;
};
export const getB2BInvoiceByUUIDPublic = async (_uuid: string) => {
    try {
        if (typeof window === "undefined")
            return null;
        const stored = readStoredInvoicesMap();
        if (stored[_uuid])
            return stored[_uuid];
        return readSeedInvoices().find(i => i.uuid === _uuid) || null;
    }
    catch {
        return null;
    }
};
export const downloadB2BInvoicePdf = downloadInvoicePdf;
export const createB2BInvoice = async (_data: import("@/presentation/types/dto/invoice").CreateB2BInvoiceDto) => {
    const workspace = await readWorkspace();
    const now = new Date().toISOString();
    const client = workspace.data.clients.find(client => client.uuid === _data.clientId);
    const recipientCompany = _data.unregisteredCompany || client;
    const invoice: DemoInvoice = {
        id: Date.now(), uuid: crypto.randomUUID(), invoiceNumber: `INV-${Date.now()}`,
        type: "SENT", status: "DRAFT", amount: _data.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0), currency: "USDC",
        from: _data.fromDetails?.contactName || _data.fromDetails?.companyName || workspace.data.company.companyName, to: recipientCompany?.companyName || _data.unregisteredCompany?.contactName || "Client", toEmail: recipientCompany?.email || "",
        issuerCompany: _data.fromDetails?.companyName || workspace.data.company.companyName,
        issuerEmail: _data.fromDetails?.email || workspace.data.user.email,
        recipientAddress: _data.unregisteredCompany?.address || "",
        recipient: _data.walletAddress,
        description: "", dueDate: _data.dueDate, paidAt: null, createdAt: now,
        items: _data.items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })),
    };
    await saveWorkspaceFields([{ field: "invoices", value: [invoice, ...workspace.data.invoices] }], workspace);
    window.dispatchEvent(new Event("settlbox-workspace-refresh"));
    return transformSeedInvoice(invoice, workspace.data);
};
export const updateB2BInvoice = async (uuid: string, input: import("@/presentation/types/dto/invoice").UpdateB2BInvoiceDto) => {
    const workspace = await readWorkspace();
    const current = workspace.data.invoices.find(invoice => invoice.uuid === uuid);
    if (!current || current.status !== "DRAFT" || current.businessRecordId) throw new Error("Only unsubmitted invoice drafts can be edited");
    const invoices = workspace.data.invoices.map(invoice => invoice.uuid === uuid ? { ...invoice, ...(input.dueDate ? { dueDate: input.dueDate } : {}), ...(input.items ? { items: input.items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })), amount: input.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0) } : {}) } : invoice);
    await saveWorkspaceFields([{ field: "invoices", value: invoices }], workspace);
    window.dispatchEvent(new Event("settlbox-workspace-refresh"));
    return getB2BInvoiceByUUID(uuid);
};
export const sendB2BInvoice = async (uuid: string) => workspaceAction("invoices", uuid, "issue");
export const confirmB2BInvoice = async (uuid: string) => workspaceAction("invoices", uuid, "refresh");
export const markB2BInvoiceAsPaid = async (uuid: string) => workspaceAction("invoices", uuid, "refresh");
export const cancelB2BInvoice = async (uuid: string) => workspaceAction("invoices", uuid, "cancel");
export const deleteB2BInvoice = async (uuid: string) => {
    const workspace = await readWorkspace();
    const invoice = workspace.data.invoices.find(invoice => invoice.uuid === uuid);
    if (!invoice || invoice.status !== "DRAFT") throw new Error("Only draft invoices can be deleted");
    await saveWorkspaceFields([{ field: "invoices", value: workspace.data.invoices.filter(invoice => invoice.uuid !== uuid) }], workspace);
    window.dispatchEvent(new Event("settlbox-workspace-refresh"));
};
export const getB2BSchedules = async () => ({ schedules: [], pagination: {} });
export const getB2BScheduleByUUID = async (_uuid: string) => null;
export const createB2BSchedule = async (_data: any) => ({});
export const updateB2BSchedule = async (_uuid: string, _data: any) => ({});
export const toggleB2BSchedule = async (_uuid: string) => ({});
export const deleteB2BSchedule = async (_uuid: string) => ({});
