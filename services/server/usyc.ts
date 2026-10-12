import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { arcTestnet } from "../arc/network";
import { usycContracts, usycTellerAbi, usycEntitlementsAbi, usycOracleAbi, usycPermissionCalls, verifyUsycIdentity, usycValuation } from "../arc/usyc";
import { readTreasuryConfiguration } from "./treasury-runtime";

export async function readUsycPosition() {
  const config = readTreasuryConfiguration(); const wallet = config.wallet.address;
  const client = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0], { timeout:10000,retryCount:1 }) });
  const chain = await client.getChainId(); const blockNumber = await client.getBlockNumber();
  const readTeller = (functionName: "asset"|"share"|"oracle"|"authority") => client.readContract({ address:usycContracts.teller,abi:usycTellerAbi,functionName,blockNumber });
  const identity = await Promise.all([readTeller("asset"),readTeller("share"),readTeller("oracle"),readTeller("authority")]);
  verifyUsycIdentity(chain,identity);
  const codes = await Promise.all(Object.values(usycContracts).map(address=>client.getCode({address,blockNumber})));
  // Arc's native USDC ERC-20 interface is a precompile, so it need not have bytecode.
  if (codes.slice(0,4).some(code=>!code || code === "0x")) throw new Error("USYC deployment code is unavailable");
  const [shares,shareDecimals,assetDecimals,assets,paused,priceDecimals,round,maxDeposit,maxRedeem,permissions] = await Promise.all([
    client.readContract({address:usycContracts.token,abi:erc20Abi,functionName:"balanceOf",args:[wallet],blockNumber}),
    client.readContract({address:usycContracts.token,abi:erc20Abi,functionName:"decimals",blockNumber}),
    client.readContract({address:usycContracts.asset,abi:erc20Abi,functionName:"decimals",blockNumber}),
    client.readContract({address:usycContracts.asset,abi:erc20Abi,functionName:"balanceOf",args:[wallet],blockNumber}),
    client.readContract({address:usycContracts.entitlements,abi:usycEntitlementsAbi,functionName:"paused",blockNumber}),
    client.readContract({address:usycContracts.oracle,abi:usycOracleAbi,functionName:"decimals",blockNumber}),
    client.readContract({address:usycContracts.oracle,abi:usycOracleAbi,functionName:"latestRoundData",blockNumber}),
    client.readContract({address:usycContracts.teller,abi:usycTellerAbi,functionName:"maxDeposit",args:[wallet],blockNumber}),
    client.readContract({address:usycContracts.teller,abi:usycTellerAbi,functionName:"maxRedeem",args:[wallet],blockNumber}),
    Promise.all(usycPermissionCalls(wallet).map(args=>client.readContract({address:usycContracts.entitlements,abi:usycEntitlementsAbi,functionName:"canCall",args,blockNumber}))),
  ]);
  const block = await client.getBlock({blockNumber});
  const oracleValid = round[1] > 0n && round[3] > 0n && round[3] <= block.timestamp && round[4] >= round[0];
  return {
    companyId:config.wallet.companyId,wallet,chainId:chain,contracts:usycContracts,blockNumber:blockNumber.toString(),observedAt:new Date().toISOString(),
    holdingsUsyc:formatUnits(shares,shareDecimals),walletUsdc:formatUnits(assets,assetDecimals),
    estimatedValueUsdc:oracleValid ? usycValuation(shares,round[1],shareDecimals,priceDecimals) : null,
    priceUsdc:oracleValid ? formatUnits(round[1],priceDecimals) : null,oracleUpdatedAt:round[3] > 0n ? new Date(Number(round[3])*1000).toISOString() : null,
    oracleValid,paused,canSubscribe:!paused && permissions[0] && permissions[1],canRedeem:!paused && permissions[2] && permissions[3],
    maxDepositUsdc:formatUnits(maxDeposit,assetDecimals),maxRedeemUsyc:formatUnits(maxRedeem,shareDecimals),
    executionEnabled:false,
    executionMessage:"Subscriptions and redemptions need a dedicated approved reserve workflow. The payment vault cannot invest in USYC.",
  };
}
