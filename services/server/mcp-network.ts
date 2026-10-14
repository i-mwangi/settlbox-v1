import { lookup } from "node:dns/promises";
import type { LookupFunction } from "node:net";
import { request as httpsRequest } from "node:https";
import { Readable, Transform } from "node:stream";
import ipaddr from "ipaddr.js";

export function publicAddress(address: string) {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}
export function mcpUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search || (url.port && url.port !== "443")) throw new Error("Use a public HTTPS MCP endpoint without credentials or query parameters");
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost") || (ipaddr.isValid(url.hostname.replace(/^\[|\]$/g, "")) && !publicAddress(url.hostname.replace(/^\[|\]$/g, "")))) throw new Error("Private network MCP endpoints are not permitted");
  return url;
}

export function pinnedMcpLookup(address: string, family: number): LookupFunction {
  if (!publicAddress(address) || ![4, 6].includes(family)) throw new Error("Invalid public MCP address");
  return (_host, options, done) => {
    if (options.all) done(null, [{ address, family }]);
    else done(null, address, family);
  };
}

// Pin the validated DNS answer to the socket; redirects never carry credentials elsewhere.
export function mcpFetch(endpoint: string): typeof fetch {
  const expected = mcpUrl(endpoint);
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = mcpUrl(input instanceof Request ? input.url : String(input));
    if (url.href !== expected.href) throw new Error("MCP requests must stay on the configured endpoint");
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error("MCP endpoint resolves to a private network");
    const pinned = addresses[0];
    const signal = AbortSignal.any([AbortSignal.timeout(30000), ...(init?.signal ? [init.signal] : [])]);
    return new Promise<Response>((resolve, reject) => {
      const headers = Object.fromEntries(new Headers(init?.headers).entries());
      const request = httpsRequest(url, { method: init?.method || "GET", headers, signal, agent: false, lookup: pinnedMcpLookup(pinned.address, pinned.family) }, response => {
        if ((response.statusCode || 0) >= 300 && (response.statusCode || 0) < 400) { response.destroy(); reject(new Error("MCP redirects are not permitted")); return; }
        let bytes = 0;
        const bounded = new Transform({ transform(chunk, _encoding, done) { bytes += chunk.length; if (bytes > 1024 * 1024) done(new Error("MCP response exceeds the size limit")); else done(null, chunk); } });
        response.on("error", error => bounded.destroy(error));
        response.pipe(bounded);
        const resultHeaders = new Headers();
        for (const [key, value] of Object.entries(response.headers)) if (value) resultHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
        resolve(new Response([204, 205, 304].includes(response.statusCode || 0) ? null : Readable.toWeb(bounded) as ReadableStream, { status: response.statusCode || 502, headers: resultHeaders }));
      });
      request.on("error", reject);
      if (init?.body !== undefined && init.body !== null) {
        if (typeof init.body !== "string") { request.destroy(); reject(new Error("Unsupported MCP request body")); return; }
        request.write(init.body);
      }
      request.end();
    });
  }) as typeof fetch;
}
