import solc from "solc";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const name = "SettlboxTreasuryVault";
const source = readFileSync(`contracts/${name}.sol`, "utf8");
const input = { language: "Solidity", sources: { [`${name}.sol`]: { content: source } }, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris", outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } } } };
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter(error => error.severity === "error") || [];
if (errors.length) throw new Error(errors.map(error => error.formattedMessage).join("\n"));
const contract = output.contracts[`${name}.sol`][name];
mkdirSync("contracts/artifacts", { recursive: true });
writeFileSync(`contracts/artifacts/${name}.json`, JSON.stringify({ compiler: solc.version(), abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}`, deployedBytecode: `0x${contract.evm.deployedBytecode.object}` }, null, 2));
console.log("Settlbox treasury vault compiled");
