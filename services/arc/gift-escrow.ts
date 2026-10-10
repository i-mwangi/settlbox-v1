import { parseAbi } from "viem";

export const giftEscrowAbi = parseAbi([
  "function createGift(bytes32 id,address recipient,uint64 expiresAt) payable",
  "function claimGift(bytes32 id)",
  "function refundGift(bytes32 id)",
  "function gifts(bytes32 id) view returns (address sender,address recipient,uint256 amount,uint64 expiresAt,uint8 status)",
]);

export function validateGiftId(value: string): asserts value is `0x${string}` {
  if (!/^0x[0-9a-f]{64}$/i.test(value) || /^0x0{64}$/.test(value)) throw new Error("Invalid gift identifier");
}
