"use client";
import { PartialConsumableNote } from "@/presentation/types/faucet";
import { BatchTransaction } from "@/presentation/services/store/batchTransactions";
import { WrappedNoteType } from "@/presentation/types/note";
export async function getConsumableNotes(accountId: string): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function createP2IDNote(sender: string, receiver: string, faucet: string, amount: number, noteType: WrappedNoteType): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function createP2IDENote(sender: string, receiver: string, faucet: string, amount: number, noteType: WrappedNoteType, recallHeight: number): Promise<[
    any,
    string[],
    number
]> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function consumeAllUnauthenticatedNotes(account: string, notes: {
    isPrivate: boolean;
    noteId: string;
    partialNote?: PartialConsumableNote;
}[]): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function consumeUnauthenticatedNote(account: string, partialNote: PartialConsumableNote): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function consumeUnauthenticatedGiftNote(account: string, note: any, secret: [
    number,
    number,
    number,
    number
]): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function consumeUnauthenticatedGiftNotes(account: string, notes: any[], secrets: [
    number,
    number,
    number,
    number
][]): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function consumeNoteByID(account: string, noteId: string): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function consumeNoteByIDs(account: string, noteIds: string[]): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function createGiftNote(creator: string, faucetId: string, amount: bigint, secret: [
    number,
    number,
    number,
    number
], serialNumber?: [
    number,
    number,
    number,
    number
]): Promise<[
    any,
    any[]
]> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function createBatchNote(caller: string, transactions: (Omit<BatchTransaction, "createdAt"> & {
    createdAt: Date;
})[]): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function createSchedulePaymentNote(sender: string, receiver: string, faucet: string, amount: number, noteType: WrappedNoteType, recallHeight: number, timelockHeight: number): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function createBatchSchedulePaymentNote(caller: string, transactions: (Omit<BatchTransaction, "createdAt"> & {
    createdAt: Date;
})[]): Promise<{
    notes: {
        id: () => string;
    }[];
    noteIds: string[];
    serialNumbers: string[][];
    recallableHeights: number[];
    timelockHeights: number[];
}> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function generateSecret(): Promise<[
    number,
    number,
    number,
    number
]> {
    const randomBytes = new Uint32Array(4);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes) as [
        number,
        number,
        number,
        number
    ];
}
export function secretArrayToString(secret: [
    number,
    number,
    number,
    number
]): string {
    const uint32Array = new Uint32Array(secret);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(uint32Array.buffer)));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
export function stringToSecretArray(secretString: string): [
    number,
    number,
    number,
    number
] {
    let base64 = secretString.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
        base64 += "=";
    }
    const uint8Array = new Uint8Array(atob(base64)
        .split("")
        .map(char => char.charCodeAt(0)));
    const uint32Array = new Uint32Array(uint8Array.buffer);
    return Array.from(uint32Array) as [
        number,
        number,
        number,
        number
    ];
}
export async function customCreateP2IDENote(sender: string, receiver: string, amount: number, faucet: string, recallHeight: number, timelockHeight: number, noteType: WrappedNoteType, aux: number, serialNumber: any[]): Promise<never> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
