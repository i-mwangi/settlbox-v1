"use client";
import { readWorkspace, workspaceFetch, changedWorkspaceFields } from "@/presentation/services/api/seeded-workspace";
import type { SeededWorkspace } from "@/types/seeded-workspace";
import toast from "react-hot-toast";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
export interface DemoCompany {
    address1?: string;
    address2?: string;
    city?: string;
    postalCode?: string;
    id: number;
    uuid: string;
    companyName: string;
    registrationNumber: string;
    country: string;
    industry: string;
    companySize: string;
    website: string;
    logo: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface DemoUser {
    id: number;
    uuid: string;
    email: string;
    role: string;
    isActive: boolean;
    teamMembership: {
        id: number;
        uuid: string;
        firstName: string;
        lastName: string;
        position: string;
        role: string;
        companyId: number;
        profilePicture: string | null;
        company: {
            id: number;
            companyName: string;
        };
    } | null;
}
export interface DemoTeamMember {
    id: number;
    uuid: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    role: string;
    status: string;
    walletAddress: string;
    salary: number;
    salaryCurrency: string;
    profilePicture: string | null;
    joinedAt: string;
}
export interface ThresholdControl {
    amountThreshold: number;
    highSigners: number;
    lowSigners: number;
}
export interface DemoAccount {
    id: string;
    uuid?: string;
    accountId: string;
    name: string;
    description: string;
    threshold: number;
    companyId: number;
    logo: string | null;
    publicKeys?: string[];
    members: {
        name: string;
        commitment: string;
        role: string;
    }[];
    thresholdControl?: ThresholdControl;
    createdAt: string;
}
export interface DemoBalance {
    faucetId: string;
    symbol: string;
    amount: number;
    decimals: number;
    usdValue?: number;
}
export interface DemoContact {
    id: number;
    uuid: string;
    name: string;
    walletAddress: string;
    email: string;
    category: string;
    notes: string;
}
export interface DemoEmployeeGroup {
    id: number;
    name: string;
    shape: string;
    color: string;
    order: number;
    companyId: number;
    createdAt: string;
    updatedAt: string;
}
export interface DemoEmployee {
    id: number;
    name: string;
    walletAddress: string;
    email: string;
    groupId: number;
    groupIds?: number[];
    companyId: number;
    employeeType?: "employee" | "contractor";
    isActive?: boolean;
    paymentMethod?: "crypto" | "fiat";
    fiatDetails?: {
        country: string;
        bank: string;
        currency: string;
    };
    token: {
        address: string;
        symbol: string;
        decimals: number;
        name: string;
    } | null;
    network: {
        name: string;
        chainId: number;
    } | null;
    order?: number;
    createdAt: string;
    updatedAt: string;
}
export interface DemoClient {
    uuid: string;
    email: string;
    companyName: string;
    companyType?: string;
    country?: string;
    city?: string;
    address1?: string;
    address2?: string;
    taxId?: string;
    postalCode?: string;
    registrationNumber?: string;
    createdAt: string;
    updatedAt: string;
}
export interface DemoTransaction {
    id: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    from: string;
    fromAddress: string;
    to: string;
    toAddress: string;
    accountId: string;
    category: string;
    label: string;
    txHash: string;
    timestamp: string;
    note: string;
}
export interface InvoiceSettings {
    logo: string | null;
    accentColor: string;
    invoicePrefix: string;
    nextInvoiceNumber: number;
    defaultPaymentTerms: string;
    defaultNote: string;
    footerText: string;
    companyTaxId: string;
    showTaxId: boolean;
    showWalletQr: boolean;
}
export interface DemoProposal {
    id: string;
    uuid: string;
    accountId: string;
    accountName: string;
    type: string;
    proposalCategory?: string;
    status: string;
    amount: number;
    currency: string;
    to: string;
    toAddress: string;
    label: string;
    note: string;
    createdBy: string;
    createdAt: string;
    signatures: {
        signer: string;
        status: string;
        signedAt: string;
    }[];
    requiredSignatures: number;
}
export interface DemoPayroll {
    id: number;
    uuid: string;
    name: string;
    status: string;
    totalAmount: number;
    currency: string;
    employeeCount: number;
    executedAt: string;
    createdAt: string;
    accountId: string;
    accountName: string;
    txHash: string;
    recipients: {
        name: string;
        amount: number;
        walletAddress: string;
        status: string;
    }[];
}
export interface DemoInvoice {
    issuerCompany?: string;
    issuerEmail?: string;
    recipientAddress?: string;
    fromAddress?: string;
    amountExact?: string;
    payrollContractId?: number;
    payrollPeriod?: number;
    recipient?: string;
    businessRecordId?: string;
    id: number;
    uuid: string;
    invoiceNumber: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    from: string;
    to: string;
    toEmail: string;
    description: string;
    dueDate: string;
    paidAt: string | null;
    createdAt: string;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
    }[];
}
export interface DemoBill {
    paidAt?: string | null;
    amountExact?: string;
    recipient?: string;
    invoiceUuid?: string;
    businessRecordId?: string;
    id: number;
    uuid: string;
    vendor: string;
    description: string;
    amount: number;
    currency: string;
    status: string;
    dueDate: string;
    category: string;
    recurring: boolean;
    frequency: string | null;
    createdAt: string;
}
export interface DemoPaymentLink {
    id: number;
    uuid: string;
    code: string;
    title: string;
    description: string;
    amount: number | null;
    currency: string;
    status: string;
    recipientAddress: string;
    recipientName: string;
    timesUsed: number;
    maxUses: number | null;
    expiresAt: string | null;
    createdAt: string;
    payments: any[];
}
export interface DemoCard {
    id: string;
    last4: string;
    brand: string;
    cardholder: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    spendingLimit: number;
    currentSpend: number;
    status: string;
    frozen: boolean;
    dailyLimit?: number;
    weeklyLimit?: number;
    monthlyLimit?: number;
}
export interface DemoCardTransaction {
    id: string;
    merchant: string;
    amount: number;
    currency: string;
    category: string;
    date: string;
    status: string;
}
export interface DemoRampHistory {
    id: string;
    type: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    rate: number;
    fee: number;
    status: string;
    bankAccount: string;
    completedAt: string;
}
export interface DemoMonthlyFinancial {
    month: string;
    income: number;
    expenses: number;
    payroll: number;
    netFlow: number;
}
export interface DemoData {
    balanceHistory?: { observedAt: string; amount: string }[];
    verifiedTransactionIds?: string[];
    company: DemoCompany;
    user: DemoUser;
    teamMembers: DemoTeamMember[];
    teamStats: {
        total: number;
        active: number;
        suspended: number;
        pending: number;
    };
    accounts: DemoAccount[];
    balances: Record<string, DemoBalance[]>;
    totalBalance: number;
    contacts: DemoContact[];
    contactCategories: {
        id: number;
        name: string;
        order: number;
    }[];
    employees: DemoEmployee[];
    employeeGroups: DemoEmployeeGroup[];
    clients: DemoClient[];
    transactions: DemoTransaction[];
    pendingProposals: DemoProposal[];
    payrolls: DemoPayroll[];
    payrollStats: {
        totalPaid: number;
        totalPayrolls: number;
        averagePerPayroll: number;
        nextPayrollDate: string;
    };
    invoices: DemoInvoice[];
    invoiceStats: any;
    bills: DemoBill[];
    billStats: any;
    paymentLinks: DemoPaymentLink[];
    cardTransactions: DemoCardTransaction[];
    card: DemoCard;
    cards: DemoCard[];
    cardPoolBalance: number;
    invoiceSettings: InvoiceSettings;
    rampHistory: DemoRampHistory[];
    monthlyFinancials: DemoMonthlyFinancial[];
}
export interface DemoEntitySummary {
    id: string;
    company: DemoCompany;
    totalBalance: number;
    teamStats: {
        total: number;
        active: number;
        suspended: number;
        pending: number;
    };
}
interface DemoSetupData {
    email: string;
    firstName: string;
    lastName: string;
    companyName: string;
    country: string;
    industry: string;
    companySize: string;
}
interface DemoContextType {
    data: DemoData | null;
    isLoaded: boolean;
    isLoggedIn: boolean;
    isOnboarded: boolean;
    entities: DemoEntitySummary[];
    activeEntityId: string;
    switchEntity: (entityId: string) => void;
    login: (email: string) => void;
    completeOnboarding: (setup: DemoSetupData) => void;
    addTransaction: (tx: DemoTransaction) => void;
    updateTransaction: (id: string, updates: Partial<DemoTransaction>) => void;
    addInvoice: (invoice: DemoInvoice) => void;
    updateInvoice: (uuid: string, updates: Partial<DemoInvoice>) => void;
    addPayroll: (payroll: DemoPayroll) => void;
    addBill: (bill: DemoBill) => void;
    updateBill: (uuid: string, updates: Partial<DemoBill>) => void;
    deleteBill: (uuid: string) => void;
    addContact: (contact: DemoContact) => void;
    updateContact: (uuid: string, updates: Partial<DemoContact>) => void;
    deleteContact: (uuid: string) => void;
    addEmployee: (employee: DemoEmployee) => void;
    updateEmployee: (id: number, updates: Partial<DemoEmployee>) => void;
    deleteEmployee: (id: number) => void;
    bulkDeleteEmployees: (ids: number[]) => void;
    addEmployeeGroup: (group: DemoEmployeeGroup) => void;
    addDemoClient: (client: DemoClient) => void;
    deleteDemoClient: (uuid: string) => void;
    addPaymentLink: (link: DemoPaymentLink) => void;
    updatePaymentLink: (code: string, updates: Partial<DemoPaymentLink>) => void;
    deletePaymentLink: (code: string) => void;
    approveProposal: (id: string) => void;
    rejectProposal: (id: string) => void;
    updateBalance: (accountId: string, symbol: string, delta: number) => void;
    toggleCardFreeze: (cardId?: string) => void;
    addCardTransaction: (tx: DemoCardTransaction) => void;
    toggleCardFreezeById: (cardId: string) => void;
    addCard: (card: DemoCard) => void;
    updateCard: (cardId: string, updates: Partial<DemoCard>) => void;
    topUpCardPool: (amount: number) => void;
    updateInvoiceSettings: (settings: Partial<InvoiceSettings>) => Promise<void>;
    addRampTransaction: (tx: DemoRampHistory) => void;
    addAccount: (account: DemoAccount) => void;
    updateAccount: (accountId: string, updates: Partial<DemoAccount>) => void;
}
const DemoContext = createContext<DemoContextType | undefined>(undefined);
const STORAGE_KEY = "settlbox_demo_state";
const STORAGE_VERSION_KEY = "settlbox_demo_version";
const CURRENT_VERSION = "10";
const LOGIN_KEY = "settlbox_demo_login";
const ENTITY_KEY = "settlbox_demo_entity";
const ENTITY_DATA_FILES: Record<string, string> = {
    primary: "/demo-data.json",
    "entity-2": "/demo-data-entity-2.json",
    "entity-3": "/demo-data-entity-3.json",
};
export function DemoProvider({ children }: {
    children: ReactNode;
}) {
    const [data, setData] = useState<DemoData | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [activeEntityId, setActiveEntityId] = useState<string>("entity-3");
    const entitySummariesRef = useRef<DemoEntitySummary[]>([]);
    const currentWorkspace = useRef<SeededWorkspace | null>(null);
    const saveQueue = useRef<Promise<void>>(Promise.resolve());
    const fetchEntityData = useCallback(async (entityId: string): Promise<DemoData> => {
        const workspace = await readWorkspace(entityId);
        return workspace.data;
    }, []);
    const reloadWorkspace = useCallback(async () => {
        const entity = localStorage.getItem(ENTITY_KEY) || "entity-3";
        const workspace = await readWorkspace(entity);
        currentWorkspace.current = workspace;
        setData(workspace.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace.data));
        setIsLoggedIn(true);
        setIsOnboarded(true);
        setIsLoaded(true);
    }, []);
    useEffect(() => {
        const load = async () => {
            const session = await fetch("/api/operator/session", { cache: "no-store" });
            if (!session.ok) { setIsLoaded(true); setIsLoggedIn(false); return; }
            try {
                const entityIds = Object.keys(ENTITY_DATA_FILES);
                const allData = await Promise.all(entityIds.map(fetchEntityData));
                entitySummariesRef.current = entityIds.map((id, i) => ({ id, company: allData[i].company, totalBalance: allData[i].totalBalance, teamStats: allData[i].teamStats }));
                setActiveEntityId(localStorage.getItem(ENTITY_KEY) || "entity-3");
                await reloadWorkspace();
            } catch (error) { toast.error(error instanceof Error ? error.message : "Workspace could not be loaded"); setIsLoaded(true); }
        };
        void load();
        const refresh = () => { void reloadWorkspace().catch(error => toast.error(error instanceof Error ? error.message : "Workspace refresh failed")); };
        window.addEventListener("settlbox-workspace-refresh", refresh);
        return () => window.removeEventListener("settlbox-workspace-refresh", refresh);
    }, [fetchEntityData, reloadWorkspace]);
    const persist = useCallback((newData: DemoData) => {
        const current = currentWorkspace.current;
        if (!current || !data) return;
        const changes = changedWorkspaceFields(data, newData);
        if (!changes.length) return;
        setData(newData);
        saveQueue.current = saveQueue.current.then(async () => {
            try {
                const latest = currentWorkspace.current;
                if (!latest || latest.entityId !== current.entityId) throw new Error("Company changed before saving");
                const saved = await workspaceFetch<SeededWorkspace>("/api/seeded-workspace", "PATCH", { entity: current.entityId, revision: latest.revision, changes });
                currentWorkspace.current = saved;
                setData(saved.data);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.data));
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Changes were not saved");
                await reloadWorkspace();
            }
        }).catch(error => { toast.error(error instanceof Error ? error.message : "Workspace save failed"); });
    }, [data, reloadWorkspace]);
    const entities: DemoEntitySummary[] = React.useMemo(() => {
        if (!isLoaded)
            return [];
        return entitySummariesRef.current;
    }, [isLoaded]);
    const switchEntity = useCallback(async (entityId: string) => {
        if (!data || entityId === activeEntityId)
            return;
        const entity = entitySummariesRef.current.find(e => e.id === entityId);
        if (!entity)
            return;
        try {
            const entityData = await fetchEntityData(entityId);
            setActiveEntityId(entityId);
            localStorage.setItem(ENTITY_KEY, entityId);
            const workspace = await readWorkspace(entityId);
            currentWorkspace.current = workspace;
            setData(workspace.data);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace.data));
        }
        catch (err) {
            console.error("Failed to switch entity:", err);
        }
    }, [data, activeEntityId, persist, fetchEntityData]);
    const login = useCallback((_email: string) => { void reloadWorkspace(); }, [reloadWorkspace]);
    const completeOnboarding = useCallback((setup: DemoSetupData) => {
        setIsOnboarded(true);
        localStorage.setItem(LOGIN_KEY, JSON.stringify({ loggedIn: true, onboarded: true }));
        if (data) {
            persist({
                ...data,
                company: {
                    ...data.company,
                    companyName: setup.companyName,
                    country: setup.country,
                    industry: setup.industry,
                    companySize: setup.companySize,
                },
                user: {
                    ...data.user,
                    email: setup.email,
                    teamMembership: data.user.teamMembership
                        ? {
                            ...data.user.teamMembership,
                            firstName: setup.firstName,
                            lastName: setup.lastName,
                            company: { ...data.user.teamMembership.company, companyName: setup.companyName },
                        }
                        : data.user.teamMembership,
                },
                teamMembers: data.teamMembers.map((m, i) => i === 0 ? { ...m, firstName: setup.firstName, lastName: setup.lastName, email: setup.email } : m),
            });
        }
    }, [data, persist]);
    const addTransaction = useCallback((tx: DemoTransaction) => {
        if (!data)
            return;
        persist({ ...data, transactions: [tx, ...data.transactions] });
    }, [data, persist]);
    const updateTransaction = useCallback((id: string, updates: Partial<DemoTransaction>) => {
        if (!data)
            return;
        persist({
            ...data,
            transactions: data.transactions.map(tx => (tx.id === id ? { ...tx, ...updates } : tx)),
        });
    }, [data, persist]);
    const addInvoice = useCallback((invoice: DemoInvoice) => {
        if (!data)
            return;
        persist({ ...data, invoices: [invoice, ...data.invoices] });
    }, [data, persist]);
    const updateInvoice = useCallback((uuid: string, updates: Partial<DemoInvoice>) => {
        if (!data)
            return;
        persist({
            ...data,
            invoices: data.invoices.map(inv => (inv.uuid === uuid ? { ...inv, ...updates } : inv)),
        });
    }, [data, persist]);
    const addPayroll = useCallback((payroll: DemoPayroll) => {
        if (!data)
            return;
        persist({ ...data, payrolls: [payroll, ...data.payrolls] });
    }, [data, persist]);
    const addBill = useCallback((bill: DemoBill) => {
        if (!data)
            return;
        persist({ ...data, bills: [bill, ...data.bills] });
    }, [data, persist]);
    const updateBill = useCallback((uuid: string, updates: Partial<DemoBill>) => {
        if (!data)
            return;
        persist({
            ...data,
            bills: data.bills.map(b => (b.uuid === uuid ? { ...b, ...updates } : b)),
        });
    }, [data, persist]);
    const deleteBill = useCallback((uuid: string) => {
        if (!data)
            return;
        persist({ ...data, bills: data.bills.filter(b => b.uuid !== uuid) });
    }, [data, persist]);
    const addContact = useCallback((contact: DemoContact) => {
        if (!data)
            return;
        persist({ ...data, contacts: [...data.contacts, contact] });
    }, [data, persist]);
    const updateContact = useCallback((uuid: string, updates: Partial<DemoContact>) => {
        if (!data)
            return;
        persist({
            ...data,
            contacts: data.contacts.map(c => (c.uuid === uuid ? { ...c, ...updates } : c)),
        });
    }, [data, persist]);
    const deleteContact = useCallback((uuid: string) => {
        if (!data)
            return;
        persist({ ...data, contacts: data.contacts.filter(c => c.uuid !== uuid) });
    }, [data, persist]);
    const addPaymentLink = useCallback((link: DemoPaymentLink) => {
        if (!data)
            return;
        persist({ ...data, paymentLinks: [...data.paymentLinks, link] });
    }, [data, persist]);
    const updatePaymentLink = useCallback((code: string, updates: Partial<DemoPaymentLink>) => {
        if (!data)
            return;
        persist({
            ...data,
            paymentLinks: data.paymentLinks.map(pl => (pl.code === code ? { ...pl, ...updates } : pl)),
        });
    }, [data, persist]);
    const deletePaymentLink = useCallback((code: string) => {
        if (!data)
            return;
        persist({ ...data, paymentLinks: data.paymentLinks.filter(pl => pl.code !== code) });
    }, [data, persist]);
    const approveProposal = useCallback((id: string) => {
        if (!data)
            return;
        const proposal = data.pendingProposals.find(p => p.id === id);
        if (!proposal)
            return;
        const newSig = { signer: "Alex Chen", status: "SIGNED", signedAt: new Date().toISOString() };
        const updatedProposal = {
            ...proposal,
            signatures: [...proposal.signatures, newSig],
            status: proposal.signatures.length + 1 >= proposal.requiredSignatures ? "EXECUTED" : proposal.status,
        };
        if (updatedProposal.status === "EXECUTED") {
            const newTx: DemoTransaction = {
                id: `tx-${Date.now()}`,
                type: "SEND",
                status: "COMPLETED",
                amount: proposal.amount,
                currency: proposal.currency,
                from: proposal.accountName,
                fromAddress: proposal.accountId,
                to: proposal.to,
                toAddress: proposal.toAddress,
                accountId: proposal.accountId,
                category: "Other",
                label: proposal.label,
                txHash: `0x${Date.now().toString(16)}`,
                timestamp: new Date().toISOString(),
                note: proposal.note,
            };
            persist({
                ...data,
                pendingProposals: data.pendingProposals.filter(p => p.id !== id),
                transactions: [newTx, ...data.transactions],
            });
        }
        else {
            persist({
                ...data,
                pendingProposals: data.pendingProposals.map(p => (p.id === id ? updatedProposal : p)),
            });
        }
    }, [data, persist]);
    const rejectProposal = useCallback((id: string) => {
        if (!data)
            return;
        persist({
            ...data,
            pendingProposals: data.pendingProposals.map(p => p.id === id ? { ...p, status: "REJECTED" } : p),
        });
    }, [data, persist]);
    const updateBalance = useCallback((accountId: string, symbol: string, delta: number) => {
        if (!data)
            return;
        const newBalances = { ...data.balances };
        const accountBalances = [...(newBalances[accountId] || [])];
        const idx = accountBalances.findIndex(b => b.symbol === symbol);
        if (idx >= 0) {
            accountBalances[idx] = { ...accountBalances[idx], amount: accountBalances[idx].amount + delta };
        }
        newBalances[accountId] = accountBalances;
        let totalBalance = 0;
        for (const balances of Object.values(newBalances)) {
            for (const b of balances) {
                totalBalance += b.usdValue ?? b.amount;
            }
        }
        persist({ ...data, balances: newBalances, totalBalance });
    }, [data, persist]);
    const toggleCardFreeze = useCallback(() => {
        if (!data)
            return;
        persist({ ...data, card: { ...data.card, frozen: !data.card.frozen } });
    }, [data, persist]);
    const toggleCardFreezeById = useCallback((cardId: string) => {
        if (!data)
            return;
        persist({
            ...data,
            cards: data.cards.map((c) => (c.id === cardId ? { ...c, frozen: !c.frozen } : c)),
        });
    }, [data, persist]);
    const addCard = useCallback((card: DemoCard) => {
        if (!data)
            return;
        persist({ ...data, cards: [...data.cards, card] });
    }, [data, persist]);
    const updateCard = useCallback((cardId: string, updates: Partial<DemoCard>) => {
        if (!data)
            return;
        persist({
            ...data,
            cards: data.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
        });
    }, [data, persist]);
    const topUpCardPool = useCallback((amount: number) => {
        if (!data)
            return;
        persist({ ...data, cardPoolBalance: (data.cardPoolBalance || 0) + amount });
    }, [data, persist]);
    const updateInvoiceSettings = useCallback(async (settings: Partial<InvoiceSettings>) => {
        const workspace = await readWorkspace(activeEntityId);
        await workspaceFetch("/api/seeded-workspace", "PATCH", { entity: workspace.entityId, revision: workspace.revision, changes: [{ field: "invoiceSettings", value: { ...workspace.data.invoiceSettings, ...settings } }] });
        window.dispatchEvent(new Event("settlbox-workspace-refresh"));
    }, [activeEntityId]);
    const addCardTransaction = useCallback((tx: DemoCardTransaction) => {
        if (!data)
            return;
        persist({ ...data, cardTransactions: [tx, ...data.cardTransactions] });
    }, [data, persist]);
    const addRampTransaction = useCallback((tx: DemoRampHistory) => {
        if (!data)
            return;
        persist({ ...data, rampHistory: [tx, ...data.rampHistory] });
    }, [data, persist]);
    const addAccount = useCallback((account: DemoAccount) => {
        if (!data)
            return;
        persist({ ...data, accounts: [...data.accounts, account] });
    }, [data, persist]);
    const updateAccount = useCallback((accountId: string, updates: Partial<DemoAccount>) => {
        if (!data)
            return;
        persist({
            ...data,
            accounts: data.accounts.map(a => (a.accountId === accountId ? { ...a, ...updates } : a)),
        });
    }, [data, persist]);
    const addEmployee = useCallback((employee: DemoEmployee) => {
        if (!data)
            return;
        persist({ ...data, employees: [...(data.employees || []), employee] });
    }, [data, persist]);
    const updateEmployee = useCallback((id: number, updates: Partial<DemoEmployee>) => {
        if (!data)
            return;
        persist({
            ...data,
            employees: (data.employees || []).map(e => (e.id === id ? { ...e, ...updates } : e)),
        });
    }, [data, persist]);
    const deleteEmployee = useCallback((id: number) => {
        if (!data)
            return;
        persist({ ...data, employees: (data.employees || []).filter(e => e.id !== id) });
    }, [data, persist]);
    const bulkDeleteEmployees = useCallback((ids: number[]) => {
        if (!data)
            return;
        persist({ ...data, employees: (data.employees || []).filter(e => !ids.includes(e.id)) });
    }, [data, persist]);
    const addEmployeeGroup = useCallback((group: DemoEmployeeGroup) => {
        if (!data)
            return;
        persist({ ...data, employeeGroups: [...(data.employeeGroups || []), group] });
    }, [data, persist]);
    const addDemoClient = useCallback((client: DemoClient) => {
        if (!data)
            return;
        persist({ ...data, clients: [...(data.clients || []), client] });
    }, [data, persist]);
    const deleteDemoClient = useCallback((uuid: string) => {
        if (!data)
            return;
        persist({ ...data, clients: (data.clients || []).filter(c => c.uuid !== uuid) });
    }, [data, persist]);
    const value: DemoContextType = React.useMemo(() => ({
        data,
        isLoaded,
        isLoggedIn,
        isOnboarded,
        entities,
        activeEntityId,
        switchEntity,
        login,
        completeOnboarding,
        addTransaction,
        updateTransaction,
        addInvoice,
        updateInvoice,
        addPayroll,
        addBill,
        updateBill,
        deleteBill,
        addContact,
        updateContact,
        deleteContact,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        bulkDeleteEmployees,
        addEmployeeGroup,
        addDemoClient,
        deleteDemoClient,
        addPaymentLink,
        updatePaymentLink,
        deletePaymentLink,
        approveProposal,
        rejectProposal,
        updateBalance,
        toggleCardFreeze,
        toggleCardFreezeById,
        addCard,
        updateCard,
        topUpCardPool,
        updateInvoiceSettings,
        addCardTransaction,
        addRampTransaction,
        addAccount,
        updateAccount,
    }), [
        data,
        isLoaded,
        isLoggedIn,
        isOnboarded,
        entities,
        activeEntityId,
        switchEntity,
        login,
        completeOnboarding,
        addTransaction,
        updateTransaction,
        addInvoice,
        updateInvoice,
        addPayroll,
        addBill,
        updateBill,
        deleteBill,
        addContact,
        updateContact,
        deleteContact,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        bulkDeleteEmployees,
        addEmployeeGroup,
        addDemoClient,
        deleteDemoClient,
        addPaymentLink,
        updatePaymentLink,
        deletePaymentLink,
        approveProposal,
        rejectProposal,
        updateBalance,
        toggleCardFreeze,
        toggleCardFreezeById,
        addCard,
        updateCard,
        topUpCardPool,
        updateInvoiceSettings,
        addCardTransaction,
        addRampTransaction,
        addAccount,
        updateAccount,
    ]);
    return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
export function useDemo(): DemoContextType {
    const context = useContext(DemoContext);
    if (context === undefined) {
        throw new Error("useDemo must be used within a DemoProvider");
    }
    return context;
}
export function resetDemoData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ENTITY_KEY);
    window.location.reload();
}
