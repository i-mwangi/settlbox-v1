import { isAddress, keccak256, toHex } from "viem";

export function identiconSeed(value: string): `0x${string}` {
  return isAddress(value) ? value : `0x${keccak256(toHex(value)).slice(2, 42)}`;
}
