"use client";
import LiveTransactionDetails from "./LiveTransactionDetails";
import { n } from "@/presentation/services/utils/normalizeToken";
import { useGetProposal, useCancelProposal, useSignProposal, useSubmitRejection, useGetMultisigAccount, useGetConsumableNotes, } from "@/presentation/services/api/multisig";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Badge, BadgeStatus } from "../Common/Badge";
import { SecondaryButton } from "../Common/SecondaryButton";
import BaseModal from "../Modal/BaseModal";
import { ModalHeader } from "../Common/ModalHeader";
import toast from "react-hot-toast";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { ApproveVote, ConfirmVote, FinalVoteApproved, FinalVoteRejected, RejectVote } from "./Vote";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
import { getFaucetMetadata } from "@/presentation/services/utils/arc-token";
import { formatUnits } from "viem";
import { formatAddress } from "@/presentation/services/utils/address";
import { usePSMProvider } from "@/presentation/contexts/PSMProvider";
import { CategoryBadge } from "../ContactBook/ContactBookContainer";
import { CategoryShapeEnum } from "@/presentation/types/enums";
import { getInvoiceByUUID } from "@/presentation/services/api/invoice";
import { InvoiceModalProps } from "@/presentation/types/modal";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { Check, NavArrowRight } from "iconoir-react";
const TransactionDetailContainer = ({ proposalId: proposalIdProp, inModal = false, }: {
    proposalId?: number | string;
    inModal?: boolean;
} = {}) => {
    const router = useRouter();
    const { openModal, closeModal } = useModal();
    const { setTitle, setShowBackArrow } = useTitle();
    const searchParams = useSearchParams();
    const rawProposalId = proposalIdProp != null ? String(proposalIdProp) : searchParams.get("proposalId") || "";
    const proposalId = parseInt(rawProposalId, 10);
    const { address: signerAddress } = useArcWallet();
    const { client: arcClient } = useArcPayment();
    const { accountCacheMap } = usePSMProvider();
    const { data: proposal, isLoading, refetch: refetchProposal } = useGetProposal(rawProposalId);
    const [receiptPreview, setReceiptPreview] = useState<any>(null);
    const { data: multisigAccount } = useGetMultisigAccount(proposal?.accountId, { enabled: !!proposal?.accountId });
    useEffect(() => {
        if (inModal)
            return;
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/transactions")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Transactions
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Detail</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    const signProposalMutation = useSignProposal();
    const cancelProposalMutation = useCancelProposal();
    const { mutate: submitRejection, isPending: isRejectionPending } = useSubmitRejection();
    const { data: consumableNotesData = { notes: [] }, } = useGetConsumableNotes(multisigAccount?.accountId || "", {
        enabled: !!multisigAccount?.accountId,
    });
    console.log("\uD83D\uDE80 ~ TransactionDetailContainer ~ consumableNotesData:", consumableNotesData);
    const handleCancelProposal = async () => {
        if (!proposal)
            return;
        try {
            await cancelProposalMutation.mutateAsync({ proposalUuid: proposal.uuid });
            toast.success("Proposal cancelled successfully");
            router.replace("/bill");
        }
        catch (err) {
            console.error("Failed to cancel proposal:", err);
            toast.error("Failed to cancel proposal");
        }
    };
    const handleApproveProposal = async () => {
        if (!proposal || !multisigAccount)
            return;
        try {
            openModal("PROCESSING_TRANSACTION");
            await signProposalMutation.mutateAsync({
                proposal,
                accountPublicKeys: multisigAccount.publicKeys,
            });
            closeModal("PROCESSING_TRANSACTION");
            toast.success("Payment approval submitted");
            refetchProposal();
        }
        catch (error) {
            closeModal("PROCESSING_TRANSACTION");
            console.error("Failed to approve proposal:", error);
            toast.error("Failed to approve proposal");
        }
    };
    const handleRejectProposal = () => {
        if (!proposal)
            return;
        submitRejection({
            proposalId,
            data: {
                reason: "Reject Proposal",
            },
        }, {
            onSuccess: () => {
                toast.success("Proposal rejected successfully");
                refetchProposal();
            },
            onError: err => {
                console.error("Failed to reject proposal:", err);
                toast.error("Failed to reject proposal");
            },
        });
    };
    const handleViewInvoice = async (invoiceUuid: string) => {
        try {
            const invoice = await getInvoiceByUUID(invoiceUuid);
            if (!invoice) {
                toast.error("Invoice not found");
                return;
            }
            openModal<InvoiceModalProps>("INVOICE_MODAL", {
                invoice: {
                    amountDue: String(invoice.total!),
                    billTo: {
                        address: [
                            invoice.toDetails?.address1,
                            invoice.toDetails?.address2,
                            invoice.toDetails?.city,
                            invoice.toDetails?.country,
                        ]
                            .filter(Boolean)
                            .join(", "),
                        email: invoice.toCompany?.email,
                        name: invoice.toCompany?.companyName,
                        company: [invoice.toCompany?.companyName, invoice.toCompany?.companyType].filter(Boolean).join(" "),
                    },
                    paymentToken: {
                        name: n(invoice.paymentToken?.name) || "USDC",
                    },
                    currency: invoice.currency || "USD",
                    date: invoice.issueDate!,
                    dueDate: invoice.dueDate!,
                    from: {
                        name: invoice.fromDetails?.name!,
                        address: invoice.fromDetails?.address!,
                        email: invoice.fromDetails?.email!,
                        company: `${invoice.fromCompany?.companyName || invoice.payroll?.company?.companyName}`,
                    },
                    invoiceNumber: invoice.invoiceNumber!,
                    items: invoice.items?.map((item: any) => ({
                        name: item.description,
                        rate: item.unitPrice,
                        qty: item.quantity,
                        amount: item.total,
                    })) || [],
                    subtotal: parseFloat(invoice.subtotal?.toString() || "0"),
                    tax: 0,
                    total: parseFloat(invoice.total?.toString() || "0"),
                    walletAddress: invoice.paymentWalletAddress!,
                    network: "Arc Testnet",
                },
            });
        }
        catch {
            toast.error("Failed to load invoice");
        }
    };
    const formatDate = (dateString?: string | Date) => {
        if (!dateString)
            return "N/A";
        const date = typeof dateString === "string" ? new Date(dateString) : dateString;
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };
    const formatDateTime = (dateString?: string | Date) => {
        if (!dateString)
            return "N/A";
        const date = typeof dateString === "string" ? new Date(dateString) : dateString;
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };
    const getStatusBadge = (status?: string) => {
        switch (status) {
            case "EXECUTED":
                return { text: "PAID", status: BadgeStatus.SUCCESS };
            case "FAILED":
            case "CANCELLED":
            case "REJECTED":
                return { text: status, status: BadgeStatus.FAIL };
            case "READY":
                return { text: "READY TO EXECUTE", status: BadgeStatus.AWAITING };
            case "PENDING":
            default:
                return { text: "PENDING", status: BadgeStatus.AWAITING };
        }
    };
    const approvers = proposal?.approvers || [];
    const approvedMembers = approvers.filter((a: any) => a.signed);
    const pendingMembers = approvers.filter((a: any) => !a.signed);
    const hasUserApproved = signerAddress &&
        approvers.some((approver: any) => {
            const normalizedCommitment = signerAddress.toLowerCase().replace(/^0x/, "");
            const normalizedApproverKey = (approver.publicKey || "").toLowerCase().replace(/^0x/, "");
            return normalizedApproverKey === normalizedCommitment && approver.signed === true;
        });
    const hasUserRejected = signerAddress &&
        proposal?.rejections &&
        proposal.rejections.length > 0 &&
        approvers.some((approver: any) => {
            const normalizedCommitment = signerAddress.toLowerCase().replace(/^0x/, "");
            const normalizedApproverKey = (approver.publicKey || "").toLowerCase().replace(/^0x/, "");
            return (normalizedApproverKey === normalizedCommitment &&
                proposal.rejections?.some((rejection: any) => rejection.approverIndex === approver.id));
        });
    const getNoteTokenInfo = (noteId: string): {
        symbol: string;
        amount: string;
        faucetId: string;
    } | null => {
        const consumableNote = consumableNotesData.notes.find((note: any) => note.note_id.toLowerCase() === noteId.toLowerCase());
        if (!consumableNote || !consumableNote.assets || consumableNote.assets.length === 0)
            return null;
        const asset = consumableNote.assets[0];
        const decimals = asset.decimals ?? 8;
        const symbol = asset.symbol || formatAddress(asset.faucet_bech32 || asset.faucet_id);
        try {
            const formatted = formatUnits(BigInt(asset.amount), decimals);
            return { symbol, amount: formatted, faucetId: asset.faucet_id };
        }
        catch {
            return { symbol, amount: String(asset.amount), faucetId: asset.faucet_id };
        }
    };
    const renderVoteComponent = () => {
        if (!proposal)
            return null;
        const { status } = proposal;
        if (status === "PENDING" && !hasUserApproved && !hasUserRejected) {
            console.log("Rendering: ConfirmVote");
            return (<ConfirmVote onApprove={handleApproveProposal} onDeny={handleRejectProposal} isLoading={signProposalMutation.isPending || isRejectionPending}/>);
        }
        if (status === "PENDING" && hasUserApproved) {
            console.log("Rendering: ApproveVote");
            return <ApproveVote />;
        }
        if (status === "PENDING" && hasUserRejected) {
            console.log("Rendering: RejectVote");
            return <RejectVote />;
        }
        if (status === "READY") {
            console.log("Rendering: ApproveVote (READY status)");
            return <ApproveVote />;
        }
        if (status === "EXECUTED") {
            console.log("Rendering: FinalVoteApproved");
            return <FinalVoteApproved />;
        }
        if (status === "FAILED" || status === "CANCELLED" || status === "REJECTED") {
            console.log("Rendering: FinalVoteRejected");
            return <FinalVoteRejected />;
        }
        return null;
    };
    const token = proposal?.tokens?.[0];
    const sendFaucetId = token?.address || "";
    const [sendFaucetMeta, setSendFaucetMeta] = useState<{
        symbol: string;
        decimals: number;
    } | null>(null);
    const accountKey = proposal?.accountId
        ? (proposal.accountId.toLowerCase().startsWith("0x") ? proposal.accountId.toLowerCase() : `0x${proposal.accountId}`.toLowerCase())
        : "";
    const accountCache = accountKey ? accountCacheMap.get(accountKey) : undefined;
    const enrichedMatch = accountCache?.enrichedBalances.find(eb => eb.faucetId.toLowerCase() === sendFaucetId.toLowerCase());
    useEffect(() => {
        if (!arcClient || !sendFaucetId || enrichedMatch)
            return;
        let cancelled = false;
        getFaucetMetadata(arcClient, sendFaucetId)
            .then(meta => {
            if (!cancelled)
                setSendFaucetMeta(meta);
        })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [arcClient, sendFaucetId, enrichedMatch]);
    const sendTokenSymbol = enrichedMatch?.symbol || sendFaucetMeta?.symbol || token?.symbol || (proposal?.bills?.[0]?.paymentToken as any)?.name || "TOKEN";
    const sendTokenDecimals = token?.decimals ?? enrichedMatch?.decimals ?? sendFaucetMeta?.decimals ?? 0;
    const displayAmount = token?.amount
        ? (() => {
            try {
                return formatUnits(BigInt(token.amount), sendTokenDecimals);
            }
            catch {
                return proposal?.amount || "-";
            }
        })()
        : proposal?.amount || "-";
    if (isLoading) {
        return (<div className="flex items-center justify-center w-full h-full">
        <div className="w-12 h-12 border-4 border-primary-blue border-t-transparent rounded-full animate-spin"/>
      </div>);
    }
    if (!proposal) return <p role="status" className="p-6 text-sm text-text-secondary">Transaction not found. Close this window and refresh the transaction list.</p>;
    if (proposal.businessRecordId) return <LiveTransactionDetails payment={proposal} />;
    const statusBadge = getStatusBadge(proposal.status);
    const pendingCount = pendingMembers.length;
    return (<div className={`flex w-full flex-col bg-background ${inModal ? "" : "h-full"}`}>
      
      {!inModal && (<div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">
              {proposal.description}
            </h1>
            <p className="text-[14px] text-text-secondary">
              Review the transaction details, approvers and progress for this proposal.
            </p>
          </div>
        </div>)}

      <div className={`w-full flex flex-row gap-5 px-6 pb-6 ${inModal ? "pt-6" : "h-full"}`}>
        <div className="flex-1 flex-col w-full h-full gap-2 flex">
          
          <div className="flex flex-row gap-3 w-full">
            
            <div className="flex-1 border border-primary-divider rounded-2xl p-5 flex flex-col gap-4">
              
              <div className="flex gap-4 items-center">
                <p className="text-sm text-text-secondary font-medium w-20">Title</p>
                <p className="text-sm text-text-primary  font-semibold">{proposal.description}</p>
              </div>

              
              <div className="flex gap-4 items-center">
                <p className="text-sm text-text-secondary font-medium w-20">Type</p>
                <div className="flex items-center gap-2">
                  <span className="inline-block bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                    {proposal.proposalType}
                  </span>
                </div>
              </div>

              
              <div className="flex gap-4 items-center">
                <p className="text-sm text-text-secondary font-medium w-20">Create date</p>
                <p className="text-sm text-text-primary  font-semibold">{formatDateTime(proposal.createdAt)}</p>
              </div>

              
              <div className="flex gap-4 items-center">
                <p className="text-sm text-text-secondary font-medium w-20">Status</p>
                <Badge text={statusBadge.text} status={statusBadge.status}/>
              </div>
            </div>

            
            <div className="flex-1 border border-primary-divider rounded-2xl p-5 flex flex-col gap-4">
              
              <div className="flex gap-4 items-center">
                <p className="text-sm text-text-secondary font-medium w-16">Account</p>
                <div className="flex gap-2 items-center flex-row">
                  <img src={multisigAccount?.logo ? multisigAccount.logo : "/client-invoice/payroll-icon.svg"} alt="Multisig Account" className="w-5 h-5 rounded-lg"/>
                  <p className="text-sm text-text-primary leading-none font-semibold">{multisigAccount?.name}</p>
                </div>
              </div>

              
              <div className="flex gap-4 items-center">
                <p className="text-sm text-text-secondary font-medium w-16">Members</p>
                <p className="text-sm text-text-primary leading-none font-semibold">
                  {multisigAccount?.publicKeys?.length}
                </p>
              </div>

              
              <div className="flex gap-4 items-center">
                <p className="text-sm text-text-secondary font-medium w-16">Threshold</p>
                <p className="text-sm text-text-primary leading-none font-semibold">
                  {proposal.signaturesCount || 0}/{multisigAccount?.threshold || 0}
                </p>
              </div>

              
              <div className="flex gap-4 items-center">
                <p className="text-sm text-text-secondary font-medium w-16">Approved</p>
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1 h-1.5 bg-app-background rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{
            width: `${((proposal.signaturesCount || 0) / (multisigAccount?.threshold || 1)) * 100}%`,
        }}/>
                  </div>
                  <p className="text-sm text-text-secondary font-semibold text-right w-12">
                    {proposal.signaturesCount || 0}/{multisigAccount?.threshold || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          
          <div className="border border-primary-divider rounded-2xl overflow-hidden flex flex-col h-fit">
            <div className="flex flex-row justify-between items-center px-4 py-3 border-b border-primary-divider">
              <h2 className="text-lg font-semibold text-text-primary">Transaction Details</h2>
              <div className="flex gap-8 items-center">
                {proposal.bills && proposal.bills.length > 0 && (<>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-text-secondary font-medium">Number of transactions</span>
                      <span className="text-sm text-text-primary font-semibold">{proposal.bills.length}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-text-secondary font-medium">Total amount</span>
                      <span className="text-sm text-text-primary font-semibold">
                        {displayAmount} {sendTokenSymbol.toUpperCase()}
                      </span>
                    </div>
                  </>)}
                {(!proposal.bills || proposal.bills.length === 0) && (<>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-text-secondary font-medium">Type</span>
                      <span className="text-sm text-text-primary font-semibold">{proposal.proposalType}</span>
                    </div>
                    {proposal.proposalType === "SEND" && (<div className="flex gap-2 items-center">
                        <span className="text-sm text-text-secondary font-medium">Amount</span>
                        <span className="text-sm text-text-primary font-semibold">
                          {displayAmount} {sendTokenSymbol.toUpperCase()}
                        </span>
                      </div>)}
                  </>)}
              </div>
            </div>

            
            <div className="overflow-y-auto flex-1">
              {proposal.bills && proposal.bills.length > 0 ? (proposal.bills.map((bill: any, idx: number) => {
            const tokenSymbol = n(bill.paymentToken?.symbol || bill.paymentToken?.name) || sendTokenSymbol;
            return (<div key={bill.uuid} className="grid grid-cols-[1fr_1.5fr_1.5fr_2fr_1.5fr] gap-3 px-4 py-3 border-b border-primary-divider last:border-b-0 items-center">
                      <p className="text-sm text-text-primary font-medium">{bill.invoiceNumber || `TX${String(idx + 1).padStart(3, "0")}`}</p>
                      <p className="text-sm text-text-primary font-medium">{bill.recipientName || "-"}</p>
                      <div className="flex justify-center items-center">
                        {bill.group ? (<CategoryBadge shape={(bill.group.shape as CategoryShapeEnum) || CategoryShapeEnum.CIRCLE} color={bill.group.color || "#35ADE9"} name={bill.group.name || "Employee"}/>) : (<span className="inline-block bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                            {bill.isReimbursement ? "Receipt" : "Employee"}
                          </span>)}
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <p className="text-sm text-text-primary font-semibold">
                          {bill.amount || "-"} {tokenSymbol.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        {bill.isReimbursement && bill.receiptDetails ? (<SecondaryButton text="View Receipt" variant="light" buttonClassName="w-fit whitespace-nowrap" onClick={() => setReceiptPreview(bill.receiptDetails)}/>) : bill.invoiceUuid ? (<SecondaryButton text="View Invoice" variant="light" buttonClassName="w-fit whitespace-nowrap" onClick={() => handleViewInvoice(bill.invoiceUuid)}/>) : (<SecondaryButton text="View Details" variant="light" buttonClassName="w-fit whitespace-nowrap" onClick={() => {
                        const tokenName = n(bill.paymentToken?.symbol || bill.paymentToken?.name) || sendTokenSymbol;
                        openModal<InvoiceModalProps>("INVOICE_MODAL", {
                            invoice: {
                                invoiceNumber: bill.invoiceNumber || `INV-${String(idx + 1).padStart(3, "0")}`,
                                from: {
                                    name: proposal.accountName || proposal.accountId || "",
                                    company: proposal.accountName || "",
                                    address: "",
                                    email: "",
                                },
                                billTo: {
                                    name: bill.recipientName || proposal.to || "",
                                    company: bill.recipientName || "",
                                    address: "",
                                    email: "",
                                },
                                date: proposal.createdAt,
                                dueDate: proposal.createdAt,
                                network: "Arc Testnet",
                                paymentToken: { name: tokenName },
                                currency: tokenName,
                                items: [{
                                        name: proposal.description || bill.recipientName || "Payment",
                                        rate: parseFloat(bill.amount) || 0,
                                        qty: 1,
                                        amount: parseFloat(bill.amount) || 0,
                                    }],
                                subtotal: parseFloat(bill.amount) || 0,
                                tax: 0,
                                total: parseFloat(bill.amount) || 0,
                                walletAddress: proposal.recipientId || "",
                                amountDue: bill.amount || "0",
                            },
                        });
                    }}/>)}
                      </div>
                    </div>);
        })) : (<div className="grid grid-cols-[1fr_1.5fr_1.5fr_2fr] gap-3 px-4 py-3 items-center">
                  <p className="text-sm text-text-primary font-medium">TX001</p>
                  <p className="text-sm text-text-primary font-medium">{proposal.to || proposal.recipientId || "-"}</p>
                  <div>
                    <span className="inline-block bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                      {proposal.proposalType === "CONFIG" ? "Config" : "Transfer"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <p className="text-sm text-text-primary font-semibold">
                      {proposal.proposalType === "CONFIG" ? "N/A" : `${displayAmount} ${sendTokenSymbol.toUpperCase()}`}
                    </p>
                  </div>
                </div>)}
            </div>
          </div>

          
          <div className="border border-primary-divider rounded-2xl overflow-hidden flex flex-col h-fit">
            <div className="flex flex-row justify-between items-center px-4 py-3 border-b border-primary-divider">
              <h2 className="text-lg font-semibold text-text-primary">Approvers</h2>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-text-secondary font-medium">Threshold</span>
                <span className="text-sm text-text-primary font-semibold">
                  {proposal.signaturesCount || 0}/{multisigAccount?.threshold || 0}
                </span>
              </div>
            </div>

            
            <div className="flex gap-5 p-5">
              
              <div className="flex flex-col gap-4 w-48">
                <div className="flex gap-3 items-center">
                  <span className="text-sm text-text-secondary font-medium">Pending</span>
                  <span className="text-sm text-primary-blue font-semibold">{pendingCount}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {pendingMembers.length > 0 ? (pendingMembers.map((m: any, idx: number) => (<p key={idx} className="text-sm text-text-primary font-semibold">
                        {m.firstName || "Approver"} {m.lastName || ""}
                      </p>))) : (<p className="text-sm text-text-secondary">All approvers have signed</p>)}
                </div>
              </div>

              
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex gap-3 items-center">
                  <span className="text-sm text-text-secondary font-medium">Approved</span>
                  <span className="text-sm text-primary-blue font-semibold">{approvedMembers.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {approvedMembers.map((a: any, idx: number) => (<div key={idx} className="flex gap-2 items-center">
                      <p className="text-sm text-text-primary font-semibold">
                        {a.firstName || "Approver"} {a.lastName || ""}
                      </p>
                      <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                        Approved
                      </span>
                    </div>))}
                </div>
              </div>

              
              <div className="flex flex-col gap-4">
                <div className="flex gap-3 items-center">
                  <span className="text-sm text-text-secondary font-medium">Rejected</span>
                  <span className="text-sm text-primary-blue font-semibold">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        
        <div className="w-80 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text-primary">Progress</h2>
          <div className="flex-1 flex flex-col justify-between gap-4 rounded-2xl border border-primary-divider bg-app-background p-5">
            <ol className="flex flex-col">
              {(() => {
            const items = [
                { label: "Proposal created", date: formatDateTime(proposal.createdAt), done: true },
                ...approvedMembers.map((a: any) => ({
                    label: `${a.firstName || "Approver"} signed`,
                    date: formatDateTime(a.signature?.createdAt),
                    done: true,
                })),
                proposal.status === "EXECUTED" &&
                    proposal.transactionId && {
                    label: "Proposal executed",
                    date: formatDateTime(proposal.updatedAt),
                    done: true,
                },
                (proposal.status === "FAILED" || proposal.status === "CANCELLED") && {
                    label: `Proposal ${proposal.status.toLowerCase()}`,
                    date: formatDateTime(proposal.updatedAt),
                    done: true,
                },
                proposal.status === "PENDING" && {
                    label: "Awaiting approval",
                    date: "In progress",
                    done: false,
                    pending: true,
                },
            ].filter((item): item is {
                label: string;
                date: string;
                done: boolean;
                pending?: boolean;
            } => Boolean(item));
            return items.map((item: any, idx: number) => {
                const isLast = idx === items.length - 1;
                const nextPending = items[idx + 1]?.pending;
                return (<li key={idx} className="relative flex gap-3.5 pb-6 last:pb-0">
                      {!isLast && (<span aria-hidden className={`absolute left-[15px] top-9 bottom-0 w-0.5 ${nextPending ? "bg-primary-divider" : "bg-primary-blue/40"}`}/>)}
                      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.done
                        ? "bg-primary-blue text-white" : "border-2 border-primary-blue/40 bg-primary-blue/5"}`}>
                        {item.done ? (<Check width={16} height={16} strokeWidth={2.5}/>) : (<span className="h-2.5 w-2.5 rounded-full bg-primary-blue animate-pulse"/>)}
                      </span>
                      <div className="flex flex-col gap-0.5 pt-1">
                        <p className={`text-sm font-semibold leading-tight ${item.pending ? "text-text-secondary" : "text-text-primary"}`}>
                          {item.label}
                        </p>
                        {item.date && item.date !== "N/A" && (<p className="text-xs text-text-secondary leading-tight">{item.date}</p>)}
                      </div>
                    </li>);
            });
        })()}
            </ol>
            
            {renderVoteComponent()}
          </div>
        </div>
      </div>

      
      {receiptPreview && (<BaseModal isOpen={!!receiptPreview} onClose={() => setReceiptPreview(null)}>
          <ModalHeader title="Receipt Preview" onClose={() => setReceiptPreview(null)} icon="/sidebar/bill.svg"/>
          <div className="flex flex-col w-[480px] p-5 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background gap-4">
            <div className="flex flex-col gap-3">
              {[
                { label: "Employee", value: receiptPreview.employee },
                { label: "Description", value: receiptPreview.description },
                { label: "Amount", value: `$${Number(receiptPreview.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, bold: true },
                { label: "Category", value: receiptPreview.category },
                { label: "Date", value: receiptPreview.date ? new Date(receiptPreview.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A" },
            ].map(({ label, value, bold }) => (<div key={label} className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">{label}</span>
                  <span className={`text-text-primary text-sm ${bold ? "font-bold" : "font-medium"}`}>{value}</span>
                </div>))}
              {receiptPreview.receiptName && (<div className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">Receipt File</span>
                  <div className="flex items-center gap-1.5 bg-app-background rounded-full px-2.5 py-1 border border-primary-divider">
                    <span className="text-primary-blue text-[10px] font-bold">
                      {receiptPreview.receiptName.split(".").pop()?.toUpperCase()}
                    </span>
                    <span className="text-text-primary text-xs font-medium">{receiptPreview.receiptName}</span>
                  </div>
                </div>)}
            </div>
            <SecondaryButton text="Close" onClick={() => setReceiptPreview(null)} variant="light"/>
          </div>
        </BaseModal>)}
    </div>);
};
export default TransactionDetailContainer;
