"use client";

import { useState } from "react";
import MemberCard from "./MemberCard";
import { useGetCompanyTeamMembers, useRemoveTeamMember, useResendInvitation } from "@/services/api/team-member";
import { useAuth } from "@/services/auth/context";
import { useModal } from "@/contexts/ModalManagerProvider";
import toast from "react-hot-toast";

export default function MemberTab() {
  const { user } = useAuth();
  const { openModal } = useModal();
  const query = useGetCompanyTeamMembers();
  const remove = useRemoveTeamMember();
  const resend = useResendInvitation();
  const [search, setSearch] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const owner = user?.role === "OWNER";
  const members = (query.data || []).filter(member => `${member.firstName} ${member.lastName} ${member.email}`.toLowerCase().includes(search.toLowerCase()));

  async function renew(id: number) {
    try {
      const result = await resend.mutateAsync(id);
      setInvitationUrl(`${window.location.origin}/team-invite?token=${result.token}`);
      toast.success("Invitation renewed. Share the new link with this member.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Invitation could not be renewed"); }
  }

  return <div className="flex w-full flex-col gap-6">
    <input aria-label="Search team" placeholder="Search by name or email" value={search} onChange={event => setSearch(event.target.value)} className="w-full max-w-sm rounded-xl border border-primary-divider bg-background p-3" />
    {invitationUrl && <label className="space-y-2">New invitation link · expires in seven days<input aria-label="Renewed invitation link" readOnly value={invitationUrl} className="w-full rounded-lg border border-primary-divider bg-background p-3" /></label>}
    {query.isLoading && <p>Loading team…</p>}
    {query.error && <p role="alert">Team could not be loaded. <button onClick={() => { void query.refetch(); }}>Retry</button></p>}
    {!query.isLoading && !query.error && !members.length && <p>No members found.</p>}
    <div className="grid gap-3 md:grid-cols-3">{members.map(member => <div key={member.id} className="space-y-2"><MemberCard
      member={{ id: String(member.id), name: `${member.firstName} ${member.lastName}`.trim(), email: member.email, companyRole: member.position || "", role: [member.role], status: member.status, profilePicture: member.profilePicture || undefined }}
      onEdit={() => { if (owner) openModal("EDIT_TEAM_MEMBER", { id: member.id }); else toast.error("Only the workspace owner can manage team access"); }}
      onRemove={() => {
        if (!owner) { toast.error("Only the workspace owner can manage team access"); return; }
        openModal("REMOVE_TEAM_MEMBER", { name: `${member.firstName} ${member.lastName}`.trim(), onRemove: async () => {
          try { await remove.mutateAsync({ teamMemberId: member.id }); toast.success("Team access removed"); }
          catch (error) { toast.error(error instanceof Error ? error.message : "Member could not be removed"); }
        } });
      }}
    />{owner && member.status === "PENDING" && <button disabled={resend.isPending} onClick={() => { void renew(member.id); }} className="text-sm text-primary-blue">Renew invitation link</button>}</div>)}</div>
  </div>;
}
