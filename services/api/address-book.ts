"use client";

import { useWorkspaceMutation, useWorkspaceRecords } from "./workspace";
import type { Category, CategoryDto, AddressBook, CreateAddressBookDto, UpdateAddressBookDto, AddressBookOrderDto } from "@/types/address-book";
export function useGetCategories() { return useWorkspaceRecords<Category>("categories"); }
export function useGetAddressBooks() {
  const categories = useGetCategories();
  const contacts = useWorkspaceRecords<AddressBook>("contacts");
  return { ...contacts, data: (categories.data || []).map(category => ({ ...category, addressBooks: (contacts.data || []).filter(contact => contact.categoryId === category.id) })) };
}
export function useCreateCategory() { return useWorkspaceMutation<Category, CategoryDto>("categories", "POST"); }
export function useCreateAddressBook() { return useWorkspaceMutation<AddressBook, CreateAddressBookDto>("contacts", "POST"); }
export function useUpdateAddressBook() { return useWorkspaceMutation<AddressBook, { id: number; data: UpdateAddressBookDto }>("contacts", "PATCH"); }
export function useDeleteAddressBook() { return useWorkspaceMutation<{ deleted: number }, { ids: number[] }>("contacts", "DELETE"); }
export function useUpdateCategoryOrder() { return useWorkspaceMutation<Category, { id: number; data: { order: number } }>("categories", "PATCH"); }
export function useUpdateAddressBookOrder() { return useWorkspaceMutation<AddressBook, AddressBookOrderDto>("contacts", "PATCH"); }
export { useGetCategories as default };
