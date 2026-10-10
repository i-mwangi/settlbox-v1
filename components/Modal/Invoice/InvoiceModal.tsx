"use client";
import React, { useEffect, useRef } from "react";
import { InvoiceModalProps } from "@/types/modal";
import { ModalProp } from "@/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { EmployeeAvatar } from "@/components/Common/EmployeeAvatar";

const fmtNum = (v: string | number | undefined): string => {
  const n = typeof v === "string" ? parseFloat(v) : v ?? 0;
  return (isNaN(n as number) ? 0 : (n as number)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtDate = (d: string | undefined): string => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()}`;
};

const shortAddr = (a: string | undefined): string => {
  if (!a) return "-";
  return a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
};

export function InvoiceModal({ isOpen, onClose, zIndex, invoice }: ModalProp<InvoiceModalProps>) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const token = invoice.currency || invoice.paymentToken?.name || "USDC";
  const issuerName = invoice.from?.name || "-";

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div
        ref={modalRef}
        className="w-[620px] max-w-[92vw] overflow-hidden rounded-2xl bg-white font-mono text-[#161616] shadow-[0_30px_70px_-30px_rgba(20,32,64,0.45)]"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-neutral-300" />
            <span className="h-3 w-3 rounded-full bg-neutral-300" />
            <span className="h-3 w-3 rounded-full bg-neutral-300" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-1 text-[11px] text-neutral-500">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 10V8a6 6 0 1 1 12 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
            </svg>
            settlbox.com/invoice/{invoice.invoiceNumber}
          </div>
        </div>

        {/* Document body */}
        <div className="max-h-[80vh] overflow-y-auto">
          <div className="px-10 pt-9">
            {/* Header: issuer / network / mail */}
            <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-4 text-[11px] leading-[1.7]">
              <div className="flex items-start gap-2.5">
                <EmployeeAvatar
                  seed={invoice.from?.email || invoice.from?.name}
                  name={issuerName}
                  className="mt-0.5 h-7 w-7"
                />
                <div className="uppercase">
                  <p className="font-bold tracking-wide text-[#161616]">{issuerName}</p>
                  {invoice.from?.company && <p className="text-neutral-500">{invoice.from.company}</p>}
                  {invoice.from?.address && <p className="text-neutral-500">{invoice.from.address}</p>}
                </div>
              </div>

              <div className="uppercase text-neutral-500">
                <p className="text-[#161616]">{invoice.network || "Arc Testnet"} Network</p>
                <p>
                  <span className="text-neutral-400">(Token)</span> {token}
                </p>
                <p>
                  <span className="text-neutral-400">(Wallet)</span> {shortAddr(invoice.walletAddress)}
                </p>
              </div>

              <div className="text-right uppercase text-neutral-500">
                {invoice.from?.email && (
                  <p>
                    <span className="text-neutral-400">(Mail)</span> {invoice.from.email}
                  </p>
                )}
                <p>
                  <span className="text-neutral-400">(Web)</span> settlbox.com
                </p>
              </div>
            </div>

            {/* Billed to + invoice meta */}
            <div className="mt-9 grid grid-cols-2 gap-4 text-[11px] leading-[1.7]">
              <div className="uppercase">
                <p className="mb-1 text-neutral-400">Billed To</p>
                <p className="font-bold text-[#161616]">{invoice.billTo?.name || "-"}</p>
                {invoice.billTo?.company && <p className="text-neutral-500">{invoice.billTo.company}</p>}
                {invoice.billTo?.email && <p className="text-neutral-500">{invoice.billTo.email}</p>}
              </div>
              <div className="text-right uppercase text-neutral-500">
                <p>
                  <span className="text-neutral-400">(Invoice Date)</span> {fmtDate(invoice.date)}
                </p>
                <p>
                  <span className="text-neutral-400">(Invoice No)</span> {invoice.invoiceNumber}
                </p>
                <p>
                  <span className="text-neutral-400">(Due Date)</span> {fmtDate(invoice.dueDate)}
                </p>
              </div>
            </div>

            {/* Line items */}
            <div className="mt-9 text-[11px] uppercase">
              <div className="grid grid-cols-[2.6fr_0.6fr_0.9fr_1fr_1fr] gap-2 border-b border-neutral-200 pb-2 text-neutral-400">
                <span>Subject</span>
                <span className="text-center">Qty</span>
                <span>Unit</span>
                <span className="text-right">Price</span>
                <span className="text-right">Amount</span>
              </div>
              {invoice.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[2.6fr_0.6fr_0.9fr_1fr_1fr] items-center gap-2 border-b border-neutral-100 py-3.5"
                >
                  <span className="font-medium text-[#161616]">{item.name}</span>
                  <span className="text-center text-neutral-600">{item.qty}</span>
                  <span className="text-neutral-500">Month</span>
                  <span className="text-right text-neutral-600">$ {fmtNum(item.rate)}</span>
                  <span className="text-right text-[#161616]">$ {fmtNum(item.amount)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 flex flex-col items-end gap-2 text-[11px] uppercase">
              <div className="flex w-[55%] justify-between text-neutral-500">
                <span className="text-neutral-400">Subtotal</span>
                <span>{fmtNum(invoice.subtotal)}</span>
              </div>
              <div className="flex w-[55%] justify-between text-neutral-500">
                <span className="text-neutral-400">Tax (0%)</span>
                <span>0.00</span>
              </div>
              <div className="flex w-[55%] justify-between border-t border-neutral-200 pt-2 font-bold text-[#161616]">
                <span className="text-neutral-400">Total</span>
                <span>
                  {fmtNum(invoice.total)} {token}
                </span>
              </div>
            </div>

            {/* Regards */}
            <div className="mt-10 text-[11px] uppercase leading-[1.7] text-neutral-500">
              <p>With best regards,</p>
              <p className="text-[#161616]">{issuerName}</p>
            </div>
          </div>

          {/* Oversized issuer (employee) name, bleeds to the edges like the reference */}
          <div className="overflow-hidden px-10 pt-6">
            <p className="-mb-4 whitespace-nowrap text-[86px] font-extrabold leading-[0.82] tracking-[-0.04em] text-[#111]">
              {issuerName}
            </p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

export default InvoiceModal;
