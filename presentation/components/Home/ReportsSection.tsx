"use client";
import React, { useState, useMemo } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import toast from "react-hot-toast";
import { FrostedMenu } from "../Common/Dropdown/FrostedMenu";
import { DateRangePicker, DateRange } from "../Common/Dropdown/DateRangePicker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, } from "recharts";
import { Table, CellContent } from "../Common/Table";
import Card from "../Common/Card";
import { Badge, BadgeStatus } from "../Common/Badge";
import { SecondaryButton } from "../Common/SecondaryButton";
import { ARC_EXPLORER_URL } from "@/presentation/services/utils/constant";
import { DemoTransaction } from "@/presentation/contexts/DemoProvider";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { MODAL_IDS } from "@/presentation/types/modal";
const tabs: {
    id: string;
    label: string;
}[] = [
    { id: "income", label: "Income" },
    { id: "expenses", label: "Expenses" },
    { id: "payroll", label: "Payroll" },
    { id: "tax", label: "Tax Summary" },
];
const PIE_COLORS = ["#2196F3", "#FF9800", "#9C27B0", "#4CAF50", "#607D8B"];
const PIE_CATEGORIES = ["Payroll", "Vendor", "Subscription", "Contractor", "Other"];
interface TaxJurisdiction {
    code: string;
    name: string;
    flag: string;
    corpTaxRate: number;
    cryptoSwapTaxable: boolean;
    payrollTaxable: boolean;
    filingDeadline: string;
    notes: string;
}
const TAX_JURISDICTIONS: TaxJurisdiction[] = [
    {
        code: "SG",
        name: "Singapore",
        flag: "\uD83C\uDDF8\uD83C\uDDEC",
        corpTaxRate: 17,
        cryptoSwapTaxable: false,
        payrollTaxable: true,
        filingDeadline: "Nov 30 (paper) / Dec 15 (e-filing)",
        notes: "No capital gains tax. Crypto trading income taxed at 17% if it is your business activity. Payment tokens exempt from GST.",
    },
    {
        code: "HK",
        name: "Hong Kong",
        flag: "\uD83C\uDDED\uD83C\uDDF0",
        corpTaxRate: 16.5,
        cryptoSwapTaxable: false,
        payrollTaxable: true,
        filingDeadline: "Apr 1 (employer returns)",
        notes: "8.25% on first HK$2M profit, 16.5% above. No capital gains tax. Territorial source principle, offshore profits not taxed.",
    },
    {
        code: "US",
        name: "United States",
        flag: "\uD83C\uDDFA\uD83C\uDDF8",
        corpTaxRate: 21,
        cryptoSwapTaxable: true,
        payrollTaxable: true,
        filingDeadline: "Apr 15 (C-corp) / Mar 15 (S-corp)",
        notes: "Every crypto-to-crypto swap is a taxable event. Stablecoin payroll subject to FICA withholding. Most aggressive enforcement globally.",
    },
    {
        code: "AE",
        name: "UAE",
        flag: "\uD83C\uDDE6\uD83C\uDDEA",
        corpTaxRate: 9,
        cryptoSwapTaxable: false,
        payrollTaxable: false,
        filingDeadline: "9 months after FY end",
        notes: "9% on profits above AED 375K. Free zone companies (DMCC, DIFC, ADGM) can qualify for 0%. No personal income tax.",
    },
    {
        code: "CH",
        name: "Switzerland",
        flag: "\uD83C\uDDE8\uD83C\uDDED",
        corpTaxRate: 14.6,
        cryptoSwapTaxable: true,
        payrollTaxable: true,
        filingDeadline: "Mar-Sep (varies by canton)",
        notes: "Combined rate 11.9-21.6% depending on canton. Zug (Crypto Valley) ~11.9%. All crypto gains are business income for companies.",
    },
    {
        code: "KY",
        name: "Cayman Islands",
        flag: "\uD83C\uDDF0\uD83C\uDDFE",
        corpTaxRate: 0,
        cryptoSwapTaxable: false,
        payrollTaxable: false,
        filingDeadline: "No tax filing required",
        notes: "Zero income tax, capital gains tax, and withholding tax. Economic substance requirements apply. CIMA registration for VASPs.",
    },
];
function formatCurrency(value: number): string {
    return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}
function formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function getStatusBadge(status: string): BadgeStatus {
    switch (status) {
        case "COMPLETED":
            return BadgeStatus.SUCCESS;
        case "PENDING":
            return BadgeStatus.AWAITING;
        case "FAILED":
            return BadgeStatus.FAIL;
        default:
            return BadgeStatus.NEUTRAL;
    }
}
const ChartCard = ({ title, children, action, }: {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) => (<div className="bg-background border border-primary-divider rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-medium text-text-primary">{title}</h3>
      {action}
    </div>
    <div className="h-72">{children}</div>
  </div>);
const PieChartSection = ({ data, emptyMessage, }: {
    data: {
        name: string;
        value: number;
        color: string;
    }[];
    emptyMessage: string;
}) => {
    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-text-secondary text-sm">{emptyMessage}</div>;
    }
    return (<ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name">
          {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color}/>))}
        </Pie>
        <Tooltip content={({ active, payload }: any) => {
            if (!active || !payload?.length)
                return null;
            const entry = payload[0];
            return (<div className="bg-background rounded-[8px] p-3 border border-primary-divider shadow-lg">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.payload.color }}/>
                  <span className="text-text-secondary">{entry.name}:</span>
                  <span className="text-text-primary font-medium">{formatCurrency(entry.value)}</span>
                </div>
              </div>);
        }}/>
        <Legend verticalAlign="bottom" height={36} formatter={(value: string) => <span className="text-text-secondary text-sm">{value}</span>}/>
      </PieChart>
    </ResponsiveContainer>);
};
const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length)
        return null;
    return (<div className="bg-background rounded-[8px] p-3 border border-primary-divider shadow-lg">
      <p className="text-text-primary text-xs font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (<div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}/>
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="text-text-primary font-medium">{formatCurrency(entry.value)}</span>
        </div>))}
    </div>);
};
export const ReportsSection = () => {
    const { data } = useDemo();
    const { openModal } = useModal();
    const [activeTab, setActiveTab] = useState<string>("income");
    const [dateRange, setDateRange] = useState<DateRange>(() => ({
        start: new Date(2026, 0, 1),
        end: new Date(2026, 2, 31),
    }));
    const transactions = data?.transactions ?? [];
    const monthlyFinancials = data?.monthlyFinancials ?? [];
    const totalIncome = useMemo(() => monthlyFinancials.reduce((sum, m) => sum + m.income, 0), [monthlyFinancials]);
    const totalExpenses = useMemo(() => monthlyFinancials.reduce((sum, m) => sum + m.expenses, 0), [monthlyFinancials]);
    const totalPayroll = useMemo(() => monthlyFinancials.reduce((sum, m) => sum + m.payroll, 0), [monthlyFinancials]);
    const netFlow = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);
    const companyCountry = data?.company?.country ?? "";
    const jurisdiction = useMemo(() => {
        const match = TAX_JURISDICTIONS.find(j => companyCountry.toLowerCase().includes(j.name.toLowerCase()) || companyCountry.toUpperCase() === j.code);
        return match ?? TAX_JURISDICTIONS[0];
    }, [companyCountry]);
    const taxRate = jurisdiction.corpTaxRate / 100;
    const estimatedTax = useMemo(() => Math.round(netFlow * taxRate), [netFlow, taxRate]);
    const filteredTransactions = useMemo(() => {
        switch (activeTab) {
            case "income":
                return transactions.filter(tx => tx.type === "RECEIVE" || tx.type === "INVOICE");
            case "expenses":
                return transactions.filter(tx => tx.type === "SEND" || tx.type === "BILL");
            case "payroll":
                return transactions.filter(tx => tx.category === "Payroll");
            case "tax":
                return transactions;
            default:
                return transactions;
        }
    }, [transactions, activeTab]);
    const incomeBreakdown = useMemo(() => {
        const categoryMap: Record<string, number> = {};
        transactions
            .filter(tx => tx.type === "RECEIVE" || tx.type === "INVOICE")
            .forEach(tx => {
            const cat = tx.category || "Other";
            categoryMap[cat] = (categoryMap[cat] || 0) + tx.amount;
        });
        return Object.entries(categoryMap)
            .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }))
            .filter(e => e.value > 0);
    }, [transactions]);
    const expenseBreakdown = useMemo(() => {
        const categoryMap: Record<string, number> = {};
        transactions
            .filter(tx => tx.type === "SEND" || tx.type === "BILL")
            .forEach(tx => {
            const cat = PIE_CATEGORIES.includes(tx.category) ? tx.category : "Other";
            categoryMap[cat] = (categoryMap[cat] || 0) + tx.amount;
        });
        return PIE_CATEGORIES.map((cat, i) => ({
            name: cat,
            value: categoryMap[cat] || 0,
            color: PIE_COLORS[i],
        })).filter(entry => entry.value > 0);
    }, [transactions]);
    const [simEmployees, setSimEmployees] = useState<{
        role: string;
        monthlyCost: number;
    }[]>([]);
    const treasuryBalance = data?.totalBalance ?? 0;
    const avgMonthlyBurn = useMemo(() => (monthlyFinancials.length > 0 ? totalExpenses / monthlyFinancials.length : 0), [totalExpenses, monthlyFinancials.length]);
    const simExtraBurn = useMemo(() => simEmployees.reduce((sum, e) => sum + e.monthlyCost, 0), [simEmployees]);
    const currentRunwayMonths = useMemo(() => (avgMonthlyBurn > 0 ? Math.floor(treasuryBalance / avgMonthlyBurn) : 0), [treasuryBalance, avgMonthlyBurn]);
    const simRunwayMonths = useMemo(() => (avgMonthlyBurn + simExtraBurn > 0 ? Math.floor(treasuryBalance / (avgMonthlyBurn + simExtraBurn)) : 0), [treasuryBalance, avgMonthlyBurn, simExtraBurn]);
    const openSimulation = () => {
        openModal(MODAL_IDS.PAYROLL_SIMULATION, {
            treasuryBalance,
            avgMonthlyBurn,
            currentRunwayMonths,
            currentEmployees: simEmployees,
            onApply: (employees: {
                role: string;
                monthlyCost: number;
            }[]) => setSimEmployees(employees),
        });
    };
    const escapeCSV = (value: string): string => {
        if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
            return `"${value.replace(/"/g, "\"\"")}"`;
        }
        return value;
    };
    const buildCSVContent = (txs: DemoTransaction[]): string => {
        const headers = [
            "Date",
            "Timestamp (UTC)",
            "Transaction ID",
            "Transaction Hash",
            "Explorer Link",
            "Type",
            "Direction",
            "From (Name)",
            "From (Address)",
            "To (Name)",
            "To (Address)",
            "Account ID",
            "Amount",
            "Currency",
            "Category",
            "Description",
            "Status",
            "Notes",
        ];
        const rows = txs.map(tx => {
            const isInflow = tx.type === "RECEIVE" || tx.type === "INVOICE";
            return [
                formatDate(tx.timestamp),
                tx.timestamp,
                tx.id,
                tx.txHash,
                `${ARC_EXPLORER_URL}/tx/${tx.txHash}`,
                tx.type,
                isInflow ? "Inflow" : "Outflow",
                tx.from,
                tx.fromAddress,
                tx.to,
                tx.toAddress,
                tx.accountId,
                isInflow ? tx.amount.toString() : `-${tx.amount}`,
                tx.currency,
                tx.category,
                tx.label || "",
                tx.status,
                tx.note || "",
            ].map(escapeCSV);
        });
        return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    };
    const handleExport = (format: "CSV" | "PDF") => {
        if (format === "CSV") {
            const csv = buildCSVContent(filteredTransactions);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `settlbox-${activeTab}-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("CSV report downloaded");
            return;
        }
        toast.success(`${format} export coming soon`);
    };
    const tableHeaders = ["Date", "Description", "Category", "Amount", "Status"];
    const tableData: Record<string, CellContent>[] = useMemo(() => {
        return filteredTransactions.map(tx => {
            const isIncome = tx.type === "RECEIVE" || tx.type === "INVOICE";
            return {
                Date: formatDate(tx.timestamp),
                Description: (<div className="flex flex-col">
            <span className="text-text-primary">{tx.label || tx.note || "Transaction"}</span>
            <span className="text-xs text-text-secondary">{tx.to || tx.from}</span>
          </div>),
                Category: <Badge status={BadgeStatus.NEUTRAL} text={tx.category}/>,
                Amount: (<span className={`num font-medium ${isIncome ? "text-badge-success-text" : "text-badge-fail-text"}`}>
            {isIncome ? "+" : "-"}
            {formatCurrency(tx.amount)}
          </span>),
                Status: <Badge status={getStatusBadge(tx.status)} text={tx.status}/>,
            };
        });
    }, [filteredTransactions]);
    if (!data)
        return null;
    return (<div className="flex flex-col w-full gap-4">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Accounting & Reports</h2>
          <p className="text-sm text-text-secondary mt-1">Financial overview and transaction reports</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange}/>
          <FrostedMenu label={tabs.find(t => t.id === activeTab)?.label ?? "Income"} items={tabs.map(t => ({ key: t.id, label: t.label }))} activeKey={activeTab} onSelect={setActiveTab} width={180}/>
          <FrostedMenu label="Export" items={[
            { key: "CSV", label: "Export as CSV" },
            { key: "PDF", label: "Export as PDF" },
        ]} onSelect={key => handleExport(key as "CSV" | "PDF")} align="right" width={180}/>
        </div>
      </div>

      
      {activeTab === "income" && (<>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Total Income" amount={formatCurrency(totalIncome)} info="Total income for Q1 2026"/>
            <Card title="Avg Monthly Income" amount={formatCurrency(monthlyFinancials.length > 0 ? Math.round(totalIncome / monthlyFinancials.length) : 0)} info="Average monthly income across the period"/>
            <Card title="Income Transactions" amount={filteredTransactions.length.toString()} info="Number of income transactions"/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Monthly Income">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyFinancials.map(m => ({ month: m.month, Income: m.income }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-divider)"/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}/>
                  <Tooltip content={<ChartTooltip />}/>
                  <Bar dataKey="Income" fill="#4CAF50" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Income by Category">
              <PieChartSection data={incomeBreakdown} emptyMessage="No income data available"/>
            </ChartCard>
          </div>
        </>)}

      
      {activeTab === "expenses" && (<>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Total Expenses" amount={formatCurrency(totalExpenses)} info="Total expenses for Q1 2026"/>
            <Card title="Avg Monthly Expenses" amount={formatCurrency(monthlyFinancials.length > 0 ? Math.round(totalExpenses / monthlyFinancials.length) : 0)} info="Average monthly expenses across the period"/>
            <Card title="Net Flow" amount={formatCurrency(netFlow)} info="Net cash flow (income minus expenses)"/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Monthly Expenses">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyFinancials.map(m => ({ month: m.month, Expenses: m.expenses }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-divider)"/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}/>
                  <Tooltip content={<ChartTooltip />}/>
                  <Bar dataKey="Expenses" fill="#F44336" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Expense Breakdown by Category">
              <PieChartSection data={expenseBreakdown} emptyMessage="No expense data available"/>
            </ChartCard>
          </div>
        </>)}

      
      {activeTab === "payroll" && (<>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Total Payroll" amount={formatCurrency(totalPayroll)} info="Total payroll for Q1 2026"/>
            <Card title="Avg Monthly Payroll" amount={formatCurrency(monthlyFinancials.length > 0 ? Math.round(totalPayroll / monthlyFinancials.length) : 0)} info="Average monthly payroll across the period"/>
            <Card title="Treasury Balance" amount={formatCurrency(treasuryBalance)} info="Current total balance across all accounts"/>
            <Card title="Runway" amount={`${simExtraBurn > 0 ? simRunwayMonths : currentRunwayMonths} months`} info={simExtraBurn > 0
                ? `Projected with ${simEmployees.length} hire${simEmployees.length !== 1 ? "s" : ""} (was ${currentRunwayMonths} months)`
                : "Months of runway at current burn rate"}/>
          </div>

          <ChartCard title="Monthly Payroll" action={<SecondaryButton text={simEmployees.length > 0 ? `Simulation (${simEmployees.length} hires)` : "Simulate"} variant={simEmployees.length > 0 ? "dark" : "light"} onClick={openSimulation} buttonClassName="w-auto"/>}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFinancials.map(m => ({ month: m.month, Payroll: m.payroll }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-divider)"/>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}/>
                <Tooltip content={<ChartTooltip />}/>
                <Bar dataKey="Payroll" fill="#2196F3" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>)}

      
      {activeTab === "tax" && (<>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Gross Income" amount={formatCurrency(totalIncome)} info="Total gross income for Q1 2026"/>
            <Card title="Deductible Expenses" amount={formatCurrency(totalExpenses)} info="Total deductible expenses"/>
            <Card title={`Est. Tax (${jurisdiction.corpTaxRate}%)`} amount={formatCurrency(estimatedTax > 0 ? estimatedTax : 0)} info={`Estimated at ${jurisdiction.name} corporate tax rate`}/>
            <Card title="Filing Deadline" amount={jurisdiction.filingDeadline} info={`Tax filing deadline for ${jurisdiction.name}`}/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            <ChartCard title="Income vs Deductible Expenses">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyFinancials.map(m => ({ month: m.month, Income: m.income, Expenses: m.expenses }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-divider)"/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}/>
                  <Tooltip content={<ChartTooltip />}/>
                  <Bar dataKey="Income" fill="#4CAF50" radius={[4, 4, 0, 0]}/>
                  <Bar dataKey="Expenses" fill="#F44336" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            
            <div className="bg-background border border-primary-divider rounded-2xl p-5 flex flex-col gap-5">
              <div>
                <h3 className="text-base font-medium text-text-primary mb-4">Tax Breakdown ({jurisdiction.name})</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Taxable Income</span>
                    <span className="num text-base text-text-primary">
                      {formatCurrency(netFlow > 0 ? netFlow : 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Corporate Tax Rate</span>
                    <span className="num text-base text-text-primary">{jurisdiction.corpTaxRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Estimated Tax Owed</span>
                    <span className="num text-base text-badge-fail-text">
                      {formatCurrency(estimatedTax > 0 ? estimatedTax : 0)}
                    </span>
                  </div>
                  <div className="border-t border-primary-divider pt-4 flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Effective Tax Rate</span>
                    <span className="num text-base text-text-primary">
                      {totalIncome > 0 ? ((Math.max(estimatedTax, 0) / totalIncome) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                </div>
              </div>

              
              <div className="border-t border-primary-divider pt-4 flex flex-col gap-3">
                <h4 className="text-sm font-medium text-text-primary">Compliance Rules</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Crypto-to-crypto swaps taxable</span>
                  <span className={`text-sm font-semibold ${jurisdiction.cryptoSwapTaxable ? "text-badge-fail-text" : "text-badge-success-text"}`}>
                    {jurisdiction.cryptoSwapTaxable ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Payroll in stablecoins taxable</span>
                  <span className={`text-sm font-semibold ${jurisdiction.payrollTaxable ? "text-badge-awaiting-text" : "text-badge-success-text"}`}>
                    {jurisdiction.payrollTaxable ? "Yes (employee income)" : "No"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Filing deadline</span>
                  <span className="text-sm font-semibold text-text-primary">{jurisdiction.filingDeadline}</span>
                </div>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{jurisdiction.notes}</p>
              </div>
            </div>
          </div>
        </>)}

      
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-text-primary">
            {activeTab === "income"
            ? "Income Transactions" : activeTab === "expenses"
            ? "Expense Transactions" : activeTab === "payroll"
            ? "Payroll Transactions" : "All Transactions"}
          </h3>
          <span className="text-sm text-text-secondary">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Table headers={tableHeaders} data={tableData} noDataMessage="No transactions found"/>
      </div>
    </div>);
};
