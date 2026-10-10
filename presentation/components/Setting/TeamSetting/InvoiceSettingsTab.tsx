"use client";
import React, { useState, useEffect } from "react";
import { useDemo, InvoiceSettings } from "@/presentation/contexts/DemoProvider";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import toast from "react-hot-toast";
const ACCENT_PRESETS = [
    "#194BFA",
    "#0059FF",
    "#7D52F4",
    "#E93544",
    "#02BE75",
    "#F59E0B",
    "#EC4899",
    "#1B1B1B",
];
const PAYMENT_TERMS = ["Due on receipt", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90"];
const FieldLabel = ({ children }: {
    children: React.ReactNode;
}) => (<label className="text-sm font-medium text-text-secondary">{children}</label>);
const FieldInput = ({ value, onChange, placeholder, type = "text", disabled, }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
}) => (<input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="w-full bg-app-background border-b-2 border-primary-divider rounded-xl px-4 py-3 text-text-primary text-sm outline-none placeholder:text-text-secondary disabled:opacity-50"/>);
const InvoiceSettingsTab = () => {
    const { data, updateInvoiceSettings } = useDemo();
    const settings = data?.invoiceSettings;
    const [logo, setLogo] = useState<string | null>(null);
    const [accentColor, setAccentColor] = useState("#194BFA");
    const [invoicePrefix, setInvoicePrefix] = useState("INV-");
    const [nextInvoiceNumber, setNextInvoiceNumber] = useState(7);
    const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("Net 30");
    const [defaultNote, setDefaultNote] = useState("");
    const [footerText, setFooterText] = useState("");
    const [companyTaxId, setCompanyTaxId] = useState("");
    const [showTaxId, setShowTaxId] = useState(false);
    const [showWalletQr, setShowWalletQr] = useState(true);
    useEffect(() => {
        if (settings) {
            setLogo(settings.logo);
            setAccentColor(settings.accentColor);
            setInvoicePrefix(settings.invoicePrefix);
            setNextInvoiceNumber(settings.nextInvoiceNumber);
            setDefaultPaymentTerms(settings.defaultPaymentTerms);
            setDefaultNote(settings.defaultNote);
            setFooterText(settings.footerText);
            setCompanyTaxId(settings.companyTaxId);
            setShowTaxId(settings.showTaxId);
            setShowWalletQr(settings.showWalletQr);
        }
    }, [settings]);
    const handleSave = async () => {
        try {
        await updateInvoiceSettings({
            logo,
            accentColor,
            invoicePrefix,
            nextInvoiceNumber,
            defaultPaymentTerms,
            defaultNote,
            footerText,
            companyTaxId,
            showTaxId,
            showWalletQr,
        });
        toast.success("Invoice settings saved");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Invoice settings could not be saved");
        }
    };
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (file.size > 500000) {
            toast.error("Logo must be under 500KB");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setLogo(reader.result as string);
        reader.readAsDataURL(file);
    };
    return (<div className="flex flex-col gap-8 w-full max-w-2xl">
      
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-text-primary">Branding</h3>
        <div className="flex flex-col gap-3 p-5 border border-primary-divider rounded-2xl">
          
          <div className="flex flex-col gap-2">
            <FieldLabel>Company Logo</FieldLabel>
            <div className="flex items-center gap-4">
              {logo ? (<div className="relative">
                  <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-primary-divider"/>
                  <button onClick={() => setLogo(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center cursor-pointer">x</button>
                </div>) : (<div className="w-16 h-16 rounded-xl border-2 border-dashed border-primary-divider flex items-center justify-center text-text-secondary text-xs">
                  Logo
                </div>)}
              <label className="px-4 py-2 bg-app-background border border-primary-divider rounded-lg text-sm font-medium text-text-primary cursor-pointer hover:bg-primary-divider/30 transition-colors">
                Upload
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden"/>
              </label>
            </div>
          </div>

          
          <div className="flex flex-col gap-2">
            <FieldLabel>Accent Color</FieldLabel>
            <div className="flex items-center gap-2">
              {ACCENT_PRESETS.map(color => (<button key={color} onClick={() => setAccentColor(color)} className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${accentColor === color ? "border-text-primary scale-110" : "border-transparent"}`} style={{ backgroundColor: color }}/>))}
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-8 h-8 rounded-full cursor-pointer border-0 p-0"/>
            </div>
          </div>
        </div>
      </section>

      
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-text-primary">Invoice Numbering</h3>
        <div className="flex flex-col gap-3 p-5 border border-primary-divider rounded-2xl">
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <FieldLabel>Prefix</FieldLabel>
              <FieldInput value={invoicePrefix} onChange={setInvoicePrefix} placeholder="INV-"/>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <FieldLabel>Next Number</FieldLabel>
              <FieldInput value={String(nextInvoiceNumber)} onChange={v => setNextInvoiceNumber(parseInt(v) || 0)} type="number"/>
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            Preview: <span className="font-mono text-text-primary">{invoicePrefix}{String(nextInvoiceNumber).padStart(4, "0")}</span>
          </p>
        </div>
      </section>

      
      <div className="flex justify-end gap-3 pb-8">
        <PrimaryButton text="Save Settings" onClick={handleSave} containerClassName="w-36"/>
      </div>
    </div>);
};
export default InvoiceSettingsTab;
