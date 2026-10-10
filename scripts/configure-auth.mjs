import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const credentials = JSON.parse(input);
if (typeof credentials.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email) || typeof credentials.password !== "string" || credentials.password.length < 12 || credentials.password.length > 1024) throw new Error("Enter a valid email and a password of 12–1024 characters");
const salt = randomBytes(16).toString("hex");
const encoded = `scrypt:${salt}:${scryptSync(credentials.password, salt, 64).toString("hex")}`;
let environment = readFileSync(".env.local", "utf8").replace(/^SETTLBOX_LOGIN_(?:EMAIL|PASSWORD_HASH)=.*\r?\n?/gm, "").trimEnd();
environment += `\nSETTLBOX_LOGIN_EMAIL=${credentials.email.trim().toLowerCase()}\nSETTLBOX_LOGIN_PASSWORD_HASH=${encoded}\n`;
writeFileSync(".env.local", environment);
console.log("Workspace sign-in configured. Restart Settlbox to load the credentials.");
