import { DatabaseSync } from "node:sqlite";
import { randomUUID, createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import Ajv from "ajv";
import { mcpFetch, mcpUrl } from "./mcp-network.ts";

export interface McpTool { name: string; description?: string; inputSchema: Record<string, unknown>; fingerprint: string }
export interface McpConnection { id: string; name: string; url: string; tokenEnv: string; tools: McpTool[]; enabledTools: string[]; revision: number }
export const toolFingerprint = (tool: { name: string; description?: string; inputSchema: unknown }) => createHash("sha256").update(JSON.stringify([tool.name, tool.description || "", tool.inputSchema])).digest("hex");
export function boundedMcpSchema(schema: unknown) {
  let nodes = 0;
  const visit = (value: unknown, depth: number) => {
    if (++nodes > 500 || depth > 12) throw new Error("External schema is too complex");
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (["$ref", "$dynamicRef", "pattern", "patternProperties"].includes(key)) throw new Error("External schema uses unsupported references or patterns");
      visit(item, depth + 1);
    }
  };
  if (JSON.stringify(schema).length > 16000) throw new Error("External schema is too large");
  visit(schema, 0);
}
export class McpConnectionRepository {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS mcp_connections(company TEXT NOT NULL,id TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(company,id))");
  }
  list(company: string): McpConnection[] { return this.db.prepare("SELECT record FROM mcp_connections WHERE company=? ORDER BY rowid DESC").all(company).map(row => JSON.parse(String(row.record))); }
  get(company: string, id: string) { return this.list(company).find(item => item.id === id); }
  save(company: string, value: unknown) {
    const input = value as McpConnection;
    if (!input || typeof input.name !== "string" || !input.name.trim() || input.name.length > 80 || typeof input.url !== "string" || typeof input.tokenEnv !== "string" || (input.tokenEnv && !/^SETTLBOX_MCP_[A-Z0-9_]+_TOKEN$/.test(input.tokenEnv))) throw new Error("Enter a name, HTTPS endpoint and optional MCP token environment name");
    const url = mcpUrl(input.url).href;
    const previous = input.id ? this.get(company, input.id) : undefined;
    if (input.id && !previous) throw new Error("Connection not found");
    if (previous && input.revision !== previous.revision) throw new Error("Connection changed. Refresh before saving.");
    if (!previous && this.list(company).length >= 10) throw new Error("At most 10 MCP connections are supported");
    const same = previous?.url === url && previous?.tokenEnv === input.tokenEnv;
    const tools = same ? previous!.tools : [];
    const enabledTools = same && Array.isArray(input.enabledTools) ? input.enabledTools : [];
    if (enabledTools.some(name => !tools.some(tool => tool.name === name))) throw new Error("Discover tools before enabling them");
    const record: McpConnection = { id: previous?.id || randomUUID(), name: input.name.trim(), url, tokenEnv: input.tokenEnv, tools, enabledTools: [...new Set(enabledTools)], revision: (previous?.revision || 0) + 1 };
    this.db.prepare("INSERT INTO mcp_connections VALUES(?,?,?) ON CONFLICT(company,id) DO UPDATE SET record=excluded.record").run(company, record.id, JSON.stringify(record));
    return record;
  }
  discover(company: string, previous: McpConnection, tools: McpTool[]) {
    const record = { ...previous, tools, enabledTools: previous.enabledTools.filter(name => tools.some(tool => tool.name === name && previous.tools.some(old => old.name === name && old.fingerprint === tool.fingerprint))), revision: previous.revision + 1 };
    const changed = this.db.prepare("UPDATE mcp_connections SET record=? WHERE company=? AND id=? AND record=?").run(JSON.stringify(record), company, previous.id, JSON.stringify(previous));
    if (changed.changes !== 1) throw new Error("Connection changed; refresh before discovering tools again");
    return record;
  }
  remove(company: string, id: string) { this.db.prepare("DELETE FROM mcp_connections WHERE company=? AND id=?").run(company, id); }
  close() { this.db.close(); }
}
export function openMcpConnections() { const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite"); mkdirSync(dirname(path), { recursive: true }); return new McpConnectionRepository(path); }

export async function withMcp<T>(connection: McpConnection, work: (client: Client) => Promise<T>, customFetch?: typeof fetch) {
  const token = connection.tokenEnv ? process.env[connection.tokenEnv] : undefined;
  if (connection.tokenEnv && !token) throw new Error("The MCP server token is not configured on the application server");
  const transport = new StreamableHTTPClientTransport(new URL(connection.url), { fetch: customFetch || mcpFetch(connection.url), requestInit: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined });
  const client = new Client({ name: "settlbox", version: "1.0.0" });
  try { await client.connect(transport); return await work(client); }
  finally { await client.close().catch(() => undefined); }
}
export async function discoverMcp(connection: McpConnection, customFetch?: typeof fetch) {
  return withMcp(connection, currentMcpTools, customFetch);
}
async function currentMcpTools(client: Client) {
    const tools: McpTool[] = []; let cursor: string | undefined; const cursors = new Set<string>();
    do {
      const page = await client.listTools(cursor ? { cursor } : undefined);
      for (const tool of page.tools) {
        if (tools.length >= 100 || JSON.stringify(tool).length > 16000 || !/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name)) throw new Error("MCP tool catalog exceeds supported limits");
        if (tools.some(item => item.name === tool.name)) throw new Error("MCP server returned duplicate tool names");
        tools.push({ name: tool.name, description: tool.description?.slice(0, 1000), inputSchema: tool.inputSchema, fingerprint: toolFingerprint(tool) });
      }
      cursor = page.nextCursor;
      if (cursor) { if (cursors.has(cursor) || cursors.size >= 10) throw new Error("MCP pagination did not terminate"); cursors.add(cursor); }
    } while (cursor);
    return tools;
}
export async function callMcp(connection: McpConnection, name: string, args: Record<string, unknown>, fingerprint: string, customFetch?: typeof fetch, stillEnabled: () => boolean = () => true) {
  const saved = connection.tools.find(tool => tool.name === name);
  if (!saved || !connection.enabledTools.includes(name) || saved.fingerprint !== fingerprint) throw new Error("This external tool is no longer enabled with the reviewed definition");
  boundedMcpSchema(saved.inputSchema);
  const ajv = new Ajv({ strict: false, allErrors: false, validateFormats: false });
  if (!ajv.validate(saved.inputSchema, args)) throw new Error("External tool arguments do not match its schema");
  return withMcp(connection, async client => {
    // Recheck the remote declaration immediately before calling; a changed schema needs fresh consent.
    const current = (await currentMcpTools(client)).find(tool => tool.name === name);
    if (!current || current.fingerprint !== fingerprint) throw new Error("The external tool changed. Discover it again in Settings.");
    if (!stillEnabled()) throw new Error("The external tool was disabled before submission");
    const result = await client.callTool({ name, arguments: args });
    const text = (result.content || []).filter(item => item.type === "text").map(item => "text" in item ? String(item.text) : "").join("\n").slice(0, 20000);
    return { source: connection.name, tool: name, isError: Boolean(result.isError), text: tokenRedacted(text, connection.tokenEnv) };
  }, customFetch);
}
function tokenRedacted(text: string, env: string) { const token = env && process.env[env]; return token ? text.replaceAll(token, "[redacted]") : text; }
