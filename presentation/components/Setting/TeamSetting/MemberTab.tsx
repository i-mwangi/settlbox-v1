"use client";
import React, { useState, useEffect, useMemo } from "react";
import MemberCard from "./MemberCard";
import { useGetCompanyTeamMembers, useRemoveTeamMember } from "@/presentation/services/api/team-member";
import { useAuth } from "@/presentation/services/auth/context";
import { Tooltip } from "react-tooltip";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { MemberActionTooltip } from "@/presentation/components/Common/ToolTip/MemberActionTooltip";
import toast from "react-hot-toast";
import type { TeamMemberResponseDto } from "@/presentation/types/dto/team-member";
import { TeamMemberRoleEnum, TeamMemberStatusEnum } from "@/presentation/types/enums";
import { PermissionRequiredModalProps } from "@/presentation/types/modal";
interface Member {
    id: string;
    name: string;
    email: string;
    companyRole: string;
    role: string[];
}
interface MemberTabProps {
    onMenuClick: (memberId: string) => void;
}
const roleDisplay = (role?: string): TeamMemberRoleEnum => {
    switch (role) {
        case "OWNER":
            return TeamMemberRoleEnum.OWNER;
        case "ADMIN":
            return TeamMemberRoleEnum.ADMIN;
        case "REVIEWER":
            return TeamMemberRoleEnum.REVIEWER;
        case "VIEWER":
            return TeamMemberRoleEnum.VIEWER;
        default:
            return TeamMemberRoleEnum.VIEWER;
    }
};
const MemberTab: React.FC<MemberTabProps> = ({ onMenuClick }) => {
    const { user } = useAuth();
    const { openModal } = useModal();
    const companyId = user?.teamMembership?.companyId;
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(t);
    }, [query]);
    const { data: teamMembers = [], isLoading, error } = useGetCompanyTeamMembers(companyId, { search: debouncedQuery }, { enabled: !!companyId });
    const members = useMemo<Member[]>(() => {
        return teamMembers.map((m: TeamMemberResponseDto) => ({
            id: String(m.id),
            name: `${m.firstName} ${m.lastName}`.trim(),
            email: (m as any).user?.email || (m as any).email || "",
            companyRole: m.position || "",
            role: [roleDisplay(m.role)],
        }));
    }, [teamMembers]);
    const removeTeamMember = useRemoveTeamMember();
    return (<div className="flex flex-col gap-6 w-full">
      
      <div className="flex items-center justify-between w-full">
        
        <section className="flex flex-row items-center justify-between px-3 py-2 border border-primary-divider rounded-xl bg-app-background w-[200px]">
          <input type="text" placeholder="Search by name" className="text-sm text-text-primary outline-none placeholder-text-secondary w-full" value={query} onChange={e => setQuery(e.target.value)}/>
          <img src="/misc/blue-search-icon.svg" alt="search" className="w-5 h-5"/>
        </section>
      </div>

      
      <div className="grid grid-cols-3 gap-2 w-full">
        {error && <p role="alert" className="text-sm text-red-600">{error instanceof Error ? error.message : "Could not load workspace members"}</p>}
        {isLoading && <p className="text-sm text-text-secondary">Loading...</p>}
        {!isLoading && teamMembers.length === 0 && <p className="text-sm text-text-secondary">No members found</p>}
        {teamMembers.map((m: TeamMemberResponseDto) => {
            const member = {
                id: String(m.id),
                name: `${m.firstName} ${m.lastName}`.trim(),
                email: (m as any).user?.email || (m as any).email || "",
                companyRole: m.position || "",
                role: [roleDisplay(m.role)],
                status: m.status,
                profilePicture: m.profilePicture || undefined,
            };
            const handleEdit = () => {
                if (user?.teamMembership?.role !== "ADMIN" && user?.teamMembership?.role !== "OWNER") {
                    openModal<PermissionRequiredModalProps>("PERMISSION_REQUIRED", { role: user?.teamMembership?.role });
                    return;
                }
                openModal("EDIT_TEAM_MEMBER", { id: Number(m.id) });
            };
            const handleRemove = () => {
                if (user?.teamMembership?.role !== "ADMIN" && user?.teamMembership?.role !== "OWNER") {
                    openModal<PermissionRequiredModalProps>("PERMISSION_REQUIRED", { role: user?.teamMembership?.role });
                    return;
                }
                openModal("REMOVE_TEAM_MEMBER", {
                    name: `${m.firstName} ${m.lastName}`.trim(),
                    onRemove: async () => {
                        try {
                            await removeTeamMember.mutateAsync({ teamMemberId: Number(m.id), companyId: Number(companyId) });
                            toast.success("Team member removed");
                        }
                        catch (err) {
                            console.error("Failed to remove team member", err);
                            toast.error("Failed to remove member");
                        }
                    },
                });
            };
            return (<MemberCard key={member.id} member={member} onMenuClick={onMenuClick} onEdit={m.id > 0 ? handleEdit : undefined} onRemove={m.id > 0 ? handleRemove : undefined}/>);
        })}
      </div>
    </div>);
};
export default MemberTab;
