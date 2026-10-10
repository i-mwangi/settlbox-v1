import { useDemo } from "@/presentation/contexts/DemoProvider";
import type { DemoContact } from "@/presentation/contexts/DemoProvider";
import { modifyWorkspace, useRecordMutation } from "./record-mutation";

type ContactInput = Pick<DemoContact, "name" | "walletAddress"> & Partial<Pick<DemoContact, "email" | "category" | "notes">>;
export function useGetCategories() {
  const { data, isLoaded } = useDemo();
  return { data: data?.contactCategories ?? [], isLoading: !isLoaded, isError: false };
}
export function useGetAddressBooks() {
  const { data, isLoaded } = useDemo();
  const grouped = (data?.contactCategories ?? []).map(category => ({ ...category, addressBooks: (data?.contacts ?? []).filter(contact => contact.category === category.name) }));
  return { data: grouped, isLoading: !isLoaded, isError: false, refetch: async () => window.dispatchEvent(new Event("settlbox-workspace-refresh")) };
}
export function useCreateAddressBook() {
  return useRecordMutation(async (input: ContactInput) => {
    let saved: DemoContact | undefined;
    await modifyWorkspace("contacts", contacts => {
      saved = { ...input, id: Math.max(0, ...contacts.map(contact => contact.id)) + 1, uuid: crypto.randomUUID(), email: input.email || "", notes: input.notes || "", category: input.category || "" };
      return [...contacts, saved];
    });
    return saved!;
  });
}
export function useCreateCategory() {
  return useRecordMutation(async (input: { name: string }) => {
    return modifyWorkspace("contactCategories", categories => [...categories, { id: Math.max(0, ...categories.map(category => category.id)) + 1, name: input.name, order: categories.length, shape: "CIRCLE", color: "#35ADE9" }]);
  });
}
export function useUpdateCategoryOrder() {
  return useRecordMutation(async (input: { categoryIds: number[] }) => modifyWorkspace("contactCategories", categories => categories.map(category => ({ ...category, order: input.categoryIds.indexOf(category.id) >= 0 ? input.categoryIds.indexOf(category.id) : category.order }))));
}
export function useUpdateAddressBook() {
  return useRecordMutation(async (input: { uuid: string; data: Partial<ContactInput> }) => modifyWorkspace("contacts", contacts => {
    if (!contacts.some(contact => contact.uuid === input.uuid)) throw new Error("Contact not found");
    return contacts.map(contact => contact.uuid === input.uuid ? { ...contact, ...input.data } : contact);
  }));
}
export function useDeleteAddressBook() {
  return useRecordMutation(async (input: { ids: number[] }) => modifyWorkspace("contacts", contacts => contacts.filter(contact => !input.ids.includes(contact.id))));
}
export function useUpdateAddressBookOrder() {
  return useRecordMutation(async (input: { id: number; order: number }[]) => modifyWorkspace("contacts", contacts => [...contacts].sort((left, right) => (input.find(item => item.id === left.id)?.order ?? 0) - (input.find(item => item.id === right.id)?.order ?? 0))));
}
export { useGetCategories as default };
