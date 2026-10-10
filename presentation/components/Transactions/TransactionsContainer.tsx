"use client";
import React, { useState, useEffect, useMemo } from "react";
import { TabContainer } from "../Common/TabContainer";
import { Table } from "../Common/Table";
import { PrimaryButton } from "../Common/PrimaryButton";
import { SecondaryButton } from "../Common/SecondaryButton";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { TransactionFilter } from "./TransactionFilter";
import { ProposalAmountCell } from "./ProposalAmountCell";
import { categoryConfig, statusConfig, formatDate } from "./ProposalRow";
import { isSettlboxToken, getTokenLogo, formatAmount, parseNoteType, getNoteTypeBadgeColor } from "./NoteRow";
import { formatAddress } from "@/presentation/services/utils/address";
import { USDC_TOKEN_SYMBOL, USDC_TOKEN_DECIMALS } from "@/presentation/services/utils/constant";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { useListAccountsByCompany, useListProposalsByCompany, useSignProposal, useExecuteProposal, useCancelProposal, useGetConsumableNotes, useCreateConsumeProposal, } from "@/presentation/services/api/multisig";
import { MultisigProposalStatusEnum, TeamMemberRoleEnum } from "@/presentation/types/enums";
import toast from "react-hot-toast";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { usePSMProvider } from "@/presentation/contexts/PSMProvider";
import { getFaucetMetadata } from "@/presentation/services/utils/arc-token";
import { supportedTokens } from "@/presentation/services/utils/supportedToken";
import { useRouter } from "next/navigation";
import { useAuth } from "@/presentation/services/auth/context";
import { trackEvent } from "@/presentation/services/analytics/posthog";
import { PostHogEvent } from "@/presentation/types/posthog";
import { TimeoutError } from "@/presentation/services/utils/async";
type SubTabType = "pending" | "history" | "receive";
const subTabs: {
    id: SubTabType;
    label: string;
}[] = [
    { id: "pending", label: "Pending Transactions" },
    { id: "history", label: "History" },
    { id: "receive", label: "Receive" },
];
export function TransactionsContainer() {
    const router = useRouter();
    const { setTitle, setShowBackArrow } = useTitle();
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<SubTabType>("pending");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<"sign" | "execute" | "cancel" | null>(null);
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
    const [isCreatingProposal, setIsCreatingProposal] = useState(false);
    const { address: signerAddress } = useArcWallet();
    const { syncWarning } = usePSMProvider();
    const { user } = useAuth();
    const isViewer = user?.teamMembership?.role === TeamMemberRoleEnum.VIEWER;
    const subTabLabel = subTabs.find(t => t.id === activeSubTab)?.label ?? "Pending Transactions";
    useEffect(() => {
        const activeAccountName = multisigAccounts.find((a: any) => a.accountId === activeTab)?.name;
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => setActiveSubTab("pending")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Transactions
        </button>
        {activeAccountName && (<>
            <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
            <span className="text-text-secondary">{activeAccountName}</span>
          </>)}
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">{subTabLabel}</span>
      </div>);
        setShowBackArrow(false);
    }, [activeSubTab, activeTab]);
    const { openModal, closeModal } = useModal();
    const { client: arcClient } = useArcPayment();
    const { data: myCompany } = useGetMyCompany();
    const { data: multisigAccounts = [], isLoading: accountsLoading } = useListAccountsByCompany(myCompany?.id, {
        enabled: !!myCompany?.id,
    });
    useEffect(() => {
        if (multisigAccounts.length > 0 && !activeTab) {
            setActiveTab(multisigAccounts[0].accountId);
            setActiveSubTab("pending");
        }
    }, [multisigAccounts, activeTab]);
    const { data: allProposals = [], isLoading: proposalsLoading, refetch: refetchProposals, } = useListProposalsByCompany(myCompany?.id, {
        enabled: !!myCompany?.id,
    });
    const { data: consumableNotesData = { notes: [] }, isLoading: notesLoading, refetch: refetchNotes, } = useGetConsumableNotes(activeTab || "", {
        enabled: !!activeTab,
    });
    const signProposalMutation = useSignProposal();
    const executeProposalMutation = useExecuteProposal();
    const cancelProposalMutation = useCancelProposal();
    const createConsumeProposalMutation = useCreateConsumeProposal();
    const pendingCountByAccount = useMemo(() => {
        const counts = new Map<string, number>();
        multisigAccounts.forEach(account => {
            const count = allProposals.filter(p => p.accountId === account.accountId &&
                (p.status === MultisigProposalStatusEnum.PENDING || p.status === MultisigProposalStatusEnum.READY)).length;
            counts.set(account.accountId, count);
        });
        return counts;
    }, [allProposals, multisigAccounts]);
    const pendingProposals = useMemo(() => {
        return allProposals
            .filter(p => p.accountId === activeTab)
            .filter(p => p.status === MultisigProposalStatusEnum.PENDING || p.status === MultisigProposalStatusEnum.READY);
    }, [allProposals, activeTab]);
    const historyProposals = useMemo(() => {
        return allProposals
            .filter(p => p.accountId === activeTab)
            .filter(p => p.status === MultisigProposalStatusEnum.EXECUTED ||
            p.status === MultisigProposalStatusEnum.FAILED ||
            p.status === MultisigProposalStatusEnum.CANCELLED);
    }, [allProposals, activeTab]);
    const handleSign = async (proposalId: number) => {
        const proposal = allProposals.find(p => p.id === proposalId);
        if (!proposal) {
            toast.error("Proposal not found");
            return;
        }
        const account = multisigAccounts.find(a => a.accountId === proposal.accountId);
        if (!account) {
            toast.error("Multisig account not found");
            return;
        }
        try {
            setActionLoadingId(proposal.uuid);
            setActionType("sign");
            openModal("PROCESSING_TRANSACTION");
            await signProposalMutation.mutateAsync({
                proposal,
                accountPublicKeys: account.publicKeys,
            });
            closeModal("PROCESSING_TRANSACTION");
            toast.success("Payment approval submitted");
            trackEvent(PostHogEvent.PROPOSAL_SIGNED, { proposalId: String(proposalId) });
            refetchProposals();
        }
        catch (error) {
            closeModal("PROCESSING_TRANSACTION");
            console.error("Failed to sign proposal:", error);
            if (error instanceof TimeoutError) {
                toast.error("Signing timed out after retries. Please try again.");
            }
            else {
                toast.error("Failed to sign proposal");
            }
        }
        finally {
            setActionLoadingId(null);
            setActionType(null);
        }
    };
    const handleExecute = async (proposalId: number) => {
        const proposal = allProposals.find(p => p.id === proposalId);
        if (!proposal) {
            toast.error("Proposal not found");
            return;
        }
        try {
            setActionLoadingId(proposal.uuid);
            setActionType("execute");
            openModal("PROCESSING_TRANSACTION");
            await executeProposalMutation.mutateAsync({ proposalId, proposal });
            closeModal("PROCESSING_TRANSACTION");
            toast.success("Transaction status refreshed");
            trackEvent(PostHogEvent.PROPOSAL_EXECUTED, { proposalId: String(proposalId) });
            refetchProposals();
        }
        catch (error: any) {
            closeModal("PROCESSING_TRANSACTION");
            console.error("Failed to execute proposal:", error);
            const msg = error?.message || "";
            if (error instanceof TimeoutError) {
                toast.error("Execution timed out after retries. Please try again.");
            }
            else if (msg.includes("still being finalized") || msg.includes("non-canonical delta pending")) {
                toast.error("A previous transaction is still being finalized on-chain. Please wait a moment and try again.");
            }
            else if (msg.includes("account state has changed")) {
                toast.error(msg);
            }
            else {
                toast.error("Failed to execute transaction");
            }
        }
        finally {
            setActionLoadingId(null);
            setActionType(null);
        }
    };
    const handleCancel = async (proposalUuid: string) => {
        try {
            setActionLoadingId(proposalUuid);
            setActionType("cancel");
            await cancelProposalMutation.mutateAsync({ proposalUuid });
            toast.success("Proposal cancelled");
            trackEvent(PostHogEvent.PROPOSAL_CANCELLED, { proposalId: proposalUuid });
            refetchProposals();
        }
        catch (error) {
            console.error("Failed to cancel proposal:", error);
            toast.error("Failed to cancel proposal");
        }
        finally {
            setActionLoadingId(null);
            setActionType(null);
        }
    };
    const handleNoteSelection = (noteId: string) => {
        setSelectedNoteIds(prev => (prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]));
    };
    const handleSelectAllNotes = () => {
        if (selectedNoteIds.length === consumableNotesData.notes.length) {
            setSelectedNoteIds([]);
        }
        else {
            setSelectedNoteIds(consumableNotesData.notes.map(note => note.note_id));
        }
    };
    const handleCreateConsumeProposal = async () => {
        if (selectedNoteIds.length === 0) {
            toast.error("Please select at least one note");
            return;
        }
        if (activeTab === null) {
            toast.error("No active multisig account selected");
            return;
        }
        try {
            setIsCreatingProposal(true);
            openModal("PROCESSING_TRANSACTION");
            const selectedNotes = consumableNotesData.notes.filter(n => selectedNoteIds.includes(n.note_id));
            const faucetToAmount = new Map<string, string>();
            selectedNotes.forEach(n => {
                (n.assets || []).forEach((a: any) => {
                    if (a.faucet_id) {
                        const currentAmount = faucetToAmount.get(a.faucet_id) || "0";
                        const newAmount = (BigInt(currentAmount) + BigInt(a.amount || "0")).toString();
                        faucetToAmount.set(a.faucet_id, newAmount);
                    }
                });
            });
            const faucetIds = Array.from(faucetToAmount.keys());
            const tokenPromises = faucetIds.map(async (faucetId) => {
                try {
                    const meta = await getFaucetMetadata(arcClient, faucetId);
                    return {
                        address: faucetId,
                        symbol: meta.symbol,
                        decimals: meta.decimals,
                        name: meta.symbol,
                        amount: faucetToAmount.get(faucetId) || "0",
                    };
                }
                catch (err) {
                    const noteAsset = selectedNotes.flatMap(n => n.assets || []).find((a: any) => a.faucet_id === faucetId);
                    const knownToken = noteAsset?.symbol
                        ? supportedTokens.find(t => t.symbol.toUpperCase() === noteAsset.symbol.toUpperCase())
                        : undefined;
                    return {
                        address: faucetId,
                        symbol: knownToken?.symbol || noteAsset?.symbol || faucetId,
                        decimals: knownToken?.decimals ?? noteAsset?.decimals ?? 0,
                        name: knownToken?.symbol || noteAsset?.symbol || faucetId,
                        amount: faucetToAmount.get(faucetId) || "0",
                    };
                }
            });
            const tokens = await Promise.all(tokenPromises);
            await createConsumeProposalMutation.mutateAsync({
                accountId: activeTab,
                noteIds: selectedNoteIds,
                description: `Consume ${selectedNoteIds.length} note${selectedNoteIds.length !== 1 ? "s" : ""}`,
                tokens,
            });
            closeModal("PROCESSING_TRANSACTION");
            toast.success("Consume proposal created successfully");
            setSelectedNoteIds([]);
            refetchProposals();
            setActiveSubTab("pending");
        }
        catch (error) {
            closeModal("PROCESSING_TRANSACTION");
            console.error("Failed to create consume proposal:", error);
            if (error instanceof TimeoutError) {
                toast.error("Operation timed out after retries. Please try again.");
            }
            else {
                toast.error("Failed to create consume proposal");
            }
        }
        finally {
            setIsCreatingProposal(false);
        }
    };
    const handleClaimNote = async (noteId: string) => {
        if (activeTab === null) {
            toast.error("No active multisig account selected");
            return;
        }
        try {
            setIsCreatingProposal(true);
            openModal("PROCESSING_TRANSACTION");
            const note = consumableNotesData.notes.find(n => n.note_id === noteId);
            const faucetToAmount = new Map<string, string>();
            (note?.assets || []).forEach((a: any) => {
                if (a.faucet_id) {
                    const currentAmount = faucetToAmount.get(a.faucet_id) || "0";
                    const newAmount = (BigInt(currentAmount) + BigInt(a.amount || "0")).toString();
                    faucetToAmount.set(a.faucet_id, newAmount);
                }
            });
            const faucetIds = Array.from(faucetToAmount.keys());
            const tokenPromises = faucetIds.map(async (faucetId) => {
                try {
                    const meta = await getFaucetMetadata(arcClient, faucetId);
                    return {
                        address: faucetId,
                        symbol: meta.symbol,
                        decimals: meta.decimals,
                        name: meta.symbol,
                        amount: faucetToAmount.get(faucetId) || "0",
                    };
                }
                catch (err) {
                    const noteAsset = (note?.assets || []).find((a: any) => a.faucet_id === faucetId);
                    const knownToken = noteAsset?.symbol
                        ? supportedTokens.find(t => t.symbol.toUpperCase() === noteAsset.symbol.toUpperCase())
                        : undefined;
                    return {
                        address: faucetId,
                        symbol: knownToken?.symbol || noteAsset?.symbol || faucetId,
                        decimals: knownToken?.decimals ?? noteAsset?.decimals ?? 0,
                        name: knownToken?.symbol || noteAsset?.symbol || faucetId,
                        amount: faucetToAmount.get(faucetId) || "0",
                    };
                }
            });
            const tokens = await Promise.all(tokenPromises);
            await createConsumeProposalMutation.mutateAsync({
                accountId: activeTab,
                noteIds: [noteId],
                description: "Consume note",
                tokens,
            });
            closeModal("PROCESSING_TRANSACTION");
            toast.success("Consume proposal created successfully");
            setSelectedNoteIds([]);
            refetchProposals();
            setActiveSubTab("pending");
        }
        catch (error) {
            closeModal("PROCESSING_TRANSACTION");
            console.error("Failed to create consume proposal:", error);
            if (error instanceof TimeoutError) {
                toast.error("Operation timed out after retries. Please try again.");
            }
            else {
                toast.error("Failed to create consume proposal");
            }
        }
        finally {
            setIsCreatingProposal(false);
        }
    };
    const changeAccount = (accountId: string) => {
        setActiveTab(accountId);
        setActiveSubTab("pending");
        setSelectedNoteIds([]);
        setCurrentPage(1);
    };
    const changeSubTab = (tab: SubTabType) => {
        setActiveSubTab(tab);
        setSelectedNoteIds([]);
        setCurrentPage(1);
    };
    const activeProposals = activeSubTab === "history" ? historyProposals : pendingProposals;
    const proposalRows = activeProposals.map(proposal => {
        const status = proposal.status as MultisigProposalStatusEnum;
        const isHistory = status === MultisigProposalStatusEnum.EXECUTED ||
            status === MultisigProposalStatusEnum.FAILED ||
            status === MultisigProposalStatusEnum.CANCELLED;
        const cfg = statusConfig[status] || statusConfig[MultisigProposalStatusEnum.PENDING];
        const cat = (proposal as any).proposalCategory;
        const catConfig = cat ? categoryConfig[cat] : undefined;
        const icon = catConfig?.icon ||
            (proposal.proposalType === "SEND" ? "/transaction/pay-icon.svg" : "/transaction/consume-icon.svg");
        const label = catConfig?.label || (proposal.proposalType === "SEND" ? "Pay" : "Receive");
        return {
            __proposal: proposal,
            Transaction: (<div className="flex items-center gap-3">
          <img src={icon} alt={label} className="w-6 h-6"/>
          <span className="text-sm font-medium text-text-primary whitespace-nowrap">{label}</span>
        </div>),
            Description: (<span className="block max-w-[280px] truncate text-sm font-medium text-text-primary">
          {proposal.description}
        </span>),
            Amount: <ProposalAmountCell proposal={proposal}/>,
            Status: (<div className="flex justify-center">
          <div className={`inline-flex items-center justify-center px-4 py-1 rounded-full border ${cfg.borderColor} ${cfg.bgColor}`}>
            <span className={`text-sm font-semibold ${cfg.textColor} whitespace-nowrap`}>
              {isHistory
                    ? cfg.label
                    : `${proposal.signaturesCount ?? proposal.signatures?.length ?? 0} of ${proposal.threshold ?? (proposal as any).requiredSignatures ?? "?"}`}
            </span>
          </div>
        </div>),
            Date: (<span className="text-sm font-medium text-text-secondary whitespace-nowrap">
          {formatDate(proposal.createdAt)}
        </span>),
        };
    });
    const proposalActionRenderer = (rowData: Record<string, any>) => {
        const proposal = rowData.__proposal;
        if (!proposal)
            return null;
        const status = proposal.status as MultisigProposalStatusEnum;
        const isPending = status === MultisigProposalStatusEnum.PENDING;
        const isReady = status === MultisigProposalStatusEnum.READY;
        if (!isPending && !isReady)
            return null;
        const hasUserSigned = signerAddress
            ? proposal.signatures?.some((sig: any) => sig.approverPublicKey.toLowerCase().replace(/^0x/, "") ===
                signerAddress.toLowerCase().replace(/^0x/, ""))
            : false;
        const isSignLoading = actionLoadingId === proposal.uuid && actionType === "sign";
        const isExecuteLoading = actionLoadingId === proposal.uuid && actionType === "execute";
        const isCancelLoading = actionLoadingId === proposal.uuid && actionType === "cancel";
        return (<div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
        {isPending && (<>
            <SecondaryButton text="Deny" variant="red" buttonClassName="w-fit whitespace-nowrap" onClick={(e: any) => {
                    e.stopPropagation();
                    handleCancel(proposal.uuid);
                }} loading={isCancelLoading} disabled={isCancelLoading || isSignLoading || isViewer}/>
            <PrimaryButton text={hasUserSigned ? "Approved" : "Approve"} buttonClassName="w-fit whitespace-nowrap" onClick={(e: any) => {
                    e.stopPropagation();
                    handleSign(proposal.id);
                }} loading={isSignLoading} disabled={hasUserSigned || isSignLoading || isCancelLoading || isViewer}/>
          </>)}
        {isReady && (<PrimaryButton text="Refresh status" buttonClassName="w-fit whitespace-nowrap" onClick={(e: any) => {
                    e.stopPropagation();
                    handleExecute(proposal.id);
                }} loading={isExecuteLoading} disabled={isExecuteLoading || isViewer}/>)}
      </div>);
    };
    const noteRows = consumableNotesData.notes.map(note => {
        const firstAsset = note.assets?.[0];
        const faucetBech32 = firstAsset?.faucet_bech32 || "";
        const faucetHex = firstAsset?.faucet_id || "";
        const isSettlbox = isSettlboxToken(faucetBech32, faucetHex, firstAsset?.symbol || "");
        const symbol = isSettlbox ? USDC_TOKEN_SYMBOL : firstAsset?.symbol || "";
        const decimals = isSettlbox ? USDC_TOKEN_DECIMALS : firstAsset?.decimals ?? 8;
        const displayAmount = firstAsset ? formatAmount(firstAsset.amount, decimals) : "0";
        const tokenLabel = symbol || (faucetBech32 ? formatAddress(faucetBech32) : formatAddress(faucetHex));
        const tokenLogo = firstAsset ? getTokenLogo(faucetBech32, faucetHex, symbol) : "/token/any-token.svg";
        const noteTypeFormatted = parseNoteType(note.note_type);
        const noteTypeBadgeColor = getNoteTypeBadgeColor(note.note_type);
        const isInProposal = allProposals.some(proposal => proposal.proposalType === "CONSUME" &&
            proposal.noteIds?.includes(note.note_id) &&
            proposal.status !== "CANCELLED" &&
            proposal.status !== "FAILED" &&
            proposal.status !== "REJECTED");
        return {
            __note: note,
            __isInProposal: isInProposal,
            Note: (<div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">ID</span>
          <span className="text-sm font-medium text-text-strong-950">
            {note.note_id.slice(0, 5)}...{note.note_id.slice(-6)}
          </span>
        </div>),
            From: (<span className="text-sm font-medium text-text-strong-950">
          {note.sender ? formatAddress(note.sender) : symbol ? `${symbol} Faucet` : "Unknown"}
        </span>),
            Amount: (<div className="flex items-center justify-center gap-2">
          <img src={tokenLogo} alt={tokenLabel} className="w-6 h-6" onError={e => {
                    (e.target as HTMLImageElement).src = "/token/any-token.svg";
                }}/>
          <span className="text-sm font-medium text-text-strong-950 whitespace-nowrap">
            {displayAmount} {tokenLabel}
          </span>
        </div>),
            Type: (<div className="flex justify-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full border ${noteTypeFormatted ? noteTypeBadgeColor : "bg-gray-50 border-gray-200 text-gray-500"}`}>
            <span className="text-sm font-semibold">{noteTypeFormatted || "Note"}</span>
          </div>
        </div>),
        };
    });
    const noteActionRenderer = (rowData: Record<string, any>) => {
        const note = rowData.__note;
        if (!note)
            return null;
        return (<div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <PrimaryButton text={rowData.__isInProposal ? "In Proposal" : "Claim"} onClick={() => handleClaimNote(note.note_id)} loading={isCreatingProposal} disabled={rowData.__isInProposal || isCreatingProposal || isViewer} buttonClassName="w-fit whitespace-nowrap"/>
      </div>);
    };
    const subTabCount = activeSubTab === "receive"
        ? consumableNotesData.notes.length
        : activeSubTab === "history"
            ? historyProposals.length
            : pendingProposals.length;
    const subTabCountLabel = activeSubTab === "receive" ? "notes" : activeSubTab === "history" ? "records" : "transactions";
    const filterOptions = subTabs.map(tab => ({
        value: tab.id,
        label: tab.label,
        badge: tab.id === "receive" ? consumableNotesData.notes.length : undefined,
    }));
    return (<div className="flex w-full h-full flex-col">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Transactions</h1>
          <p className="text-[14px] text-text-secondary">
            Sign, execute and track multisig proposals across your accounts.
          </p>
        </div>
      </div>

      
      {accountsLoading ? (<div className="w-full flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"/>
        </div>) : multisigAccounts.length === 0 ? (<div className="w-full flex items-center justify-center py-12 text-text-secondary">
          <p>No multisig accounts found</p>
        </div>) : (<>
          
          <div className="mt-2 flex w-full items-center justify-between gap-2 border-b border-primary-divider px-6 pb-3">
            <TabContainer tabs={multisigAccounts.map(account => {
                const pendingCount = pendingCountByAccount.get(account.accountId) || 0;
                return {
                    id: account.accountId,
                    label: pendingCount > 0 ? (<span className="flex items-center gap-2">
                        {account.name}
                        <span className="inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                          {pendingCount}
                        </span>
                      </span>) : (account.name),
                };
            })} activeTab={activeTab ?? ""} setActiveTab={changeAccount} textSize="sm"/>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary whitespace-nowrap">
                {subTabCount} {subTabCountLabel}
              </span>
              <TransactionFilter options={filterOptions} value={activeSubTab} onChange={value => changeSubTab(value as SubTabType)}/>
            </div>
          </div>

          
          {activeSubTab === "pending" && syncWarning && (<div className="mx-6 mt-3 flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/>
              </svg>
              <p>
                A previous transaction is being finalized on-chain. New transactions cannot be submitted until this
                completes. This usually takes a few seconds.
              </p>
            </div>)}

          
          <div className="w-full p-5">
            {activeSubTab === "receive" ? (notesLoading ? (<div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"/>
                </div>) : (<Table headers={["Note", "From", "Amount", "Type"]} data={noteRows} className="w-full" rowClassName="py-4" headerClassName="py-3" showFooter={false} showPagination={true} actionColumn={true} actionRenderer={noteActionRenderer} currentPage={currentPage} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage} noDataMessage="No consumable notes on this account"/>)) : proposalsLoading ? (<div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"/>
              </div>) : (<Table headers={["Transaction", "Description", "Amount", "Status", "Date"]} data={proposalRows} className="w-full" rowClassName="py-4" headerClassName="py-3" tableLayout="fixed" columnWidths={{ "0": "155px", "2": "150px", "3": "130px", "4": "180px" }} actionColumnWidth="210px" showFooter={false} showPagination={true} actionColumn={true} actionRenderer={proposalActionRenderer} currentPage={currentPage} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage} onRowClick={rowData => {
                    const proposal = (rowData as any).__proposal;
                    if (proposal)
                        openModal("TRANSACTION_DETAIL", { proposalId: proposal.id });
                }} noDataMessage={activeSubTab === "history"
                    ? "Executed, failed, and cancelled proposals will appear here" : "No pending transactions yet. Create a proposal from the Bills page to get started."}/>)}
          </div>
        </>)}
    </div>);
}
