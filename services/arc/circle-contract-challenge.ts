export function circleContractChallenge(idempotencyKey: string, walletId: string, contractAddress: string, call: { abiFunctionSignature: string; abiParameters: unknown[] }) {
  return { idempotencyKey, walletId, contractAddress, amount: "0", feeLevel: "MEDIUM", abiFunctionSignature: call.abiFunctionSignature, abiParameters: call.abiParameters };
}
