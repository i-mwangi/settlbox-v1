"use client";

import { useState, type FormEvent } from "react";
import BaseModal from "../BaseModal";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import type { InviteTeamMemberModalProps } from "@/types/modal";
import { useInviteTeamMember } from "@/services/api/team-member";
import type { TeamMemberRoleEnum } from "@/types/enums";

export default function InviteTeamMember({ isOpen, onClose, zIndex }: ModalProp<InviteTeamMemberModalProps>) {
  const invite = useInviteTeamMember();
  const [link, setLink] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { const result = await invite.mutateAsync({ inviteDto: { firstName: String(form.get("firstName")), lastName: String(form.get("lastName")), email: String(form.get("email")), position: String(form.get("position")), role: String(form.get("role")) as TeamMemberRoleEnum } }); setLink(`${window.location.origin}/team-invite?token=${result.token}`); } catch {}
  }
  if (!isOpen) return null;
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}><section className="max-w-lg space-y-4 rounded-xl bg-background p-6 text-text-primary"><h2 className="text-xl font-semibold">Invite team member</h2>{link ? <><p>Share this invitation directly with the intended member. It expires in seven days and can be accepted once.</p><input aria-label="Invitation link" readOnly value={link} className="w-full rounded-lg border bg-background p-3" /><p>No email has been sent.</p><button onClick={() => { setLink(null); onClose(); }}>Done</button></> : <form onSubmit={submit} className="grid gap-3">{["firstName", "lastName", "email", "position"].map(name => <label key={name}>{name === "firstName" ? "First name" : name === "lastName" ? "Last name" : name === "email" ? "Email" : "Position"}<input name={name} type={name === "email" ? "email" : "text"} required={name === "firstName" || name === "email"} maxLength={160} className="mt-1 w-full rounded-lg border bg-background p-3" /></label>)}<label>Role<select name="role" className="mt-1 w-full rounded-lg border bg-background p-3"><option value="VIEWER">Viewer · read access</option><option value="REVIEWER">Reviewer · read and approve payments</option><option value="ADMIN">Admin · manage business payments</option></select></label><button disabled={invite.isPending} className="rounded-lg bg-primary-blue p-3 text-white">{invite.isPending ? "Creating…" : "Create invitation link"}</button>{invite.error && <p role="alert">{invite.error.message}</p>}</form>}</section></BaseModal>;
}
