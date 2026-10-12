import { encodeAbiParameters, getAddress, keccak256, parseAbi, type Hex } from "viem";
import { parseAmount } from "./amount.ts";
import type { TreasuryVaultDeploymentInput, TreasuryVaultPolicyInput } from "../../types/treasury-vault.ts";

export const treasuryVaultAbi = parseAbi([
  "struct Policy { uint256 paymentLimit; uint256 dailyLimit; uint256 lifetimeLimit; uint256 approvalThreshold; uint256 liquidityFloor; uint32 requiredApprovals; }",
  "constructor(address administrator,address executionWallet,Policy initialPolicy)",
  "function owner() view returns (address)",
  "function pendingOwner() view returns (address)",
  "function executor() view returns (address)",
  "function paused() view returns (bool)",
  "function policyVersion() view returns (uint64)",
  "function lifetimeSpent() view returns (uint256)",
  "function approverCount() view returns (uint32)",
  "function dailySpent(uint256 day) view returns (uint256)",
  "function policy() view returns (uint256 paymentLimit,uint256 dailyLimit,uint256 lifetimeLimit,uint256 approvalThreshold,uint256 liquidityFloor,uint32 requiredApprovals)",
  "function payments(bytes32 id) view returns (address recipient,uint256 amount,uint64 expiresAt,uint64 policyVersion,uint32 approvals,uint8 status)",
  "function recipients(address recipient) view returns (bool)",
  "function approvers(address approver) view returns (bool)",
  "function queuePayment(bytes32 id,address recipient,uint256 amount,uint64 expiresAt)",
  "function approvePayment(bytes32 id)",
  "function executePayment(bytes32 id)",
  "function cancelPayment(bytes32 id)",
  "function setPolicy(Policy value)",
  "function setRecipient(address recipient,bool allowed)",
  "function setApprover(address approver,bool allowed)",
  "function setExecutor(address value)",
  "function setPaused(bool value)",
  "function recover(address recipient,uint256 amount)",
  "event PaymentQueued(bytes32 indexed id,address indexed recipient,uint256 amount,uint64 expiresAt,uint64 policyVersion)",
  "event PaymentApproved(bytes32 indexed id,address indexed approver)",
  "event PaymentExecuted(bytes32 indexed id,address indexed recipient,uint256 amount)",
  "event PaymentCancelled(bytes32 indexed id)",
]);

const uint256Max = (1n << 256n) - 1n;
export function vaultPolicy(input: TreasuryVaultPolicyInput) {
  if (!input || typeof input !== "object") throw new Error("Vault policy is required");
  const amount = (value: string) => {
    if (typeof value !== "string" || value.length > 100) throw new Error("USDC limits must be decimal strings");
    const parsed = parseAmount(value, 18);
    if (parsed > uint256Max) throw new Error("Vault limit exceeds contract precision");
    return parsed;
  };
  const result = {
    paymentLimit: amount(input.paymentLimitUsdc),
    dailyLimit: amount(input.dailyLimitUsdc),
    lifetimeLimit: amount(input.lifetimeLimitUsdc),
    approvalThreshold: amount(input.approvalThresholdUsdc),
    liquidityFloor: amount(input.liquidityFloorUsdc),
    requiredApprovals: input.requiredApprovals,
  };
  if (result.paymentLimit === 0n || result.paymentLimit > result.dailyLimit || result.dailyLimit > result.lifetimeLimit || result.approvalThreshold > result.paymentLimit || !Number.isInteger(result.requiredApprovals) || result.requiredApprovals < 1 || result.requiredApprovals > 20) throw new Error("Vault spending limits or approval count are invalid");
  return result;
}

function vaultAddress(value: string) {
  if (typeof value !== "string" || !/^0x[0-9a-f]{40}$/i.test(value) || /^0x0{40}$/i.test(value)) throw new Error("A nonzero EVM address is required");
  return getAddress(value);
}

export function prepareVaultDeployment(input: TreasuryVaultDeploymentInput, bytecode: Hex) {
  if (input.chainId !== 5042002) throw new Error("Vault deployment preparation requires Arc Testnet");
  if (!/^0x(?:[0-9a-f]{2})+$/i.test(bytecode)) throw new Error("Compiled vault bytecode is required");
  const administrator = vaultAddress(input.administrator);
  const executor = vaultAddress(input.executor);
  if (administrator === executor) throw new Error("Administration and agent execution must use different wallets");
  const policy = vaultPolicy(input.policy);
  const parameters = encodeAbiParameters([
    { type: "address" }, { type: "address" },
    { type: "tuple", components: [
      { name: "paymentLimit", type: "uint256" }, { name: "dailyLimit", type: "uint256" },
      { name: "lifetimeLimit", type: "uint256" }, { name: "approvalThreshold", type: "uint256" },
      { name: "liquidityFloor", type: "uint256" }, { name: "requiredApprovals", type: "uint32" },
    ] },
  ], [administrator, executor, policy]);
  const data = `${bytecode}${parameters.slice(2)}` as Hex;
  return { chainId: input.chainId, administrator, executor, policy, data, deploymentHash: keccak256(data), startsPaused: true as const };
}
