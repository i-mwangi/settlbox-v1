import type { CategoryShapeEnum } from '../enums/index';
import type { PaginationMetaDto } from './common';
import { NetworkDto } from './network';
import { TokenDto } from './token';
export interface CreateCompanyGroupDto {
    name: string;
    shape: CategoryShapeEnum;
    color: string;
}
export interface CreateContactDto {
    groupId: number;
    name: string;
    walletAddress: string;
    email?: string;
    token?: TokenDto;
    network: NetworkDto;
}
export interface UpdateAddressBookDto {
    name?: string;
    walletAddress?: string;
    address?: string;
    email?: string;
    token?: TokenDto;
    groupId?: number;
    network?: NetworkDto;
}
export interface AddressBookNameDuplicateDto {
    name: string;
    category: string;
    userAddress: string;
}
export interface DeleteAddressBookDto {
    ids: number[];
}
export interface BulkDeleteEmployeesDto {
    ids: number[];
}
export interface AddressBookOrderDto {
    id: number;
    order: number;
}
export interface CategoryOrderDto {
    categoryIds: number[];
}
export interface CompanyGroupResponseDto {
    id: number;
    name: string;
    shape: CategoryShapeEnum;
    color: string;
    order: number;
    companyId: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}
export interface CompanyContactResponseDto {
    id: number;
    name: string;
    walletAddress: string;
    email?: string;
    description?: string;
    token: TokenDto;
    network: NetworkDto;
    groupId: number;
    companyId: number;
    order?: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}
export interface PaginatedContactsResponseDto {
    data: CompanyContactResponseDto[];
    pagination: PaginationMetaDto;
}
export interface PaginatedGroupsResponseDto {
    data: CompanyGroupResponseDto[];
    pagination: PaginationMetaDto;
}
export interface EmployeeStatisticsDto {
    totalContacts: number;
    totalGroups: number;
    contactsByGroup: Record<string, number>;
}
