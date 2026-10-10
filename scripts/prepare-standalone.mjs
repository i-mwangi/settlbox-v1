import { cpSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(".next/standalone");
for (const entry of readdirSync(directory, { withFileTypes: true })) {
  if (entry.isFile() && /^\.env(?:\.|$)/.test(entry.name)) unlinkSync(resolve(directory, entry.name));
}
mkdirSync(resolve(directory, ".next"), { recursive: true });
cpSync(resolve("public"), resolve(directory, "public"), { recursive: true });
cpSync(resolve(".next/static"), resolve(directory, ".next/static"), { recursive: true });
