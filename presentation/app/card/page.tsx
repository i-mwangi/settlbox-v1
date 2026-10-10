"use client";
import React, { useState, useEffect } from "react";
import { useDemo, DemoCard } from "@/presentation/contexts/DemoProvider";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import { Badge, BadgeStatus } from "@/presentation/components/Common/Badge";
import { Table } from "@/presentation/components/Common/Table";
import { ModalHeader } from "@/presentation/components/Common/ModalHeader";
import BaseModal from "@/presentation/components/Modal/BaseModal";
import InputFilled from "@/presentation/components/Common/Input/InputFilled";
import FieldInput from "@/presentation/components/Common/Input/FieldInput";
import toast from "react-hot-toast";
const CARD_GRADIENTS: Record<string, string> = {
    Visa: "linear-gradient(13deg, #2d46d1 11%, #2235a0 35%, #0d1540 95%)",
    Mastercard: "linear-gradient(13deg, #1a1a2e 11%, #16213e 45%, #0f3460 95%)",
};
function CardVisual({ card, size = "sm" }: {
    card: DemoCard;
    size?: "sm" | "lg";
}) {
    const isLg = size === "lg";
    return (<div className={`relative ${isLg ? "w-[208px] h-[131px]" : "w-[170px] h-[107px]"} rounded-lg overflow-hidden shadow-md shrink-0 ${card.frozen ? "grayscale opacity-70" : ""}`} style={{ background: CARD_GRADIENTS[card.brand] || CARD_GRADIENTS.Visa }}>
      <div className="absolute top-2.5 right-3">
        {card.brand === "Visa" ? (<svg width={isLg ? 38 : 28} height={isLg ? 12 : 9} viewBox="0 0 48 16" fill="none">
            <path d="M19.2 0.8L12.8 15.2H8.8L5.6 3.6C5.4 2.8 5.2 2.4 4.4 2C3.2 1.4 1.2 0.8 0 0.4L0.1 0H6.5C7.4 0 8.1 0.6 8.3 1.6L9.8 9.6L13.6 0H17.6L19.2 0.8ZM33.6 10.4C33.6 6.4 28 6.2 28 4.4C28 3.8 28.6 3.2 29.8 3C30.4 3 32 2.8 33.6 3.6L34.2 0.8C33.4 0.4 32.2 0 30.8 0C27 0 24.2 2.2 24.2 5.2C24.2 7.4 26.2 8.6 27.6 9.4C29.2 10.2 29.6 10.6 29.6 11.2C29.6 12.2 28.4 12.6 27.4 12.6C25.6 12.6 24.6 12.2 23.8 11.8L23.2 14.6C24 15 25.6 15.4 27.2 15.4C31.2 15.4 33.6 13.2 33.6 10.4ZM43.2 15.2H46.8L43.6 0H40.4C39.6 0 39 0.4 38.6 1.2L33.2 15.2H37.2L38 13H42.8L43.2 15.2ZM39 10L41 4L42.2 10H39ZM23.2 0H19.6L16.4 15.2H20L23.2 0Z" fill="rgba(255,255,255,0.5)"/>
          </svg>) : (<div className="flex -space-x-1.5">
            <div className={`${isLg ? "w-4 h-4" : "w-3 h-3"} rounded-full bg-red-500/70`}/>
            <div className={`${isLg ? "w-4 h-4" : "w-3 h-3"} rounded-full bg-yellow-500/70`}/>
          </div>)}
      </div>
      <div className={`absolute ${isLg ? "top-10 left-5" : "top-8 left-4"}`}>
        <div className={`${isLg ? "w-6 h-[18px]" : "w-5 h-[14px]"} rounded-[2px] bg-gradient-to-br from-gray-200 to-gray-400 opacity-80`}/>
      </div>
      <div className={`absolute ${isLg ? "bottom-5 left-3" : "bottom-3.5 left-3"}`}>
        <p className={`text-white/70 ${isLg ? "text-[8px]" : "text-[7px]"} font-mono tracking-wider`}>
          **** **** **** {card.last4}
        </p>
      </div>
      {card.frozen && (<div className="absolute top-2 left-2.5 flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 border border-red-400/30 rounded-full">
          <span className="text-red-300 text-[6px] font-medium">Frozen</span>
        </div>)}
    </div>);
}
function CardFaceLarge({ card, onClick }: {
    card: DemoCard;
    onClick: () => void;
}) {
    const pct = card.spendingLimit > 0 ? Math.min(100, Math.round((card.currentSpend / card.spendingLimit) * 100)) : 0;
    return (<button type="button" onClick={onClick} className="shrink-0 snap-start cursor-pointer rounded-2xl opacity-95 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-100 focus:outline-none">
      <div className={`relative flex h-[210px] w-[340px] flex-col justify-between overflow-hidden rounded-2xl p-5 text-left text-white shadow-sm ${card.frozen ? "grayscale opacity-80" : ""}`} style={{ background: CARD_GRADIENTS[card.brand] || CARD_GRADIENTS.Visa }}>
        
        <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10"/>
        <span className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-white/5"/>

        
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">Corporate Card</p>
            <p className="text-xl font-bold leading-tight">{card.brand}</p>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
            {card.frozen ? "Frozen" : "Active"}
          </span>
        </div>

        
        <div className="relative z-10 flex flex-col gap-2.5">
          <span className="h-6 w-9 rounded-md bg-gradient-to-br from-white/70 to-white/40"/>
          <p className="num text-[15px] font-medium leading-snug tracking-[0.18em]">**** **** **** {card.last4}</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] text-white/70">
              <span className="font-medium">
                ${card.currentSpend.toLocaleString()} / ${card.spendingLimit.toLocaleString()}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white/80" style={{ width: `${pct}%` }}/>
            </div>
          </div>
        </div>

        
        <div className="relative z-10 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-wide text-white/50">Cardholder</p>
            <p className="truncate text-sm font-semibold">{card.cardholder}</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[9px] font-medium uppercase tracking-wide text-white/50">Expires</p>
            <p className="truncate text-sm font-semibold">
              {String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}
            </p>
          </div>
        </div>
      </div>
    </button>);
}
function StatCard({ title, children }: {
    title: string;
    children: React.ReactNode;
}) {
    return (<div className="relative w-full h-full rounded-xl border border-primary-divider p-4 flex flex-col overflow-hidden gap-3" style={{
            backgroundImage: "url(/card/background.svg)",
            backgroundSize: "30%",
            backgroundPosition: "right",
            backgroundRepeat: "no-repeat",
        }}>
      <span className="text-text-secondary text-sm leading-none">{title}</span>
      {children}
    </div>);
}
function TopUpModal({ isOpen, onClose, poolBalance, treasuryBalance, onTopUp, }: {
    isOpen: boolean;
    onClose: () => void;
    poolBalance: number;
    treasuryBalance: number;
    onTopUp: (amount: number) => void;
}) {
    const [amount, setAmount] = useState("");
    const presets = [1000, 5000, 10000, 25000];
    const handleSubmit = () => { toast.error("Card funding requires a configured provider"); };
    return (<BaseModal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Top Up Card Pool" onClose={onClose} icon="/sidebar/credit-card.svg"/>
      <div className="flex flex-col w-[480px] p-5 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background gap-5">
        
        <div className="flex gap-3">
          <div className="flex-1 bg-app-background rounded-xl p-3 flex flex-col gap-1 border border-primary-divider">
            <span className="text-xs text-text-secondary">Card Pool</span>
            <span className="text-lg font-bold text-text-primary">${poolBalance.toLocaleString()}</span>
          </div>
          <div className="flex-1 bg-app-background rounded-xl p-3 flex flex-col gap-1 border border-primary-divider">
            <span className="text-xs text-text-secondary">Treasury</span>
            <span className="text-lg font-bold text-text-primary">${treasuryBalance.toLocaleString()}</span>
          </div>
        </div>

        
        <div className="flex items-center gap-3 p-3 rounded-xl bg-app-background border border-primary-divider">
          <img src="/token/usdc.svg" alt="USDC" className="w-7 h-7"/>
          <div className="flex-1">
            <p className="text-text-secondary text-xs">From treasury</p>
            <p className="text-text-primary text-sm font-medium">USDC (Stablecoin)</p>
          </div>
          <span className="text-xs text-text-secondary bg-background px-2 py-1 rounded-full border border-primary-divider">Auto-converted to fiat</span>
        </div>

        
        <FieldInput label="Amount (USD)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="text-xl font-bold"/>

        
        <div className="flex gap-2">
          {presets.map((p) => (<button key={p} type="button" onClick={() => setAmount(String(p))} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${Number(amount) === p
                ? "bg-background text-text-primary border-primary-blue" : "bg-app-background text-text-secondary border-primary-divider hover:border-primary-blue/40"}`}>
              ${p.toLocaleString()}
            </button>))}
        </div>

        <div className="flex gap-2">
          <SecondaryButton text="Cancel" onClick={onClose} variant="light" buttonClassName="flex-1"/>
          <PrimaryButton text="Top Up" onClick={handleSubmit} containerClassName="flex-1" disabled={!amount || Number(amount) <= 0}/>
        </div>
      </div>
    </BaseModal>);
}
function AddCardModal({ isOpen, onClose, onAdd, }: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (card: DemoCard) => void;
}) {
    const [cardholder, setCardholder] = useState("");
    const [brand, setBrand] = useState<"Visa" | "Mastercard">("Visa");
    const [spendingLimit, setSpendingLimit] = useState("5000");
    const handleSubmit = () => { toast.error("Card issuance requires a configured provider"); };
    return (<BaseModal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Issue New Card" onClose={onClose} icon="/sidebar/credit-card.svg"/>
      <div className="flex flex-col w-[480px] p-5 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background gap-5">
        
        <div className="flex justify-center">
          <CardVisual card={{
            id: "", last4: "****", brand, cardholder: cardholder || "Your Name",
            expiryMonth: 1, expiryYear: 2029, cvv: "000", spendingLimit: 5000,
            currentSpend: 0, status: "ACTIVE", frozen: false,
        }} size="lg"/>
        </div>

        <InputFilled label="Cardholder Name" placeholder="e.g. John Doe" value={cardholder} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardholder(e.target.value)}/>

        <div className="flex flex-col gap-1.5">
          <p className="text-[14px] text-text-secondary font-barlow">Card Network</p>
          <div className="flex gap-2">
            {(["Visa", "Mastercard"] as const).map((b) => (<button key={b} onClick={() => setBrand(b)} className={`flex-1 py-2 rounded-[12px] text-sm font-medium transition-all cursor-pointer border-b ${brand === b
                ? "bg-app-background border-primary-blue text-text-primary" : "bg-app-background border-primary-divider text-text-secondary"}`}>
                {b}
              </button>))}
          </div>
        </div>

        <InputFilled label="Monthly Spending Limit ($)" placeholder="5000" value={spendingLimit} type="number" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpendingLimit(e.target.value)}/>

        <div className="flex flex-row gap-2">
          <SecondaryButton text="Cancel" onClick={onClose} variant="light" buttonClassName="flex-1"/>
          <PrimaryButton text="Issue Card" onClick={handleSubmit} containerClassName="flex-1"/>
        </div>
      </div>
    </BaseModal>);
}
function SpendingLimitsModal({ isOpen, card, onClose, onSave, }: {
    isOpen: boolean;
    card: DemoCard;
    onClose: () => void;
    onSave: (updates: Partial<DemoCard>) => void;
}) {
    const [dailyLimit, setDailyLimit] = useState(String(card.dailyLimit ?? 2000));
    const [weeklyLimit, setWeeklyLimit] = useState(String(card.weeklyLimit ?? 8000));
    const [monthlyLimit, setMonthlyLimit] = useState(String(card.monthlyLimit ?? card.spendingLimit));
    const handleSave = () => { toast.error("Card limit changes require a configured provider"); };
    return (<BaseModal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Spending Limits" onClose={onClose} icon="/sidebar/credit-card.svg"/>
      <div className="flex flex-col w-[480px] p-5 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background gap-4">
        <p className="text-sm text-text-secondary">
          Configure transaction limits for card ending in {card.last4}
        </p>

        <InputFilled label="Daily Limit ($)" placeholder="2000" value={dailyLimit} type="number" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDailyLimit(e.target.value)}/>
        <InputFilled label="Weekly Limit ($)" placeholder="8000" value={weeklyLimit} type="number" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeeklyLimit(e.target.value)}/>
        <InputFilled label="Monthly Limit ($)" placeholder="10000" value={monthlyLimit} type="number" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyLimit(e.target.value)}/>

        
        <div className="flex gap-2">
          {[
            { label: "Daily", val: dailyLimit },
            { label: "Weekly", val: weeklyLimit },
            { label: "Monthly", val: monthlyLimit },
        ].map(({ label, val }) => (<div key={label} className="flex-1 bg-app-background rounded-lg px-3 py-2 flex flex-col gap-1">
              <span className="text-xs text-text-secondary">{label}</span>
              <span className="text-base font-semibold text-text-primary">${Number(val || 0).toLocaleString()}</span>
            </div>))}
        </div>

        <div className="flex flex-row gap-2">
          <SecondaryButton text="Cancel" onClick={onClose} variant="light" buttonClassName="flex-1"/>
          <PrimaryButton text="Save Changes" onClick={handleSave} containerClassName="flex-1"/>
        </div>
      </div>
    </BaseModal>);
}
function CardOverview({ cards, poolBalance, onSelectCard, onAddCard, onTopUp, }: {
    cards: DemoCard[];
    poolBalance: number;
    onSelectCard: (card: DemoCard) => void;
    onAddCard: () => void;
    onTopUp: () => void;
}) {
    const { setTitle, setShowBackArrow } = useTitle();
    const totalSpend = cards.reduce((sum, c) => sum + c.currentSpend, 0);
    const totalLimit = cards.reduce((sum, c) => sum + c.spendingLimit, 0);
    const activeCards = cards.filter((c) => !c.frozen).length;
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <span className="text-text-secondary">Expenses</span>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Corporate Card</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    const tableHeaders = ["Card", "Cardholder", "Brand", "Expires", "Spending", "Status"];
    const tableData = cards.map((card) => {
        return {
            Card: <CardVisual card={card} size="sm"/>,
            Cardholder: (<div className="flex flex-col gap-0.5">
          <span className="text-text-primary font-medium text-sm">{card.cardholder}</span>
          <span className="text-text-secondary text-xs font-mono">**** {card.last4}</span>
        </div>),
            Brand: <span className="text-text-primary text-sm">{card.brand}</span>,
            Expires: (<span className="text-text-secondary text-sm">
          {String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}
        </span>),
            Spending: (<div className="flex items-center justify-center">
          <div className="flex items-center gap-1.5 bg-app-background rounded-full px-3 py-1.5 border border-primary-divider">
            <span className="text-text-primary text-sm font-medium">${card.currentSpend.toLocaleString()}</span>
            <span className="text-text-secondary text-xs">/ ${card.spendingLimit.toLocaleString()}</span>
          </div>
        </div>),
            Status: (<div className="flex justify-center">
          <Badge status={card.frozen ? BadgeStatus.FAIL : BadgeStatus.SUCCESS} text={card.frozen ? "Frozen" : "Active"} className="px-3"/>
        </div>),
        };
    });
    const handleRowClick = (_rowData: Record<string, any>, index: number) => {
        onSelectCard(cards[index]);
    };
    return (<div className="flex w-full h-full flex-col overflow-y-auto">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Corporate Card</h1>
          <p className="text-[14px] text-text-secondary">Issue and manage virtual cards for your team.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SecondaryButton text="Top Up Pool" onClick={onTopUp} variant="light" buttonClassName="w-fit whitespace-nowrap"/>
          <PrimaryButton text="Add Card" icon="/misc/plus-icon.svg" iconPosition="left" onClick={onAddCard} containerClassName="w-[130px]" buttonClassName="whitespace-nowrap"/>
        </div>
      </div>

      
      <div className="flex w-full flex-row gap-2 px-6 pb-2">
        <StatCard title="Card Pool Balance">
          <span className="num text-text-primary text-2xl leading-none">${poolBalance.toLocaleString()}</span>
        </StatCard>
        <StatCard title="Total Cards">
          <span className="num text-text-primary text-2xl leading-none">{cards.length}</span>
        </StatCard>
        <StatCard title="Active Cards">
          <span className="num text-text-primary text-2xl leading-none">{activeCards}</span>
        </StatCard>
        <StatCard title="Total Spend">
          <span className="num text-text-primary text-2xl leading-none">
            ${totalSpend.toLocaleString()}
            <span className="text-text-secondary text-sm font-medium"> / ${totalLimit.toLocaleString()}</span>
          </span>
        </StatCard>
      </div>

      
      <div className="flex flex-col gap-1 px-6 pb-6 pt-3">
        <span className="text-lg font-semibold text-text-primary">Your Cards</span>
        <div className="-mx-1 flex flex-wrap gap-4 px-1 pt-2">
          {cards.map((card) => (<CardFaceLarge key={card.id} card={card} onClick={() => onSelectCard(card)}/>))}
        </div>
      </div>
    </div>);
}
const MERCHANT_ICONS: Record<string, string> = {
    Figma: "https://cdn.simpleicons.org/figma",
    AWS: "https://cdn.simpleicons.org/amazonaws",
    Vercel: "https://cdn.simpleicons.org/vercel/black",
    "Google Workspace": "https://cdn.simpleicons.org/google",
    ClickUp: "https://cdn.simpleicons.org/clickup",
    Uber: "https://cdn.simpleicons.org/uber",
    GitHub: "https://cdn.simpleicons.org/github",
    Notion: "https://cdn.simpleicons.org/notion",
    Grab: "https://cdn.simpleicons.org/grab",
    Starbucks: "https://cdn.simpleicons.org/starbucks",
    Linear: "https://cdn.simpleicons.org/linear",
    "1Password": "https://cdn.simpleicons.org/1password",
};
function CardDetail({ card, data, onBack, onToggleFreeze, onOpenSettings, }: {
    card: DemoCard;
    data: {
        totalBalance: number;
        cardTransactions: {
            id: string;
            merchant: string;
            amount: number;
            currency: string;
            category: string;
            date: string;
            status: string;
        }[];
        user: {
            teamMembership: {
                firstName: string;
                lastName: string;
            } | null;
        };
    };
    onBack: () => void;
    onToggleFreeze: () => void;
    onOpenSettings: () => void;
}) {
    const { setTitle, setShowBackArrow } = useTitle();
    const [showCvv, setShowCvv] = useState(false);
    const [txPage, setTxPage] = useState(1);
    const [txRows, setTxRows] = useState(10);
    const transactions = data.cardTransactions;
    const labelStyles = "py-1 text-sm font-medium text-text-secondary";
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <span className="text-text-secondary">Expenses</span>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <button type="button" onClick={onBack} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Corporate Card
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">{card.cardholder}</span>
      </div>);
        setShowBackArrow(false);
    }, [card.cardholder]);
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text.replace(/[\s*]/g, ""));
        toast.success("Copied to clipboard");
    };
    const txHeaders = ["Merchant", "Date", "Category", "Amount", "Status"];
    const txData = transactions.map((tx) => ({
        Merchant: (<div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full shrink-0 bg-app-background border border-primary-divider flex items-center justify-center">
          {MERCHANT_ICONS[tx.merchant] ? (<img src={MERCHANT_ICONS[tx.merchant]} alt="" className="w-4 h-4 object-contain"/>) : (<span className="text-xs font-bold text-text-secondary">{tx.merchant.charAt(0)}</span>)}
        </div>
        <span className="text-sm font-medium text-text-primary">{tx.merchant}</span>
      </div>),
        Date: (<span className="text-text-secondary text-sm">
        {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </span>),
        Category: (<div className="flex items-center justify-center">
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-app-background border border-primary-divider text-text-primary">
          {tx.category}
        </span>
      </div>),
        Amount: <span className="text-text-primary text-sm font-medium">${tx.amount.toLocaleString()}</span>,
        Status: (<div className="flex justify-center">
        <Badge status={tx.status === "COMPLETED" ? BadgeStatus.SUCCESS : tx.status === "PENDING" ? BadgeStatus.AWAITING : BadgeStatus.FAIL} text={tx.status === "COMPLETED" ? "Success" : tx.status === "PENDING" ? "Pending" : "Failed"} className="px-3"/>
      </div>),
    }));
    return (<div className="flex w-full h-full flex-col overflow-y-auto">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <CardVisual card={card} size="sm"/>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">{card.cardholder}</h1>
              <Badge status={card.frozen ? BadgeStatus.FAIL : BadgeStatus.SUCCESS} text={card.frozen ? "Frozen" : "Active"} className="px-3"/>
            </div>
            <p className="text-[14px] text-text-secondary">
              {card.brand} **** {card.last4}, Virtual
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SecondaryButton text="Spending Limits" variant="light" onClick={onOpenSettings} buttonClassName="w-fit whitespace-nowrap"/>
          <SecondaryButton text={card.frozen ? "Unfreeze Card" : "Freeze Card"} variant={card.frozen ? "dark" : "red"} onClick={onToggleFreeze} buttonClassName="w-fit whitespace-nowrap"/>
        </div>
      </div>

      
      <div className="flex gap-3 items-stretch w-full px-6 pb-2">
        <div className="flex-1 border border-primary-divider rounded-2xl px-5 py-4 flex flex-col gap-1">
          <span className="text-text-secondary text-sm">Balance</span>
          <span className="num text-text-primary text-2xl leading-none">${data.totalBalance.toLocaleString()}</span>
        </div>
        <div className="flex-1 border border-primary-divider rounded-2xl px-5 py-4 flex flex-col gap-1">
          <span className="text-text-secondary text-sm">Spent this month</span>
          <span className="num text-text-primary text-2xl leading-none">${card.currentSpend.toLocaleString()}</span>
          <span className="text-text-secondary text-xs">of ${card.spendingLimit.toLocaleString()} limit</span>
        </div>
        <div className="flex-1 border border-primary-divider rounded-2xl px-5 py-4 flex flex-col gap-1">
          <span className="text-text-secondary text-sm">Daily Limit</span>
          <span className="num text-text-primary text-2xl leading-none">${(card.dailyLimit ?? card.spendingLimit).toLocaleString()}</span>
        </div>
        <div className="flex-1 border border-primary-divider rounded-2xl px-5 py-4 flex flex-col gap-1">
          <span className="text-text-secondary text-sm">Expires</span>
          <span className="num text-text-primary text-2xl leading-none">
            {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
          </span>
        </div>
      </div>

      
      <div className="flex gap-3 items-start w-full px-6 pt-2 pb-2">
        
        <div className="flex-1 border border-primary-divider rounded-2xl px-4 py-3 flex gap-3 items-center">
          <div className="flex flex-col gap-1 w-[110px]">
            <div className={labelStyles}>Card Number</div>
            <div className={labelStyles}>CVC</div>
            <div className={labelStyles}>Type</div>
            <div className={labelStyles}>Network</div>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="py-1 flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary font-mono">**** **** **** {card.last4}</span>
              <img src="/misc/copy-icon.svg" alt="Copy" className="w-4 h-4 cursor-pointer opacity-40 hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(`**** **** **** ${card.last4}`)}/>
            </div>
            <div className="py-1 flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary font-mono">{showCvv ? card.cvv : "***"}</span>
              <img src="/misc/eye-icon.svg" alt="Toggle" className="w-4 h-4 cursor-pointer opacity-40 hover:opacity-100 transition-opacity" onClick={() => setShowCvv(!showCvv)}/>
            </div>
            <div className="py-1 text-sm font-medium text-text-primary">Virtual</div>
            <div className="py-1 text-sm font-medium text-text-primary">{card.brand}</div>
          </div>
        </div>

        
        <div className="flex-1 border border-primary-divider rounded-2xl px-5 py-4 flex flex-col justify-center gap-4">
          {[
            { label: "Daily", limit: card.dailyLimit ?? 0, spent: Math.round(card.currentSpend * 0.12) },
            { label: "Weekly", limit: card.weeklyLimit ?? 0, spent: Math.round(card.currentSpend * 0.45) },
            { label: "Monthly", limit: card.monthlyLimit ?? card.spendingLimit, spent: card.currentSpend },
        ].map(({ label, limit, spent }) => {
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            return (<div key={label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{label}</span>
                  <span className="text-sm font-medium text-text-primary">
                    ${spent.toLocaleString()} <span className="text-text-secondary">/ ${limit.toLocaleString()}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-background">
                  <div className="h-full rounded-full bg-primary-blue transition-all" style={{ width: `${pct}%` }}/>
                </div>
              </div>);
        })}
        </div>
      </div>

      
      <div className="mt-2 flex w-full items-center justify-between gap-2 border-b border-primary-divider px-6 pb-3">
        <span className="text-lg font-semibold text-text-primary">Transactions</span>
        <span className="text-sm text-text-secondary">{transactions.length} transactions</span>
      </div>
      <div className="w-full p-5">
        <Table data={txData} headers={txHeaders} showFooter={false} showPagination={true} currentPage={txPage} rowsPerPage={txRows} onPageChange={setTxPage} onRowsPerPageChange={setTxRows}/>
      </div>
    </div>);
}
export default function CardPage() {
    const { data, toggleCardFreezeById, addCard, updateCard, topUpCardPool } = useDemo();
    const [loading, setLoading] = useState(true);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLimitsModal, setShowLimitsModal] = useState(false);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(t);
    }, []);
    if (loading || !data) {
        return (<div className="flex flex-col w-full h-full p-5 gap-5">
        <div className="flex flex-row items-center gap-3 px-5">
          <div className="w-6 h-6 rounded bg-gray-200 animate-pulse"/>
          <div className="w-48 h-7 rounded bg-gray-200 animate-pulse"/>
        </div>
        <div className="grid grid-cols-4 gap-3 px-5">
          {[1, 2, 3, 4].map((i) => (<div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse"/>))}
        </div>
        <div className="grid grid-cols-3 gap-3 px-5">
          {[1, 2, 3].map((i) => (<div key={i} className="h-56 rounded-xl bg-gray-200 animate-pulse"/>))}
        </div>
      </div>);
    }
    const cards = data.cards ?? [data.card];
    const selectedCard = selectedCardId ? cards.find((c) => c.id === selectedCardId) : null;
    return (<><p className="px-6 pt-4 text-sm text-text-secondary">Historical card records. Card operations require a configured provider.</p>
      {selectedCard ? (<CardDetail card={selectedCard} data={data} onBack={() => setSelectedCardId(null)} onToggleFreeze={() => {
                toast.error("Card controls require a configured provider");
            }} onOpenSettings={() => setShowLimitsModal(true)}/>) : (<CardOverview cards={cards} poolBalance={data.cardPoolBalance || 0} onSelectCard={(c) => setSelectedCardId(c.id)} onAddCard={() => setShowAddModal(true)} onTopUp={() => setShowTopUpModal(true)}/>)}

      <AddCardModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={addCard}/>
      <TopUpModal isOpen={showTopUpModal} onClose={() => setShowTopUpModal(false)} poolBalance={data.cardPoolBalance || 0} treasuryBalance={data.totalBalance} onTopUp={topUpCardPool}/>

      {selectedCard && (<SpendingLimitsModal isOpen={showLimitsModal} card={selectedCard} onClose={() => setShowLimitsModal(false)} onSave={(updates) => updateCard(selectedCard.id, updates)}/>)}
    </>);
}
