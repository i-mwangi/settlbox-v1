"use client";
import { n } from "@/presentation/services/utils/normalizeToken";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import InputOutlined from "@/presentation/components/Common/Input/InputOutlined";
import FieldInput from "@/presentation/components/Common/Input/FieldInput";
import FieldTextarea from "@/presentation/components/Common/Input/FieldTextarea";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import { DueDateDropdown } from "@/presentation/components/Common/Dropdown/DueDateDropdown";
import InvoicePreview from "../Common/Invoice/InvoicePreview";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { MODAL_IDS, PermissionRequiredModalProps } from "@/presentation/types/modal";
import { createB2BInvoice, sendB2BInvoice, downloadB2BInvoicePdf } from "@/presentation/services/api/invoice";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { useListAccountsByCompany } from "@/presentation/services/api/multisig";
import { CreateB2BInvoiceDto, Currency, InvoiceItemDto, B2BFromDetailsDto, UnregisteredCompanyDto, } from "@/presentation/types/dto/invoice";
import { NetworkDto } from "@/presentation/types/dto/network";
import { TokenDto } from "@/presentation/types/dto/token";
import { ClientResponseDto } from "@/presentation/types/dto/client";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import { useAuth } from "@/presentation/services/auth/context";
import { AuthMeResponse } from "@/presentation/services/auth/api";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { InvoiceModalProps } from "@/presentation/types/modal";
import { trackEvent } from "@/presentation/services/analytics/posthog";
import { PostHogEvent } from "@/presentation/types/posthog";
import { Eye, EyeClosed, NavArrowRight } from "iconoir-react";
import { useTitle } from "@/presentation/contexts/TitleProvider";
interface FormItem {
    description: string;
    price: string;
    qty: string;
    amount: string;
}
interface FormData {
    name: string;
    companyName: string;
    email: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    taxId: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    currency: Currency;
    clientId: string;
    billToCompanyName: string;
    billToContactName: string;
    billToEmail: string;
    billToAddress: string;
    billToCcEmails: string[];
    billToTaxId: string;
    token: TokenDto | null;
    network: NetworkDto | null;
    walletAddress: string;
    items: FormItem[];
    taxRate: string;
    discount: string;
    note: string;
    emailSubject: string;
    emailBody: string;
    emailBcc: string[];
    paymentCollectionType: "one-time" | "recurring";
    recurringInterval: string;
    recurringStartDate: string;
    paymentMethodId: string;
}
const SectionTitle = ({ children, subtitle }: {
    children: React.ReactNode;
    subtitle?: string;
}) => (<div className="flex flex-col gap-0.5">
    <h2 className="text-lg font-semibold text-text-primary">{children}</h2>
    {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
  </div>);
const SectionDivider = () => <div className="h-px w-full bg-primary-divider"/>;
const CreateClientInvoice = () => {
    const { openModal } = useModal();
    const router = useRouter();
    const { setTitle, setShowBackArrow, setOnBackClick } = useTitle();
    const { user } = useAuth();
    const { data: demoData } = useDemo();
    const invoiceSettings = demoData?.invoiceSettings;
    const { data: myCompany } = useGetMyCompany();
    const { data: multisigAccounts, isLoading: accountsLoading } = useListAccountsByCompany(myCompany?.id, {
        enabled: !!myCompany?.id,
    });
    const [invoiceSent, setInvoiceSent] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [expandFromDetails, setExpandFromDetails] = useState(false);
    const [expandBillToDetails, setExpandBillToDetails] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<{
        icon: string;
        name: string;
        value: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [createdInvoice, setCreatedInvoice] = useState<any>(null);
    const [ccEmailInput, setCcEmailInput] = useState("");
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    useEffect(() => {
        if (user && !isAdmin) {
            openModal<PermissionRequiredModalProps>(MODAL_IDS.PERMISSION_REQUIRED, {
                role: user?.teamMembership?.role,
                onConfirm: () => router.push("/"),
            });
        }
    }, [user, isAdmin]);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/invoice")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Invoice
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Create</span>
      </div>);
        setShowBackArrow(false);
        setOnBackClick(undefined);
    }, []);
    const { register, watch, setValue, formState: { errors } } = useForm<FormData>({
        mode: "onBlur",
        defaultValues: {
            name: "", email: "", companyName: "", address: "", city: "", state: "", country: "", postalCode: "", taxId: "",
            invoiceNumber: "", issueDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            currency: Currency.USD,
            clientId: "", billToCompanyName: "", billToContactName: "", billToEmail: "", billToAddress: "", billToCcEmails: [], billToTaxId: "",
            token: { address: "", symbol: "USDC", decimals: 6, name: "USDC" },
            network: { name: "Arc Testnet", chainId: 1 },
            walletAddress: "",
            items: [
                { description: "Smart contract development", price: "8000", qty: "1", amount: "8000" },
                { description: "Security audit", price: "3500", qty: "1", amount: "3500" },
            ],
            taxRate: "0", discount: "0", note: "",
            emailSubject: "", emailBody: "", emailBcc: [],
            paymentCollectionType: "one-time", recurringInterval: "MONTHLY", recurringStartDate: "",
            paymentMethodId: "payroll",
        },
    });
    const formData = watch();
    useEffect(() => {
        if (multisigAccounts && multisigAccounts.length > 0) {
            const first = multisigAccounts[0];
            setValue("paymentMethodId", first.accountId);
            setValue("walletAddress", first.accountId);
        }
    }, [multisigAccounts]);
    useEffect(() => {
        if (invoiceSettings) {
            const num = String(invoiceSettings.nextInvoiceNumber).padStart(4, "0");
            setValue("invoiceNumber", `${invoiceSettings.invoicePrefix}${num}`);
            if (invoiceSettings.defaultNote)
                setValue("note", invoiceSettings.defaultNote);
        }
    }, [invoiceSettings]);
    useEffect(() => {
        if (myCompany) {
            const address = [myCompany.address1, myCompany.address2, myCompany.city, myCompany.postalCode].filter(Boolean).join(", ");
            setValue("companyName", myCompany.companyName);
            setValue("address", address);
        }
    }, [myCompany]);
    useEffect(() => {
        if (user) {
            const first = (user as AuthMeResponse["user"])?.teamMembership?.firstName ?? "";
            const last = (user as AuthMeResponse["user"])?.teamMembership?.lastName ?? "";
            const fullName = [first, last].filter(Boolean).join(" ");
            const email = (user as AuthMeResponse["user"])?.email ?? "";
            if (fullName)
                setValue("name", fullName);
            if (email)
                setValue("email", email);
        }
    }, [user]);
    const { subtotal, taxAmount, total } = useMemo(() => {
        const subtotal = formData.items.reduce((sum, item) => {
            return sum + (parseFloat(item.price) || 0) * (parseInt(item.qty) || 0);
        }, 0);
        const taxRate = parseFloat(formData.taxRate) || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const discount = parseFloat(formData.discount) || 0;
        return { subtotal, taxAmount, total: subtotal + taxAmount - discount };
    }, [formData.items, formData.taxRate, formData.discount]);
    const buildCreateInvoiceDto = (): CreateB2BInvoiceDto => {
        const items: InvoiceItemDto[] = formData.items.map((item, index) => ({
            description: item.description,
            quantity: item.qty,
            unitPrice: item.price,
            total: item.amount || String(parseFloat(item.price) * parseInt(item.qty)),
            order: index,
        }));
        const fromDetails: B2BFromDetailsDto = {
            companyName: formData.companyName, contactName: formData.name, email: formData.email,
            address1: formData.address, city: formData.city, state: formData.state,
            country: formData.country, postalCode: formData.postalCode, taxId: formData.taxId,
        };
        const unregisteredCompany: UnregisteredCompanyDto | undefined = formData.clientId
            ? undefined
            : {
                companyName: formData.billToCompanyName, email: formData.billToEmail,
                ccEmails: formData.billToCcEmails.filter(Boolean), contactName: formData.billToContactName,
                address: formData.billToAddress, taxId: formData.billToTaxId,
            };
        return {
            clientId: formData.clientId || undefined, unregisteredCompany,
            issueDate: formData.issueDate || new Date().toISOString(), dueDate: formData.dueDate,
            currency: formData.currency, items, network: formData.network!, token: formData.token!,
            walletAddress: formData.walletAddress, fromDetails,
            emailSubject: formData.emailSubject || undefined, emailBody: formData.emailBody || undefined,
            emailBcc: formData.emailBcc.filter(Boolean),
            taxRate: formData.taxRate, discount: formData.discount,
            memo: formData.note ? { text: formData.note } : undefined,
        };
    };
    const handleClientSelect = (client: ClientResponseDto) => {
        setValue("clientId", client.uuid);
        setValue("billToCompanyName", client.companyName);
        setValue("billToEmail", client.email);
        setValue("billToContactName", "");
        setValue("billToAddress", [client.address1, client.address2, client.city, client.state, client.postalCode, client.country].filter(Boolean).join(", "));
        setValue("billToTaxId", client.taxId || "");
    };
    const handleTokenSelect = (token: AssetWithMetadata | null) => {
        if (!token)
            return;
        setValue("token", { address: token.faucetId, symbol: token.metadata.symbol, decimals: token.metadata.decimals, name: token.metadata.symbol });
    };
    const handleNetworkSelect = (network: {
        icon: string;
        name: string;
        value: string;
    }) => {
        setSelectedNetwork(network);
        setValue("network", { name: network.name, chainId: 1 });
    };
    const handleMultisigAccountSelect = (accountId: string) => {
        setValue("paymentMethodId", accountId);
        setValue("walletAddress", accountId);
    };
    const handleAddItem = () => {
        setValue("items", [...formData.items, { description: "", price: "", qty: "1", amount: "0" }]);
    };
    const handleItemChange = (index: number, field: keyof FormItem, value: string) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index] };
        item[field] = value;
        if (field === "price" || field === "qty") {
            item.amount = String((parseFloat(item.price) || 0) * (parseInt(item.qty) || 0));
        }
        newItems[index] = item;
        setValue("items", newItems);
    };
    const handleRemoveItem = (index: number) => {
        setValue("items", formData.items.filter((_, i) => i !== index));
    };
    const handleReorderItems = (from: number, to: number) => {
        if (from === to || from < 0 || to < 0)
            return;
        const next = [...formData.items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setValue("items", next);
    };
    const handleAddCcEmail = () => {
        const email = ccEmailInput.trim();
        if (!email)
            return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error("Please enter a valid email");
            return;
        }
        if (formData.billToCcEmails.includes(email)) {
            toast.error("Email already added");
            return;
        }
        setValue("billToCcEmails", [...formData.billToCcEmails, email]);
        setCcEmailInput("");
    };
    const handleSendInvoice = async () => {
        if (!formData.billToCompanyName && !formData.billToEmail) {
            toast.error("Please select a client or enter recipient info");
            return;
        }
        if (formData.items.length === 0) {
            toast.error("Please add at least one item");
            return;
        }
        if (!formData.walletAddress) {
            toast.error("Please select a receiving account");
            return;
        }
        setIsLoading(true);
        try {
            let invoice = createdInvoice;
            if (!invoice) {
                const dto = buildCreateInvoiceDto();
                invoice = await createB2BInvoice(dto);
                setCreatedInvoice(invoice);
            }
            if (!invoice?.uuid)
                throw new Error("Failed to create invoice");
            await sendB2BInvoice(invoice.uuid);
            const publicInvoice = {
                uuid: invoice.uuid,
                invoiceNumber: invoice.invoiceNumber || formData.invoiceNumber,
                status: "SENT",
                issueDate: formData.issueDate,
                dueDate: formData.dueDate,
                currency: formData.currency,
                total: total,
                subtotal: subtotal,
                fromDetails: { companyName: formData.companyName, contactName: formData.name, email: formData.email, address1: formData.address },
                toDetails: { companyName: formData.billToCompanyName, contactName: formData.billToContactName, email: formData.billToEmail, address: formData.billToAddress },
                toCompanyName: formData.billToCompanyName,
                toCompanyEmail: formData.billToEmail,
                items: formData.items.map((item, i) => ({ description: item.description, quantity: item.qty, unitPrice: item.price, total: item.amount, order: i })),
                paymentToken: { name: formData.token?.symbol || "USDC", symbol: formData.token?.symbol || "USDC" },
                paymentNetwork: { name: formData.network?.name || "Arc Testnet" },
                paymentWalletAddress: formData.walletAddress,
                memo: formData.note ? { text: formData.note } : null,
            };
            setInvoiceSent(true);
            trackEvent(PostHogEvent.INVOICE_CREATED);
            toast.success("Invoice issued. Share its payment link to collect USDC.");
        }
        catch (err: any) {
            const msg = err.response?.data?.message || err.message || "Failed to send invoice";
            toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleDownloadInvoice = async () => {
        try {
            let invoice = createdInvoice;
            if (!invoice?.uuid) {
                invoice = await createB2BInvoice(buildCreateInvoiceDto());
                setCreatedInvoice(invoice);
            }
            if (!invoice?.uuid)
                throw new Error("Could not prepare invoice");
            const blob = await downloadB2BInvoicePdf(invoice.uuid);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `invoice-${invoice.invoiceNumber || formData.invoiceNumber || invoice.uuid}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Invoice downloaded");
        }
        catch (err: any) {
            toast.error(err?.message || "Failed to download invoice");
        }
    };
    const handleSaveDraft = async () => {
        if (formData.items.length === 0) {
            toast.error("Please add at least one item");
            return;
        }
        setIsLoading(true);
        try {
            let invoice = createdInvoice;
            if (!invoice) {
                const dto = buildCreateInvoiceDto();
                invoice = await createB2BInvoice(dto);
                setCreatedInvoice(invoice);
            }
            toast.success("Saved as draft");
            router.push("/invoice");
        }
        catch (err: any) {
            toast.error(err?.message || "Failed to save draft");
        }
        finally {
            setIsLoading(false);
        }
    };
    const formatDate = (dateStr: string) => {
        if (!dateStr)
            return "";
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime()))
            return dateStr;
        return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    };
    if (user && !isAdmin)
        return null;
    if (invoiceSent) {
        return (<div className="flex flex-col gap-5 items-center justify-center w-full h-full">
        <img src="/modal/green-circle-check.gif" alt="success" className="w-16 h-16"/>
        <h1 className="text-4xl font-semibold text-center">Invoice issued successfully</h1>
        <p className="text-base font-medium text-text-secondary text-center">
          Invoice of <span className="font-bold text-text-primary">{total} {formData.token?.symbol || "USDC"}</span>
          {" is ready. Share its payment link with "}<span className="text-primary-blue">{formData.billToEmail}</span>
        </p>
        <div className="flex gap-4 items-center">
          <SecondaryButton text="View Invoice" variant="light" buttonClassName="w-[130px]" icon="/misc/eye-icon.svg" iconPosition="left" onClick={() => {
                openModal<InvoiceModalProps>("INVOICE_MODAL", {
                    invoice: {
                        amountDue: total.toString(),
                        billTo: { name: formData.billToContactName || "", company: formData.billToCompanyName || "", address: formData.billToAddress || "", email: formData.billToEmail || "" },
                        paymentToken: { name: n(formData.token?.symbol) || "USDC" },
                        currency: formData.currency || "USD",
                        date: formData.issueDate, dueDate: formData.dueDate,
                        from: { name: formData.name || "", address: formData.address || "", email: formData.email || "", company: formData.companyName || "" },
                        invoiceNumber: createdInvoice?.invoiceNumber || formData.invoiceNumber || "",
                        items: formData.items.map(item => ({ name: item.description, rate: parseFloat(item.price) || 0, qty: parseFloat(item.qty) || 0, amount: parseFloat(item.amount) || 0 })),
                        subtotal, tax: 0, total,
                        walletAddress: formData.walletAddress || "", network: "Arc Testnet",
                    },
                });
            }}/>
          <PrimaryButton text="Copy Link" icon="/misc/thin-copy-icon.svg" iconPosition="left" containerClassName="w-36" onClick={async () => {
                const invoiceUrl = `${window.location.origin}/invoice-review/b2b?uuid=${createdInvoice?.uuid}`;
                try {
                    await navigator.clipboard.writeText(invoiceUrl);
                    toast.success("Invoice link copied!");
                }
                catch {
                    toast.error("Failed to copy link");
                }
            }}/>
        </div>

        <button onClick={() => router.push("/invoice")} className="flex gap-2 items-center text-primary-blue font-medium text-sm hover:opacity-80 transition-opacity cursor-pointer">
          Go to Invoices
        </button>
      </div>);
    }
    return (<div className="flex w-full h-full flex-col bg-background">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Create invoice</h1>
          <p className="text-[14px] text-text-secondary">Generate and send a new invoice.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <button type="button" onClick={() => setShowPreview(p => !p)} className="flex items-center gap-2 rounded-xl border border-primary-divider bg-background px-3.5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-app-background">
            {showPreview ? <EyeClosed width={16} height={16} strokeWidth={2}/> : <Eye width={16} height={16} strokeWidth={2}/>}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <SecondaryButton text="Cancel" variant="red" onClick={() => openModal(MODAL_IDS.DISCARD_CHANGES, {
            // A confirmed discard must leave the form even if client routing is stalled.
            onConfirm: () => window.location.assign("/invoice"),
          })} buttonClassName="w-fit" disabled={isLoading}/>
          <SecondaryButton text="Save as Draft" variant="light" onClick={handleSaveDraft} buttonClassName="w-fit whitespace-nowrap" disabled={isLoading}/>
          <PrimaryButton text={isLoading ? "Sending..." : "Send Invoice"} onClick={handleSendInvoice} containerClassName="w-fit" buttonClassName="whitespace-nowrap" disabled={isLoading}/>
        </div>
      </div>

      
      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden px-6 pb-6">
        
        <div className={`flex flex-col overflow-y-auto pb-4 ${showPreview ? "flex-1" : "mx-auto w-full max-w-[860px]"}`}>
          <div className="flex flex-col gap-6 rounded-2xl border border-primary-divider bg-background p-6">

        
        <div className="flex flex-col gap-3">
          <SectionTitle subtitle="Who is sending this invoice.">Your Information</SectionTitle>
          <div className="flex gap-3">
            <FieldInput label="Name" placeholder="Your name" {...register("name")} containerClassName="flex-1"/>
            <FieldInput label="Email" placeholder="your@email.com" type="email" {...register("email")} containerClassName="flex-1"/>
          </div>
          <FieldInput label="Company name" placeholder="Company name" {...register("companyName")}/>
          <button onClick={() => setExpandFromDetails(!expandFromDetails)} className="flex gap-1 items-center text-text-secondary cursor-pointer w-fit text-sm">
            <span>Additional details</span>
            <img src="/arrow/chevron-down.svg" alt="" className={`w-4 h-4 transition-transform ${expandFromDetails ? "rotate-180" : ""}`}/>
          </button>
          {expandFromDetails && <FieldInput label="Address" placeholder="Enter address" {...register("address")}/>}
        </div>

        <SectionDivider />

        
        <div className="flex flex-col gap-3">
          <SectionTitle subtitle="Who is receiving this invoice.">Bill To</SectionTitle>
          <div className="flex gap-3">
            <FieldInput label="Name" placeholder="Client name" {...register("billToContactName")} containerClassName="flex-1"/>
            <FieldInput label="Email" placeholder="client@email.com" type="email" {...register("billToEmail")} containerClassName="flex-1"/>
          </div>
          <InputOutlined label="Company name" placeholder="Select client" value={formData.billToCompanyName} onChange={() => { }} readOnly icon="/misc/address-book-icon.svg" iconOnClick={() => openModal("SELECT_CLIENT", { onSave: handleClientSelect })}/>
          <button onClick={() => setExpandBillToDetails(!expandBillToDetails)} className="flex gap-1 items-center text-text-secondary cursor-pointer w-fit text-sm">
            <span>Additional details</span>
            <img src="/arrow/chevron-down.svg" alt="" className={`w-4 h-4 transition-transform ${expandBillToDetails ? "rotate-180" : ""}`}/>
          </button>
          {expandBillToDetails && <FieldInput label="Address" placeholder="Enter address" {...register("billToAddress")}/>}
        </div>

        <SectionDivider />

        
        <div className="flex flex-col gap-3">
          <SectionTitle>Invoice Details</SectionTitle>
          <div className="flex gap-3">
            <div className="flex-1">
              <FieldInput label="Invoice number" placeholder="Auto-generated" disabled {...register("invoiceNumber")}/>
            </div>
            <div className="flex-1">
              <DueDateDropdown selectedDate={formData.dueDate} onDateSelect={date => setValue("dueDate", date)}/>
            </div>
          </div>
          <div className="flex gap-3">
            <InputOutlined label="Token" placeholder="Select token" value={formData.token?.symbol || ""} onChange={() => { }} readOnly icon="/arrow/chevron-down.svg" iconOnClick={() => openModal("SELECT_TOKEN", { onTokenSelect: handleTokenSelect })} containerClassName="flex-1"/>
            <InputOutlined label="Network" placeholder="Select network" value={formData.network?.name || ""} onChange={() => { }} readOnly icon="/arrow/chevron-down.svg" iconOnClick={() => openModal("SELECT_NETWORK", { onNetworkSelect: handleNetworkSelect })} containerClassName="flex-1"/>
          </div>
        </div>

        <SectionDivider />

        
        <div className="flex flex-col gap-3">
          <SectionTitle subtitle="Enter product details.">Product Details</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-primary-divider">
            
            <div className="grid grid-cols-[22px_1fr_64px_112px_112px_32px] items-center gap-2 bg-app-background px-3 py-2.5 text-xs font-medium text-text-secondary">
              <span />
              <span>Item</span>
              <span className="text-center">QTY</span>
              <span>Cost</span>
              <span>Total</span>
              <span />
            </div>
            
            {formData.items.map((item, index) => (<div key={index} onDragOver={e => {
                if (dragIndex !== null) {
                    e.preventDefault();
                    setDragOverIndex(index);
                }
            }} onDrop={e => {
                e.preventDefault();
                if (dragIndex !== null)
                    handleReorderItems(dragIndex, index);
                setDragIndex(null);
                setDragOverIndex(null);
            }} className={`grid grid-cols-[22px_1fr_64px_112px_112px_32px] items-center gap-2 border-t border-primary-divider px-3 py-2 transition-colors ${dragIndex === index ? "opacity-40" : dragOverIndex === index && dragIndex !== null ? "bg-app-background" : ""}`}>
                <span draggable onDragStart={e => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
            }} onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
            }} className="cursor-grab select-none text-base leading-none text-text-secondary/40 transition-colors hover:text-text-secondary active:cursor-grabbing" title="Drag to reorder">
                  ⋮⋮
                </span>
                <input placeholder="Item name" value={item.description} onChange={e => handleItemChange(index, "description", e.target.value)} className="w-full rounded-lg border border-primary-divider bg-background px-2.5 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-primary-blue"/>
                <input type="number" placeholder="1" value={item.qty} onChange={e => handleItemChange(index, "qty", e.target.value)} className="num w-full rounded-lg border border-primary-divider bg-background px-2 py-1.5 text-center text-sm text-text-primary outline-none transition-colors focus:border-primary-blue"/>
                <input type="number" placeholder="0.00" value={item.price} onChange={e => handleItemChange(index, "price", e.target.value)} className="num w-full rounded-lg border border-primary-divider bg-background px-2.5 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-primary-blue"/>
                <input readOnly value={item.amount} className="num w-full rounded-lg border border-primary-divider bg-app-background px-2.5 py-1.5 text-sm text-text-secondary outline-none"/>
                <button onClick={() => handleRemoveItem(index)} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-app-background hover:text-red-500" title="Remove">
                  <span className="text-base leading-none">&minus;</span>
                </button>
              </div>))}
          </div>
          <button onClick={handleAddItem} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary-divider py-2.5 text-sm text-text-secondary transition-colors hover:bg-app-background">
            <img src="/misc/circle-plus-icon.svg" alt="add" className="w-4 h-4"/>
            Add item
          </button>
        </div>

        <SectionDivider />

        
        <div className="flex flex-col gap-3">
          <SectionTitle>Receive Payment To</SectionTitle>
          <div className="flex flex-col gap-2">
            {accountsLoading ? (<div className="w-full py-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border border-primary-divider border-t-primary-blue"/>
              </div>) : !multisigAccounts || multisigAccounts.length === 0 ? (<p className="text-sm text-text-secondary">No accounts found. Create a multisig account first.</p>) : (multisigAccounts.map(account => (<button key={account.accountId} onClick={() => handleMultisigAccountSelect(account.accountId)} className={`w-full flex gap-3 items-center px-4 py-3 rounded-xl border transition-all cursor-pointer ${formData.paymentMethodId === account.accountId ? "border-primary-blue bg-blue-50/50" : "border-primary-divider"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${formData.paymentMethodId === account.accountId ? "bg-primary-blue" : "border-2 border-primary-divider"}`}>
                    {formData.paymentMethodId === account.accountId && <div className="w-2 h-2 bg-white rounded-full"/>}
                  </div>
                  <img src="/client-invoice/payroll-icon.svg" alt="" className="w-7"/>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-xs text-text-secondary font-mono truncate">{account.accountId}</p>
                  </div>
                </button>)))}
          </div>
        </div>

        <SectionDivider />

        
        <div className="flex flex-col gap-2">
          <SectionTitle>Note</SectionTitle>
          <FieldTextarea placeholder="Add a note (optional)" {...register("note")} rows={3}/>
        </div>

        
        <div className="flex flex-col gap-2">
          <SectionTitle>CC Recipients (optional)</SectionTitle>
          <label className="flex w-full cursor-text flex-wrap items-center gap-2 rounded-lg border border-primary-divider px-3 py-2.5 transition-colors focus-within:border-primary-blue">
            {formData.billToCcEmails.map((email, index) => (<span key={index} className="flex items-center gap-1.5 rounded-md bg-app-background px-2.5 py-1 text-sm text-text-primary">
                {email}
                <button type="button" onClick={() => setValue("billToCcEmails", formData.billToCcEmails.filter((_, i) => i !== index))} className="leading-none text-text-secondary transition-colors hover:text-red-500" aria-label={`Remove ${email}`}>
                  &times;
                </button>
              </span>))}
            <input type="email" placeholder={formData.billToCcEmails.length ? "Add another email" : "Add CC email"} value={ccEmailInput} onChange={e => setCcEmailInput(e.target.value)} onKeyDown={e => {
            if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                handleAddCcEmail();
            }
            else if (e.key === "Backspace" && !ccEmailInput && formData.billToCcEmails.length) {
                setValue("billToCcEmails", formData.billToCcEmails.slice(0, -1));
            }
        }} onBlur={() => {
            if (ccEmailInput.trim())
                handleAddCcEmail();
        }} className="min-w-[160px] flex-1 bg-transparent py-0.5 text-sm text-text-primary outline-none placeholder:text-text-secondary"/>
          </label>
        </div>
        </div>
      </div>

      
      {showPreview && (<div className="w-[42%] shrink-0 overflow-y-auto" style={{ ["--invoice-accent" as any]: invoiceSettings?.accentColor || "#194BFA" }}>
      <InvoicePreview logo={invoiceSettings?.logo} invoiceNumber={createdInvoice?.invoiceNumber || formData.invoiceNumber || ""} date={createdInvoice?.issueDate || formData.issueDate || ""} dueDate={createdInvoice?.dueDate || formData.dueDate || ""} from={{
                name: formData.name || "", email: formData.email || "", company: formData.companyName || "",
                address: formData.address || "", token: formData.token?.symbol || "",
                network: formData.network?.name || "", walletAddress: formData.walletAddress || "",
            }} billTo={{
                name: formData.billToContactName || "", company: formData.billToCompanyName || "",
                email: formData.billToEmail || "", address: formData.billToAddress || "",
            }} items={formData.items.map(item => ({
                description: item.description, qty: parseInt(item.qty) || 0,
                price: parseFloat(item.price) || 0, amount: parseFloat(item.amount) || 0,
                currency: formData.currency || "USD",
            }))} note={formData.note || ""} subtotal={subtotal} total={total} amountDue={total} currency={formData.currency || "USD"} status={createdInvoice?.status || "DRAFT"} onDownload={handleDownloadInvoice}/>
      </div>)}
      </div>
    </div>);
};
export default CreateClientInvoice;
