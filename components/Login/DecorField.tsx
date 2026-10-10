"use client";
import React, { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ReceiveDollars as Receipt, Wallet, GraphUp as TrendUp } from "iconoir-react";

/* ---------- shared bits ---------- */

const AVATAR_COLORS = ["#066eff", "#00a878", "#7d52f4", "#e97135", "#e93544", "#1b9df0"];

function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("");
  const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length];
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${className}`}
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

type BadgeKind = "paid" | "pending" | "scheduled";
function StatusBadge({ kind }: { kind: BadgeKind }) {
  const map: Record<BadgeKind, [string, string, string, string]> = {
    paid: ["var(--badge-success-background)", "var(--badge-success-text)", "var(--badge-success-border)", "Paid"],
    pending: ["var(--badge-fail-background)", "var(--badge-fail-text)", "var(--badge-fail-border)", "Pending"],
    scheduled: [
      "var(--badge-awaiting-background)",
      "var(--badge-awaiting-text)",
      "var(--badge-awaiting-border)",
      "Scheduled",
    ],
  };
  const [bg, fg, border, label] = map[kind];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: bg, color: fg, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  );
}

/* ---------- decor cards ---------- */

function InvoiceCard({ code, payee, amount, status }: { code: string; payee: string; amount: string; status: BadgeKind }) {
  return (
    <div className="w-[210px] rounded-2xl border border-primary-divider bg-background p-3.5 shadow-[0_20px_44px_-20px_rgba(20,32,64,0.26)]">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#eef4ff" }}>
            <Receipt width={15} height={15} className="text-primary-blue" />
          </div>
          <span className="text-[11px] tracking-wide text-text-secondary">{code}</span>
        </div>
        <StatusBadge kind={status} />
      </div>
      <p className="text-[13px] font-medium text-text-primary">{payee}</p>
      <p className="mt-0.5 text-[19px] font-semibold text-text-primary">{amount}</p>
    </div>
  );
}

function PayrollCard() {
  const team = ["Liam Carter", "Mei Tanaka", "Diego Alvarez"];
  return (
    <div className="w-[230px] rounded-2xl border border-primary-divider bg-background p-4 shadow-[0_20px_44px_-20px_rgba(20,32,64,0.26)]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-text-secondary">Monthly payroll</span>
        <StatusBadge kind="scheduled" />
      </div>
      <p className="mt-1 text-[21px] font-semibold text-text-primary">$23,000.00</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-2">
          {team.map(n => (
            <Avatar key={n} name={n} className="h-6 w-6 ring-2 ring-white" />
          ))}
        </div>
        <span className="text-[11px] text-text-secondary">5 payees · Apr 30</span>
      </div>
    </div>
  );
}

function TransfersCard() {
  const rows: [string, string][] = [
    ["Liam Carter", "+$4,200"],
    ["Mei Tanaka", "+$3,800"],
    ["Diego Alvarez", "+$5,100"],
  ];
  return (
    <div className="w-[238px] rounded-2xl border border-primary-divider bg-background p-3.5 shadow-[0_20px_44px_-20px_rgba(20,32,64,0.26)]">
      <p className="mb-2.5 text-[12px] text-text-secondary">Recent transfers</p>
      <div className="flex flex-col gap-2.5">
        {rows.map(([n, a]) => (
          <div key={n} className="flex items-center gap-2.5">
            <Avatar name={n} className="h-7 w-7" />
            <span className="flex-1 text-[12px] text-text-primary">{n}</span>
            <span className="text-[12px] font-semibold" style={{ color: "var(--badge-success-text)" }}>
              {a}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BalanceChip() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary-divider bg-background px-4 py-3 shadow-[0_18px_40px_-18px_rgba(20,32,64,0.24)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#eef4ff" }}>
        <Wallet width={18} height={18} className="text-primary-blue" />
      </div>
      <div>
        <p className="text-[11px] text-text-secondary">Treasury balance</p>
        <p className="text-[15px] font-semibold text-text-primary">$565,013.30</p>
      </div>
    </div>
  );
}

function ApyChip() {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-[0_18px_40px_-18px_rgba(0,123,75,0.28)]"
      style={{ background: "var(--badge-success-background)", border: "1px solid var(--badge-success-border)" }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70">
        <TrendUp width={18} height={18} style={{ color: "var(--badge-success-text)" }} />
      </div>
      <div>
        <p className="text-[11px]" style={{ color: "var(--badge-success-text)" }}>
          Earn yield
        </p>
        <p className="text-[15px] font-semibold" style={{ color: "var(--badge-success-text)" }}>
          4.85% APY
        </p>
      </div>
    </div>
  );
}

function StickyNote({ text, bg }: { text: string; bg: string }) {
  return (
    <div
      className="w-[150px] px-3.5 py-3 shadow-[0_16px_32px_-14px_rgba(20,32,64,0.28)]"
      style={{ background: bg, borderRadius: "3px" }}
    >
      <p
        className="text-[20px] leading-[1.12] text-[#3a3527]"
        style={{ fontFamily: "var(--font-nanum-pen-script)" }}
      >
        {text}
      </p>
    </div>
  );
}

/* ---------- scatter layout ---------- */

type Item = {
  id: string;
  pos: string; // absolute position utility classes
  rotate: number;
  from: { x?: number; y?: number };
  node: React.ReactNode;
};

// Every item hugs a screen edge and bleeds outward; the centre stays clear for the card.
const ITEMS: Item[] = [
  // left edge
  {
    id: "inv-paid",
    pos: "left-[-3%] top-[9%]",
    rotate: -7,
    from: { x: -80 },
    node: <InvoiceCard code="INV-2041" payee="Acme Robotics" amount="$12,400.00" status="paid" />,
  },
  {
    id: "balance",
    pos: "left-[-1%] top-[42%]",
    rotate: -3,
    from: { x: -70 },
    node: <BalanceChip />,
  },
  {
    id: "inv-pending",
    pos: "bottom-[10%] left-[-3%]",
    rotate: 5,
    from: { x: -80, y: 24 },
    node: <InvoiceCard code="INV-2038" payee="Lumen Studio" amount="$3,250.00" status="pending" />,
  },
  // right edge
  {
    id: "payroll",
    pos: "right-[-3%] top-[10%]",
    rotate: 6,
    from: { x: 80, y: -10 },
    node: <PayrollCard />,
  },
  {
    id: "apy",
    pos: "right-[-1%] top-[44%]",
    rotate: 5,
    from: { x: 70 },
    node: <ApyChip />,
  },
  {
    id: "transfers",
    pos: "bottom-[11%] right-[-4%]",
    rotate: -5,
    from: { x: 80, y: 24 },
    node: <TransfersCard />,
  },
  // top edge
  {
    id: "sticky-yellow",
    pos: "top-[-4%] left-[22%]",
    rotate: 7,
    from: { y: -70 },
    node: <StickyNote text="Run payroll Friday" bg="#fff4c2" />,
  },
  // bottom edge
  {
    id: "sticky-lilac",
    pos: "bottom-[-4%] left-[27%]",
    rotate: 9,
    from: { y: 70 },
    node: <StickyNote text="Review 3 invoices" bg="#e9e3fc" />,
  },
  {
    id: "sticky-blue",
    pos: "bottom-[-4%] right-[22%]",
    rotate: -6,
    from: { y: 70 },
    node: <StickyNote text="Pay 3 contractors" bg="#d6ebff" />,
  },
];

export default function DecorField({ converge = false }: { converge?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-10 hidden lg:block"
      style={{ transformOrigin: "50% 50%" }}
      animate={
        converge
          ? { scale: 0.12, opacity: 0.5, filter: "blur(16px)" }
          : { scale: 1, opacity: 1, filter: "blur(0px)" }
      }
      transition={{ duration: reduce ? 0 : 0.9, ease: [0.5, 0, 0.15, 1] }}
    >
      {ITEMS.map((item, i) => (
        <motion.div
          key={item.id}
          className={`pointer-events-auto absolute ${item.pos} cursor-grab touch-none active:cursor-grabbing`}
          style={{ rotate: item.rotate }}
          drag
          dragMomentum={false}
          dragElastic={0.16}
          dragConstraints={containerRef}
          whileHover={{ scale: 1.03 }}
          whileDrag={{ scale: 1.05, zIndex: 60 }}
        >
          <motion.div
            initial={
              reduce
                ? false
                : { opacity: 0, scale: 0.9, filter: "blur(16px)", x: item.from.x ?? 0, y: item.from.y ?? 0 }
            }
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)", x: 0, y: 0 }}
            transition={{ duration: 0.75, delay: 0.18 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            {item.node}
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
}
