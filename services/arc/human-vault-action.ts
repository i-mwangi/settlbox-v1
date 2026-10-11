import { getAddress, isAddress } from "viem";

export function humanVaultAction(action: unknown, address: unknown, executor: string) {
  if (action === "pause" || action === "unpause") return { abiFunctionSignature: "setPaused(bool)", abiParameters: [action === "pause"] };
  if (action !== "allow_recipient" && action !== "allow_approver") throw new Error("Unsupported vault administration action");
  if (typeof address !== "string" || !isAddress(address) || /^0x0{40}$/i.test(address)) throw new Error("A valid nonzero wallet address is required");
  const target = getAddress(address);
  if (action === "allow_approver" && target.toLowerCase() === executor.toLowerCase()) throw new Error("The executor cannot be a human approver");
  return { abiFunctionSignature: action === "allow_recipient" ? "setRecipient(address,bool)" : "setApprover(address,bool)", abiParameters: [target, true] };
}
