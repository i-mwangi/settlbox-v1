import { createHash } from "node:crypto";

export function circleHumanUserId(companyId: string, principalId: string) {
  return `settlbox-${createHash("sha256").update(JSON.stringify([companyId, principalId])).digest("hex").slice(0, 40)}`;
}

export async function circleHumanRequest(path: string, body?: unknown, userToken?: string) {
  const key = process.env.CIRCLE_USER_CONTROLLED_API_KEY || process.env.CIRCLE_API_KEY;
  if (!key) throw new Error("Circle API key is not configured");
  if (!path.startsWith("/v1/w3s/")) throw new Error("Invalid Circle API path");
  const response = await fetch(`https://api.circle.com${path}`, {
    method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(15000), cache: "no-store",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(userToken ? { "X-User-Token": userToken } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(`Circle wallet request failed (HTTP ${response.status}, code ${Number(result.code) || "unknown"})`);
    Object.assign(error, { status: response.status, code: result.code });
    throw error;
  }
  return result.data;
}

export function circleHumanSessionKey(cookie: string) {
  const token = cookie.split(";").map(value => value.trim()).find(value => value.startsWith("settlbox_operator="))?.slice(18);
  if (!token) throw new Error("Workspace session is required");
  return createHash("sha256").update(token).digest("hex");
}
