"use client";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import MemberCard from "./MemberCard";
import Card from "@/presentation/components/Common/Card";
import { useGetMultisigAccount, useGetAccountMembers, useUpdateMultisigAccount } from "@/presentation/services/api/multisig";
import { useRemoveTeamMember } from "@/presentation/services/api/team-member";
import toast from "react-hot-toast";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { TeamMemberRoleEnum } from "@/presentation/types/enums";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import type { ThresholdControl } from "@/presentation/contexts/DemoProvider";
const mapRole = (role?: string): TeamMemberRoleEnum[] => {
    if (!role)
        return [];
    switch (role) {
        case "OWNER":
            return [TeamMemberRoleEnum.OWNER];
        case "ADMIN":
            return [TeamMemberRoleEnum.ADMIN];
        case "REVIEWER":
            return [TeamMemberRoleEnum.REVIEWER];
        case "VIEWER":
            return [TeamMemberRoleEnum.VIEWER];
        default:
            return [TeamMemberRoleEnum.VIEWER];
    }
};
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
};
const ThresholdControlSection = ({ thresholdControl, memberCount, onSave, }: {
    thresholdControl?: ThresholdControl;
    memberCount: number;
    onSave: (control: ThresholdControl) => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [amountThreshold, setAmountThreshold] = useState(thresholdControl?.amountThreshold ?? 10000);
    const [highSigners, setHighSigners] = useState(thresholdControl?.highSigners ?? 2);
    const [lowSigners, setLowSigners] = useState(thresholdControl?.lowSigners ?? 1);
    const [highDropdownOpen, setHighDropdownOpen] = useState(false);
    const [lowDropdownOpen, setLowDropdownOpen] = useState(false);
    useEffect(() => {
        if (thresholdControl) {
            setAmountThreshold(thresholdControl.amountThreshold);
            setHighSigners(thresholdControl.highSigners);
            setLowSigners(thresholdControl.lowSigners);
        }
    }, [thresholdControl]);
    const signerOptions = Array.from({ length: memberCount }, (_, i) => i + 1);
    const handleSave = () => {
        onSave({ amountThreshold, highSigners, lowSigners });
        setIsEditing(false);
        toast.success("Threshold control updated");
    };
    const handleCancel = () => {
        setAmountThreshold(thresholdControl?.amountThreshold ?? 10000);
        setHighSigners(thresholdControl?.highSigners ?? 2);
        setLowSigners(thresholdControl?.lowSigners ?? 1);
        setIsEditing(false);
    };
    if (!isEditing) {
        return (<div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">Threshold Control</span>
          <SecondaryButton text="Edit" icon="/misc/edit-icon.svg" iconPosition="left" onClick={() => setIsEditing(true)} variant="light" buttonClassName="w-fit whitespace-nowrap"/>
        </div>

        {thresholdControl ? (<div className="flex flex-col gap-3 bg-app-background rounded-2xl p-5 border border-primary-divider">
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-blue"/>
              <p className="text-sm text-text-primary">
                Payments above{" "}
                <span className="font-semibold text-primary-blue">{formatCurrency(thresholdControl.amountThreshold)}</span>{" "}
                require{" "}
                <span className="font-semibold">{thresholdControl.highSigners} out of {memberCount}</span>{" "}
                signers
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"/>
              <p className="text-sm text-text-primary">
                Payments at or below{" "}
                <span className="font-semibold text-emerald-600">{formatCurrency(thresholdControl.amountThreshold)}</span>{" "}
                require{" "}
                <span className="font-semibold">{thresholdControl.lowSigners} out of {memberCount}</span>{" "}
                signers
              </p>
            </div>
          </div>) : (<div className="flex flex-col items-center justify-center gap-3 py-8 bg-app-background rounded-2xl border border-primary-divider">
            <p className="text-sm text-text-secondary">No threshold control configured</p>
            <SecondaryButton text="Configure" onClick={() => setIsEditing(true)} buttonClassName="w-fit whitespace-nowrap"/>
          </div>)}
      </div>);
    }
    return (<div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold">Threshold Control</span>
        <div className="flex gap-2">
          <SecondaryButton text="Cancel" onClick={handleCancel} variant="light" buttonClassName="w-fit whitespace-nowrap"/>
          <SecondaryButton text="Save" onClick={handleSave} buttonClassName="w-fit whitespace-nowrap"/>
        </div>
      </div>

      <div className="flex flex-col gap-5 bg-app-background rounded-2xl p-5 border border-primary-divider">
        
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text-primary">Payment Amount Threshold (USD)</p>
          <p className="text-xs text-text-secondary">
            Transactions above this amount will require more approvals
          </p>
          <div className="flex items-center gap-2 bg-background border border-primary-divider rounded-xl px-4 py-2.5 w-[300px]">
            <span className="text-text-secondary text-sm">$</span>
            <input type="number" value={amountThreshold} onChange={e => setAmountThreshold(Math.max(0, Number(e.target.value)))} className="flex-1 bg-transparent text-text-primary outline-none text-sm font-medium" placeholder="10000" min={0}/>
          </div>
        </div>

        
        <div className="flex items-start gap-6">
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-blue"/>
              <p className="text-sm font-medium text-text-primary">
                Above {formatCurrency(amountThreshold)}
              </p>
            </div>
            <p className="text-xs text-text-secondary ml-4">
              Number of signers required for high-value transactions
            </p>
          </div>
          <div className="flex gap-2.5 items-center">
            <div className="relative">
              <button onClick={() => { setHighDropdownOpen(!highDropdownOpen); setLowDropdownOpen(false); }} className="bg-background border border-primary-divider flex gap-2 items-center px-4 py-1.5 rounded-lg cursor-pointer">
                <p className="font-medium text-sm text-text-primary">{highSigners}</p>
                <img alt="dropdown" className="w-3.5" src="/arrow/chevron-down.svg"/>
              </button>
              {highDropdownOpen && (<div className="absolute bottom-full right-0 mb-1 bg-background border border-primary-divider rounded-lg shadow-lg z-10 max-h-[200px] overflow-y-auto">
                  {signerOptions.map((option, index) => (<button key={option} onClick={() => { setHighSigners(option); setHighDropdownOpen(false); }} className={`w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm ${option === highSigners ? "bg-blue-50 font-medium" : ""} ${index === 0 ? "rounded-t-lg" : ""} ${index === signerOptions.length - 1 ? "rounded-b-lg" : ""}`}>
                      {option}
                    </button>))}
                </div>)}
            </div>
            <p className="text-sm text-text-secondary whitespace-nowrap">out of {memberCount}</p>
          </div>
        </div>

        
        <div className="flex items-start gap-6">
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"/>
              <p className="text-sm font-medium text-text-primary">
                At or below {formatCurrency(amountThreshold)}
              </p>
            </div>
            <p className="text-xs text-text-secondary ml-4">
              Number of signers required for low-value transactions
            </p>
          </div>
          <div className="flex gap-2.5 items-center">
            <div className="relative">
              <button onClick={() => { setLowDropdownOpen(!lowDropdownOpen); setHighDropdownOpen(false); }} className="bg-background border border-primary-divider flex gap-2 items-center px-4 py-1.5 rounded-lg cursor-pointer">
                <p className="font-medium text-sm text-text-primary">{lowSigners}</p>
                <img alt="dropdown" className="w-3.5" src="/arrow/chevron-down.svg"/>
              </button>
              {lowDropdownOpen && (<div className="absolute bottom-full right-0 mb-1 bg-background border border-primary-divider rounded-lg shadow-lg z-10 max-h-[200px] overflow-y-auto">
                  {signerOptions.map((option, index) => (<button key={option} onClick={() => { setLowSigners(option); setLowDropdownOpen(false); }} className={`w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm ${option === lowSigners ? "bg-blue-50 font-medium" : ""} ${index === 0 ? "rounded-t-lg" : ""} ${index === signerOptions.length - 1 ? "rounded-b-lg" : ""}`}>
                      {option}
                    </button>))}
                </div>)}
            </div>
            <p className="text-sm text-text-secondary whitespace-nowrap">out of {memberCount}</p>
          </div>
        </div>
      </div>
    </div>);
};
const TeamAccountContainer = () => {
    const { openModal } = useModal();
    const searchParams = useSearchParams();
    const accountId = searchParams.get("team-account") || undefined;
    const removeTeamMember = useRemoveTeamMember();
    const { data: myCompany } = useGetMyCompany();
    const updateAccount = useUpdateMultisigAccount();
    const { data: account, isLoading: accountLoading } = useGetMultisigAccount(accountId, { enabled: !!accountId });
    const { data: accountMembers, isLoading: membersLoading } = useGetAccountMembers(accountId, { enabled: !!accountId });
    const onMenuClick = (accountId: string) => { };
    const memberCount = account?.publicKeys?.length ?? account?.members?.length ?? 0;
    const handleSaveThresholdControl = async (control: ThresholdControl) => {
        if (!accountId)
            return;
        await updateAccount.mutateAsync(accountId, { thresholdControl: control });
    };
    return (<div className="flex flex-col gap-5 w-[900px]">
      
      <div className="flex flex-row gap-3">
        <img src="/arrow/thin-arrow-left.svg" alt="Back" className="w-6 h-6 cursor-pointer" onClick={() => window.history.back()}/>
        <span className="text-text-secondary">{myCompany?.companyName}</span> / <span>{account?.name}</span>
      </div>
      <div className="flex items-center justify-between w-full">
        <div className="flex gap-3 items-center">
          <img src={account?.logo ? account.logo : "/client-invoice/payroll-icon.svg"} alt="Team Avatar" className="w-12"/>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-text-primary leading-none">{account?.name}</h1>
            <p className="text-xs font-medium text-text-secondary leading-none">{memberCount} members</p>
          </div>
        </div>
      </div>

      
      <div className="flex gap-4 w-full">
        <Card title="Member" amount={memberCount.toString()}/>
        <Card title="Default Threshold" amount={account?.threshold?.toString() || "-"}/>
        <Card title="High-Value Threshold" amount={account?.thresholdControl
            ? `${account.thresholdControl.highSigners}/${memberCount}`
            : "-"} info={account?.thresholdControl
            ? `Required for payments above ${formatCurrency(account.thresholdControl.amountThreshold)}`
            : undefined}/>
      </div>

      
      <ThresholdControlSection thresholdControl={account?.thresholdControl} memberCount={memberCount} onSave={handleSaveThresholdControl}/>

      <div className="w-full flex justify-between items-center">
        <span className="text-2xl font-bold">Multi-Owner Account Member</span>
      </div>

      
      <div className="grid grid-cols-3 gap-2 w-full">
        {(accountMembers?.members || []).map((m: any, index: number) => {
            const member = {
                id: String(m.id ?? index),
                name: m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
                email: m.email || "",
                companyRole: m.position || "",
                role: mapRole(m.role),
                status: m.status,
                profilePicture: m.profilePicture,
            };
            const handleEdit = () => openModal("EDIT_TEAM_MEMBER", { id: Number(m.id) });
            const handleRemove = () => {
                openModal("REMOVE_TEAM_MEMBER", {
                    name: `${m.firstName || ""} ${m.lastName || ""}`.trim(),
                    onRemove: async () => {
                        try {
                            if (!account?.companyId)
                                throw new Error("Company ID missing");
                            await removeTeamMember.mutateAsync({
                                teamMemberId: Number(m.id),
                                companyId: Number(account.companyId),
                            });
                            toast.success("Team member removed");
                        }
                        catch (err) {
                            console.error("Failed to remove team member", err);
                            toast.error("Failed to remove member");
                        }
                    },
                });
            };
            return <MemberCard key={member.id} member={member} onMenuClick={onMenuClick}/>;
        })}
      </div>
    </div>);
};
export default TeamAccountContainer;
