import { readWorkspace, saveWorkspaceFields } from "./seeded-workspace";
import { useRecordMutation } from "./record-mutation";

interface ProfileChanges {
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
}

async function saveProfile(changes: ProfileChanges) {
    const workspace = await readWorkspace();
    const membership = workspace.data.user.teamMembership;
    if (!membership) throw new Error("A workspace profile is required");
    if (changes.firstName !== undefined && (!changes.firstName.trim() || changes.firstName.length > 100)) throw new Error("Enter a name of at most 100 characters");
    if (changes.lastName !== undefined && changes.lastName.length > 100) throw new Error("Last name is too long");
    if (changes.profilePicture !== undefined && !changes.profilePicture.startsWith("/api/uploads/")) throw new Error("Upload a profile image first");
    await saveWorkspaceFields([
        { field: "user", value: { ...workspace.data.user, teamMembership: { ...membership, ...changes } } },
        { field: "teamMembers", value: workspace.data.teamMembers.map(member => member.id === membership.id ? { ...member, ...changes } : member) },
    ], workspace);
}

export function useSaveProfile() { return useRecordMutation(saveProfile); }
