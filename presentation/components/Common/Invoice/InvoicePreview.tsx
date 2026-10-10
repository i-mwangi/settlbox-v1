"use client";
import React, { useEffect, useRef, useState } from "react";
import { formatInvoiceAmount, formatInvoiceDate } from "@/types/invoice-format";
import { Download } from "iconoir-react";
import { InvoiceData } from "../../InvoiceReview/EmployeeInvoiceReviewContainer";
import { EmployeeAvatar } from "../EmployeeAvatar";

const FitText = ({ text }: { text: string }) => {
  const REF_SIZE = 100;
  const SIDE_PADDING = 48;
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(72);

  useEffect(() => {
    const fit = () => {
      const avail = (wrapRef.current?.clientWidth ?? 0) - SIDE_PADDING;
      const measured = measureRef.current?.scrollWidth ?? 0;
      if (avail > 0 && measured > 0) {
        setFontSize(Math.max(28, Math.min(150, (REF_SIZE * avail) / measured)));
      }
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro && wrapRef.current) ro.observe(wrapRef.current);
    return () => ro?.disconnect();
  }, [text]);

  return (
    <div ref={wrapRef} className="relative flex w-full justify-center overflow-hidden px-6 pb-3 pt-1">
      
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-[-9999px] top-0 whitespace-nowrap font-extrabold tracking-[-0.04em]"
        style={{ fontSize: REF_SIZE, lineHeight: 1 }}
      >
        {text}
      </span>
      <span
        className="whitespace-nowrap font-extrabold leading-[0.95] tracking-[-0.04em] text-[#111] opacity-50"
        style={{ fontSize }}
      >
        {text}
      </span>
    </div>
  );
};

const fmtNum = formatInvoiceAmount;
const fmtDate = formatInvoiceDate;

const shortAddr = (a: string | undefined): string =>
  !a ? "-" : a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;

const InvoicePreview = (invoiceData: InvoiceData & { onDownload?: () => void }) => {
  const token = (invoiceData.from?.token || "USDC").toString().toUpperCase();
  const issuer = invoiceData.from?.name || "-";
  const onDownload = invoiceData.onDownload;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white font-mono text-[#161616]">
      
      <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="flex shrink-0 gap-1.5">
          <span className="h-3 w-3 rounded-full bg-neutral-300" />
          <span className="h-3 w-3 rounded-full bg-neutral-300" />
          <span className="h-3 w-3 rounded-full bg-neutral-300" />
        </div>
        <div className="mx-auto max-w-[60%] truncate whitespace-nowrap rounded-md bg-neutral-100 px-3 py-1 text-[12px] text-neutral-500">
          settlbox.com/invoice/{invoiceData.invoiceNumber}
        </div>
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            title="Download invoice"
            aria-label="Download invoice"
            className="flex shrink-0 items-center justify-center rounded-md bg-neutral-100 p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
          >
            <Download width={14} height={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="px-10 pt-10">
        
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 text-[12px] leading-[1.7]">
          <div className="flex items-start gap-2.5">
            <EmployeeAvatar
              src={invoiceData.logo || undefined}
              seed={invoiceData.from?.email || issuer}
              name={issuer}
              className="mt-0.5 h-7 w-7"
            />
            <div className="min-w-0 break-words uppercase">
              <p className="font-bold tracking-wide">{issuer}</p>
              {invoiceData.from?.company && <p className="text-neutral-500">{invoiceData.from.company}</p>}
              {invoiceData.from?.address && <p className="text-neutral-500">{invoiceData.from.address}</p>}
            </div>
          </div>
          <div className="uppercase text-neutral-500">
            <p className="text-[#161616]">{invoiceData.from?.network || "Arc Testnet"} Network</p>
            <p>
              <span className="text-neutral-400">(Token)</span> {token}
            </p>
            <p>
              <span className="text-neutral-400">(Wallet)</span> {shortAddr(invoiceData.from?.walletAddress)}
            </p>
          </div>
          <div className="text-right uppercase text-neutral-500">
            {invoiceData.from?.email && (
              <p>
                <span className="text-neutral-400">(Mail)</span> {invoiceData.from.email}
              </p>
            )}
            <p>
              <span className="text-neutral-400">(Web)</span> settlbox.com
            </p>
          </div>
        </div>

        
        <div className="mt-11 grid grid-cols-2 gap-4 text-[12px] leading-[1.7]">
          <div className="min-w-0 break-words uppercase">
            <p className="mb-1 text-neutral-400">Billed To</p>
            <p className="font-bold">{invoiceData.billTo?.company || invoiceData.billTo?.name || "-"}</p>
            {invoiceData.billTo?.email && <p className="text-neutral-500">{invoiceData.billTo.email}</p>}
            {invoiceData.billTo?.address && <p className="text-neutral-500">{invoiceData.billTo.address}</p>}
          </div>
          <div className="text-right uppercase text-neutral-500">
            <p>
              <span className="text-neutral-400">(Invoice Date)</span> {fmtDate(invoiceData.date)}
            </p>
            <p>
              <span className="text-neutral-400">(Invoice No)</span> {invoiceData.invoiceNumber}
            </p>
            <p>
              <span className="text-neutral-400">(Due Date)</span> {fmtDate(invoiceData.dueDate)}
            </p>
          </div>
        </div>

        
        <div className="mt-11 text-[12px] uppercase">
          <div className="grid grid-cols-[2.6fr_0.6fr_0.9fr_1fr_1fr] gap-2 border-b border-neutral-200 pb-2 text-neutral-400">
            <span>Subject</span>
            <span className="text-center">Qty</span>
            <span>Unit</span>
            <span className="text-right">Price</span>
            <span className="text-right">Amount</span>
          </div>
          {invoiceData.items?.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[2.6fr_0.6fr_0.9fr_1fr_1fr] items-center gap-2 border-b border-neutral-100 py-4"
            >
              <span className="font-medium">{item.description}</span>
              <span className="text-center text-neutral-600">{item.qty}</span>
              <span className="text-neutral-500">Month</span>
              <span className="text-right text-neutral-600">$ {fmtNum(item.price)}</span>
              <span className="text-right">$ {fmtNum(item.amount)}</span>
            </div>
          ))}
        </div>

        
        <div className="mt-7 flex flex-col items-end gap-2.5 text-[12px] uppercase">
          <div className="flex w-[55%] justify-between text-neutral-500">
            <span className="text-neutral-400">Subtotal</span>
            <span>{fmtNum(invoiceData.subtotal)}</span>
          </div>
          <div className="flex w-[55%] justify-between text-neutral-500">
            <span className="text-neutral-400">Tax (0%)</span>
            <span>0.00</span>
          </div>
          <div className="flex w-[55%] justify-between border-t border-neutral-200 pt-2 font-bold">
            <span className="text-neutral-400">Total</span>
            <span>
              {fmtNum(invoiceData.total)} {token}
            </span>
          </div>
        </div>

        
        <div className="mt-9 text-center text-[12px] uppercase text-neutral-500">
          <p>With best regards,</p>
        </div>
      </div>

      
      <FitText text={issuer} />
    </div>
  );
};

export default InvoicePreview;
