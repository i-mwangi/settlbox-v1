export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user?: {
    id: number;
    uuid: string;
    email: string;
    role: "USER" | "ADMIN" | string;
    isActive: boolean;
    createdAt: Date;
    lastLogin: Date | null;
    updatedAt?: Date;
    teamMembership?: {
      id: number;
      uuid: string;
      firstName: string;
      lastName: string;
      position?: string | null;
      profilePicture?: string | null;
      role: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      companyId: number;
      joinedAt?: Date | null;
      company?: {
        id: number;
        uuid?: string;
        companyName?: string;
        registrationNumber?: string;
        verificationStatus?: string;
        isActive?: boolean;
        createdAt?: Date;
        updatedAt?: Date;
      };
    } | null;
  };
}

