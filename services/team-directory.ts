type DirectoryMember = {
  id: number;
  firstName: string;
  lastName?: string;
  user?: { email?: string };
};
export function mergeTeamDirectory<T extends DirectoryMember>(
  current: T[],
  historical: T[],
  search = "",
): T[] {
  const emails = new Set(
    current
      .map((member) => member.user?.email?.trim().toLowerCase())
      .filter(Boolean),
  );
  const previous = historical
    .filter((member) => !emails.has(member.user?.email?.trim().toLowerCase()))
    .map((member) => ({ ...member, id: -Math.abs(member.id) }));
  const query = search.trim().toLowerCase();
  return [...current, ...previous].filter((member) =>
    `${member.firstName} ${member.lastName || ""} ${member.user?.email || ""}`
      .toLowerCase()
      .includes(query),
  );
}
