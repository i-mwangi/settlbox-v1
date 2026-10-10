import test from "node:test";
import assert from "node:assert/strict";
import { createCircleWalletService } from "../services/server/circle-wallets.ts";

test("company disbursement refuses a mainnet configuration", () => {
  const previous = process.env.NEXT_PUBLIC_ARC_ENVIRONMENT;
  process.env.NEXT_PUBLIC_ARC_ENVIRONMENT = "mainnet";
  try { assert.throws(createCircleWalletService, /restricted to Arc Testnet/); }
  finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ARC_ENVIRONMENT;
    else process.env.NEXT_PUBLIC_ARC_ENVIRONMENT = previous;
  }
});

test("Circle integration fails explicitly when credentials are absent", () => {
  const previousKey = process.env.CIRCLE_API_KEY;
  const previousSecret = process.env.CIRCLE_ENTITY_SECRET;
  delete process.env.CIRCLE_API_KEY;
  delete process.env.CIRCLE_ENTITY_SECRET;
  try { assert.throws(createCircleWalletService, /key and registered entity secret/); }
  finally {
    if (previousKey !== undefined) process.env.CIRCLE_API_KEY = previousKey;
    if (previousSecret !== undefined) process.env.CIRCLE_ENTITY_SECRET = previousSecret;
  }
});
