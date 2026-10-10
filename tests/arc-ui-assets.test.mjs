import test from "node:test";
import assert from "node:assert/strict";
import { parseUnits, isAddress } from "viem";
import { ARC_USDC, getArcTokenMetadata } from "../services/arc/token.ts";
import { identiconSeed } from "../services/arc/identicon.ts";

test("native and ERC-20 USDC amounts have distinct correct precisions", () => {
  const native = getArcTokenMetadata(ARC_USDC.assetId);
  const erc20 = getArcTokenMetadata(ARC_USDC.erc20Address);
  assert.equal(parseUnits("0.001", native.decimals), 1000000000000000n);
  assert.equal(parseUnits("0.001", erc20.decimals), 1000n);
  assert.equal(native.symbol, "USDC");
  assert.throws(() => getArcTokenMetadata("unknown-token"), /Only USDC/);
});

test("identicons preserve EVM addresses and distinguish non-address labels", () => {
  const address = "0x6672ad05c24f1e111e0d5354a8bb4e74053395f5";
  assert.equal(identiconSeed(address), address);
  assert.equal(identiconSeed("native-usdc"), identiconSeed("native-usdc"));
  assert.notEqual(identiconSeed("client-a"), identiconSeed("client-b"));
  assert.equal(isAddress(identiconSeed("native-usdc")), true);
});
