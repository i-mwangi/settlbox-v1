export async function submitTransactionWithOwnOutputNotes(sender: string, notes: any[]): Promise<string> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
export async function submitTransactionWithOwnInputNotes(notes: any[], sender: string): Promise<string> {
    throw new Error("This note-based action has no Arc implementation. Use a saved Arc payment or escrow workflow.");
}
