import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";

const source = readFileSync(".env.local", "utf8");
const email = process.env.MAIL;
const rawPassword = source.match(/^\s*PASSWORD\s*=(.*)$/m)?.[1].trim();
const password = rawPassword && ((rawPassword.startsWith('"') && rawPassword.endsWith('"')) || (rawPassword.startsWith("'") && rawPassword.endsWith("'"))) ? rawPassword.slice(1, -1) : rawPassword;
if (!email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) throw new Error("A valid MAIL and PASSWORD of at least eight characters are required");
const salt = randomBytes(16).toString("hex");
const digest = scryptSync(password, salt, 64).toString("hex");
const environment = source.replace(/^\s*(?:MAIL|PASSWORD|SETTLBOX_LOGIN_EMAIL|SETTLBOX_LOGIN_PASSWORD_HASH)=.*\r?\n?/gm, "").trimEnd();
writeFileSync(".env.local", `${environment}\nSETTLBOX_LOGIN_EMAIL=${email.trim().toLowerCase()}\nSETTLBOX_LOGIN_PASSWORD_HASH=scrypt:${salt}:${digest}\n`);
console.log("Workspace email configured; password stored as a hash.");
