"use client";
import React, { useState, useEffect } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { Badge, BadgeStatus } from "@/presentation/components/Common/Badge";
import toast from "react-hot-toast";
const FIAT_OPTIONS = [
    { code: "KES", label: "Kenyan Shilling", symbol: "KSh", flag: "/flag/ke.svg" },
    { code: "NGN", label: "Nigerian Naira", symbol: "\u20A6", flag: "/flag/ng.svg" },
    { code: "GHS", label: "Ghanaian Cedi", symbol: "GH\u20B5", flag: "/flag/gh.svg" },
];
const RATES: Record<string, number> = { KES: 130, NGN: 1500, GHS: 15 };
const FEE_RATE = 0.0025;
function fmt(n: number, d = 2) {
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
const StatCard = ({ label, value, sub }: {
    label: string;
    value: string;
    sub?: string;
}) => (<div className="flex-1 rounded-xl border border-primary-divider p-4 flex flex-col gap-2" style={{ backgroundImage: "url(/card/background.svg)", backgroundSize: "30%", backgroundPosition: "right", backgroundRepeat: "no-repeat" }}>
    <span className="text-text-secondary text-sm leading-none">{label}</span>
    <span className="num text-text-primary text-2xl leading-none">{value}</span>
    {sub && <span className="text-text-secondary text-xs">{sub}</span>}
  </div>);
export default function CashoutPage() {
    const { data } = useDemo();
    const { setTitle, setShowBackArrow } = useTitle();
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState("");
    const [fiat, setFiat] = useState("KES");
    const converting = false;
    const [showFiatDropdown, setShowFiatDropdown] = useState(false);
    useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
    useEffect(() => {
        setTitle(<span className="text-[14px] font-medium text-text-primary">Cashout</span>);
        setShowBackArrow(false);
    }, []);
    const parsedAmount = parseFloat(amount) || 0;
    const rate = RATES[fiat] ?? 1;
    const fee = parsedAmount * FEE_RATE;
    const netReceive = (parsedAmount - fee) * rate;
    const selectedFiat = FIAT_OPTIONS.find(f => f.code === fiat)!;
    const rampHistory = data?.rampHistory ?? [];
    const totalCashedOut = rampHistory.filter(h => h.type === "OFF_RAMP").reduce((s, h) => s + h.toAmount, 0);
    const totalDeposited = rampHistory.filter(h => h.type === "ON_RAMP").reduce((s, h) => s + h.toAmount, 0);
    const handleCashout = () => {
        if (parsedAmount <= 0)
            return;
        toast.error("Bank payouts are not available until a payout provider is connected");
    };
    if (loading || !data) {
        return (<div className="flex w-full h-full flex-col gap-4 px-6 pt-6 pb-5">
        <div className="h-8 w-48 bg-primary-divider rounded animate-pulse"/>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="flex-1 h-24 bg-primary-divider rounded-xl animate-pulse"/>)}
        </div>
        <div className="flex-1 bg-primary-divider rounded-2xl animate-pulse"/>
      </div>);
    }
    return (<div className="flex w-full h-full flex-col">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Cashout</h1>
          <p className="text-[14px] text-text-secondary">
            Convert USDC from your treasury and withdraw it to your business bank account.
          </p>
        </div>
      </div>

      
      <div className="flex w-full flex-row gap-2 px-6 pb-2">
        <StatCard label="Treasury Balance" value={`$${fmt(data.totalBalance)}`} sub="Available across all wallets"/>
        <StatCard label="Total Cashed Out" value={`$${fmt(totalCashedOut)}`} sub={`${rampHistory.filter(h => h.type === "OFF_RAMP").length} withdrawals`}/>
        <StatCard label="Total Deposited" value={`$${fmt(totalDeposited)}`} sub={`${rampHistory.filter(h => h.type === "ON_RAMP").length} deposits`}/>
      </div>

      
      <div className="flex flex-row gap-4 w-full px-6 pb-5 flex-1 min-h-0">
        
        <div className="w-[380px] flex flex-col gap-4">
          <div className="bg-background rounded-2xl border border-primary-divider p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold text-text-primary">Withdraw to Bank</span>
              <span className="text-sm text-text-secondary">Convert USDC from your treasury and send it to your business bank account.</span>
            </div>

            
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-secondary">Amount (USDC)</span>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-primary-divider bg-app-background">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="min-w-0 flex-1 text-2xl font-semibold text-text-primary bg-transparent outline-none placeholder:text-text-secondary/40"/>
                <div className="flex shrink-0 items-center gap-1.5">
                  <img src="/token/usdc.svg" alt="USDC" className="w-5 h-5"/>
                  <span className="text-sm font-medium text-text-secondary">USDC</span>
                </div>
              </div>
            </div>

            
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-secondary">Receive as</span>
              <div className="relative">
                <button onClick={() => setShowFiatDropdown(!showFiatDropdown)} className="w-full flex items-center justify-between p-3 rounded-xl border border-primary-divider bg-app-background cursor-pointer hover:border-text-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={selectedFiat.flag} alt={fiat} className="w-6 h-4 rounded-sm object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}/>
                    <span className="text-text-primary font-medium">{selectedFiat.label}</span>
                    <span className="text-text-secondary text-sm">({selectedFiat.code})</span>
                  </div>
                  <svg className={`w-4 h-4 text-text-secondary transition-transform ${showFiatDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {showFiatDropdown && (<>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFiatDropdown(false)}/>
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-background border border-primary-divider rounded-xl shadow-lg overflow-hidden">
                      {FIAT_OPTIONS.map(f => (<button key={f.code} className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-app-background transition-colors cursor-pointer ${f.code === fiat ? "bg-app-background" : ""}`} onClick={() => { setFiat(f.code); setShowFiatDropdown(false); }}>
                          <img src={f.flag} alt={f.code} className="w-6 h-4 rounded-sm object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}/>
                          <span className="text-text-primary text-sm font-medium">{f.label}</span>
                          <span className="text-text-secondary text-xs">({f.code})</span>
                        </button>))}
                    </div>
                  </>)}
              </div>
            </div>

            
            {parsedAmount > 0 && (<div className="flex flex-col gap-2.5 p-4 rounded-xl bg-app-background border border-primary-divider">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Exchange rate</span>
                  <span className="text-text-primary font-medium">1 USDC = {fmt(rate, 4)} {fiat}</span>
                </div>
                <div className="border-t border-primary-divider"/>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Network fee (0.25%)</span>
                  <span className="text-text-primary">{fmt(fee)} USDC</span>
                </div>
                <div className="border-t border-primary-divider"/>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Estimated arrival</span>
                  <span className="text-text-primary">1-2 business days</span>
                </div>
                <div className="border-t border-primary-divider"/>
                <div className="flex justify-between">
                  <span className="text-text-primary font-semibold">Bank receives</span>
                  <span className="text-text-primary font-bold text-lg">{selectedFiat.symbol}{fmt(netReceive)}</span>
                </div>
              </div>)}

            <PrimaryButton text={converting ? "Processing..." : parsedAmount > 0 ? `Cashout ${selectedFiat.symbol}${fmt(netReceive)}` : "Enter amount"} onClick={handleCashout} disabled={parsedAmount <= 0 || converting} loading={converting}/>
          </div>

          
          <div className="bg-background rounded-2xl border border-primary-divider p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#E2000F] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">DBS</span>
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium text-text-primary">DBS Business Current Account</span>
              <span className="text-xs text-text-secondary">****6721 - KES / NGN / GHS</span>
            </div>
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          </div>
        </div>

        
        <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-primary-divider overflow-hidden">
          <div className="flex items-center justify-between w-full p-5 border-b border-primary-divider">
            <span className="text-lg font-semibold text-text-primary">Withdrawal History</span>
            <span className="text-sm text-text-secondary">{rampHistory.length} transactions</span>
          </div>
          <div className="overflow-auto thin-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary-divider">
                  <th className="text-left text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Type</th>
                  <th className="text-right text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Crypto</th>
                  <th className="text-right text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Fiat</th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Bank</th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rampHistory.length === 0 ? (<tr>
                    <td colSpan={6} className="text-center py-16 text-text-secondary text-sm">
                      <img src="/misc/hexagon-multisig-icon.svg" alt="empty" className="w-20 mx-auto mb-3 opacity-50"/>
                      No withdrawals yet
                    </td>
                  </tr>) : (rampHistory.map(entry => {
            const isWithdraw = entry.type === "OFF_RAMP";
            return (<tr key={entry.id} className="border-b border-primary-divider last:border-b-0 hover:bg-app-background transition-colors">
                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-text-primary">{fmtDate(entry.completedAt)}</td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isWithdraw ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                            {isWithdraw ? "Withdraw" : "Deposit"}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-right font-medium text-text-primary">
                          {isWithdraw ? "-" : "+"}{fmt(isWithdraw ? entry.fromAmount : entry.toAmount)} {isWithdraw ? entry.fromCurrency : entry.toCurrency}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-right font-medium text-text-primary">
                          {isWithdraw ? "+" : "-"}{fmt(isWithdraw ? entry.toAmount : entry.fromAmount)} {isWithdraw ? entry.toCurrency : entry.fromCurrency}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-text-secondary">{entry.bankAccount}</td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center">
                          <Badge text={entry.status.charAt(0) + entry.status.slice(1).toLowerCase()} status={BadgeStatus.SUCCESS}/>
                        </td>
                      </tr>);
        }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>);
}
