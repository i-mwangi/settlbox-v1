import { parseAbi, formatUnits, toFunctionSelector, type Address } from "viem";

// Official USYC Arc Testnet deployments: https://usyc.docs.hashnote.com/overview/smart-contracts
export const usycContracts = {
  token: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
  teller: "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A",
  oracle: "0x52b56c7642E71dc54714d879127d97cd0B3D4581",
  entitlements: "0xcc205224862c7641930c87679e98999d23c26113",
  asset: "0x3600000000000000000000000000000000000000",
} as const;
export const usycTellerAbi = parseAbi([
  "function asset() view returns (address)", "function share() view returns (address)",
  "function oracle() view returns (address)", "function authority() view returns (address)",
  "function maxDeposit(address account) view returns (uint256)", "function maxRedeem(address account) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function previewDepositData(address account,uint256 assets) view returns (uint256 shares,uint256 fee,int256 price)",
  "function previewRedeemData(address account,uint256 shares) view returns (uint256 assets,uint256 fee,int256 price)",
]);
export const usycEntitlementsAbi = parseAbi([
  "function paused() view returns (bool)",
  "function canCall(address user,address target,bytes4 functionSig) view returns (bool)",
  "function canCall(address user1,address user2,address target,bytes4 functionSig) view returns (bool)",
]);
export const usycOracleAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)",
]);
export function verifyUsycIdentity(chain: number, values: readonly string[]) {
  if (chain !== 5042002) throw new Error("USYC requires Arc Testnet");
  const expected = [usycContracts.asset,usycContracts.token,usycContracts.oracle,usycContracts.entitlements];
  if (values.length !== expected.length || values.some((value,index)=>value.toLowerCase() !== expected[index].toLowerCase())) throw new Error("USYC Teller contract identity changed");
}
export function usycValuation(shares: bigint, price: bigint, shareDecimals: number, priceDecimals: number) {
  if (shares < 0n || price <= 0n || !Number.isInteger(shareDecimals) || shareDecimals < 0 || shareDecimals > 36 || !Number.isInteger(priceDecimals) || priceDecimals < 0 || priceDecimals > 36) throw new Error("Invalid USYC valuation");
  return formatUnits(shares * price,shareDecimals + priceDecimals);
}
export function usycPermissionCalls(wallet: Address) {
  return [
    [wallet, usycContracts.teller, toFunctionSelector("deposit(uint256,address)")],
    [wallet, usycContracts.token, toFunctionSelector("transfer(address,uint256)")],
    [wallet, usycContracts.teller, toFunctionSelector("redeem(uint256,address,address)")],
    [wallet, wallet, usycContracts.token, toFunctionSelector("transfer(address,uint256)")],
  ] as const;
}
