import { TeamMemberResponseDto as TeamMembership } from "@settlbox/types/dto/team-member";

export interface User {
    id: number;
    uuid?: string;
    email: string;
    role?: "USER" | "ADMIN" | string;
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date;
    lastLogin?: Date | null;
    teamMembership?: TeamMembership | null;
}