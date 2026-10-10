"use client";
export async function deployAccount(isPublic: boolean): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function getAccountById(accountId: string): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export const importAndGetAccount = async (client: unknown, account: string): Promise<any> => {
    const importPromise = (async () => {
        throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
    })();
    return importPromise;
};
export const getAccounts = async () => {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
};
export const exportAccounts = async () => {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
};
export const importAccount = async (store: string) => {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
};
