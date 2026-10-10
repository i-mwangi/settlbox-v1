import type { CompanyContactResponseDto } from "./dto/employee";
import type { CategoryShapeEnum } from "./enums";

export type WorkspaceResource = "employees" | "employee-groups" | "clients" | "categories" | "contacts" | "company" | "payment-groups" | "invoice-settings";

export interface EmployeeContact extends CompanyContactResponseDto {
  uuid: string;
  groupIds: number[];
  employeeType: "employee" | "contractor";
  isActive: boolean;
  paymentMethod: "crypto";
  payroll: { monthlyAmount: string; paydayDay: number; duration: number; durationUnit: "month" | "year"; description: string; note: string } | null;
}

export interface WorkspaceProfile {
  id: number;
  uuid: string;
  companyName: string;
  registrationNumber: string;
  country: string;
  industry: string;
  companySize: string;
  website: string;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactCategory {
  id: number;
  name: string;
  shape: CategoryShapeEnum;
  color: string;
  order: number;
}
