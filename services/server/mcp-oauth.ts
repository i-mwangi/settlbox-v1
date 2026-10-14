import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { InboundMcpRepository, type McpScope } from "./inbound-mcp.ts";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const opaque = () => randomBytes(32).toString("base64url");
const equal = (a: string, b: string) => timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
export const oauthScopes = ["records:read", "actions:propose"] as const;
export function oauthIssuer() {
  const url = new URL(process.env.SETTLBOX_OAUTH_ISSUER || "http://127.0.0.1:3002");
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || !(url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error("Invalid OAuth issuer");
  return url.origin;
}
export function parseScopes(value: string): McpScope[] {
  const scopes = [...new Set(value.trim().split(/\s+/).filter(Boolean))];
  if (!scopes.length || scopes.some(scope => !oauthScopes.includes(scope as McpScope))) throw new Error("invalid_scope"); return scopes as McpScope[];
}
type Client = { id: string; name: string; redirects: string[]; method: string; secretHash?: string };
type Owner = { company: string; principal: string; memberId?: number };
type Grant = Owner & { id: string; client: string; name: string; resource: string; scopes: McpScope[]; expires: number; credential?: string; revoked?: boolean };
export class McpOAuthRepository {
  private db: DatabaseSync; private inbound: InboundMcpRepository;
  readonly issuer: string;
  constructor(path: string, issuer: string) {
    this.issuer = issuer;
    this.inbound = new InboundMcpRepository(path); this.inbound.close();
    this.db = new DatabaseSync(path); this.inbound = new InboundMcpRepository(path, this.db);
    this.db.exec("CREATE TABLE IF NOT EXISTS mcp_oauth_clients(id TEXT PRIMARY KEY,record TEXT,created INTEGER); CREATE TABLE IF NOT EXISTS mcp_oauth_codes(hash TEXT PRIMARY KEY,record TEXT,used INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS mcp_oauth_grants(id TEXT PRIMARY KEY,record TEXT); CREATE TABLE IF NOT EXISTS mcp_oauth_refresh(hash TEXT PRIMARY KEY,grant_id TEXT,used INTEGER DEFAULT 0)");
  }
  register(input: Record<string, unknown>) {
    if (Number(this.db.prepare("SELECT count(*) AS n FROM mcp_oauth_clients WHERE created>?").get(Date.now()-3600000)!.n)>=40 || Number(this.db.prepare("SELECT count(*) AS n FROM mcp_oauth_clients").get()!.n)>=1000) throw new Error("registration_limit");
    if (!Array.isArray(input.redirect_uris) || !input.redirect_uris.length || input.redirect_uris.length > 10) throw new Error("invalid_redirect_uri");
    const redirects = input.redirect_uris.map(value => {
      if (typeof value !== "string" || value.length > 1000) throw new Error("invalid_redirect_uri"); const url=new URL(value);
      if (url.username || url.password || url.hash || !(url.protocol==="https:" || url.protocol==="http:" && ["localhost","127.0.0.1","[::1]"].includes(url.hostname))) throw new Error("invalid_redirect_uri"); return value;
    });
    const method=String(input.token_endpoint_auth_method || "none"); if (!["none","client_secret_post","client_secret_basic"].includes(method)) throw new Error("invalid_client_metadata");
    if (input.grant_types && (!Array.isArray(input.grant_types) || input.grant_types.some(value=>!["authorization_code","refresh_token"].includes(String(value))))) throw new Error("invalid_client_metadata");
    if (input.response_types && (!Array.isArray(input.response_types) || input.response_types.some(value=>value!=="code"))) throw new Error("invalid_client_metadata");
    const name=typeof input.client_name==="string"?input.client_name.trim():"External MCP client"; if (!name || name.length>60) throw new Error("invalid_client_metadata");
    const secret=method==="none"?undefined:opaque();const client:Client={id:randomUUID(),name,redirects,method,secretHash:secret?hash(secret):undefined};
    this.db.prepare("INSERT INTO mcp_oauth_clients VALUES(?,?,?)").run(client.id,JSON.stringify(client),Date.now());
    return {client_id:client.id,client_name:name,redirect_uris:redirects,token_endpoint_auth_method:method,grant_types:["authorization_code","refresh_token"],response_types:["code"],...(secret?{client_secret:secret,client_secret_expires_at:0}:{})};
  }
  client(id:string):Client { const row=this.db.prepare("SELECT record FROM mcp_oauth_clients WHERE id=?").get(id);if(!row)throw new Error("invalid_client");return JSON.parse(String(row.record)); }
  authorization(params:URLSearchParams) {
    if ([...new Set(params.keys())].some(key=>params.getAll(key).length!==1)) throw new Error("invalid_request");
    const client=this.client(params.get("client_id")||"");const redirect=params.get("redirect_uri")||"";
    if(!client.redirects.includes(redirect))throw new Error("invalid_redirect_uri");
    const challenge=params.get("code_challenge")||"";const state=params.get("state")||"";const resource=params.get("resource")||`${this.issuer}/api/mcp`;
    if(params.get("response_type")!=="code" || params.get("code_challenge_method")!=="S256" || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || !state || state.length>2048 || resource!==`${this.issuer}/api/mcp`)throw new Error("invalid_request");
    return {client,redirect,challenge,state,resource,scopes:parseScopes(params.get("scope")||"records:read")};
  }
  consent(params:URLSearchParams,owner:Owner,scopes:McpScope[],allow:boolean) {
    const auth=this.authorization(params);const redirect=new URL(auth.redirect);redirect.searchParams.set("state",auth.state);redirect.searchParams.set("iss",this.issuer);
    if(!allow){redirect.searchParams.set("error","access_denied");return redirect.href;}
    if(!scopes.length || scopes.some(scope=>!auth.scopes.includes(scope)))throw new Error("invalid_scope");
    const grant:Grant={...owner,id:randomUUID(),client:auth.client.id,name:auth.client.name,resource:auth.resource,scopes,expires:Date.now()+30*86400000};
    const code=opaque();this.db.exec("BEGIN IMMEDIATE");try{
      this.db.prepare("INSERT INTO mcp_oauth_grants VALUES(?,?)").run(grant.id,JSON.stringify(grant));
      this.db.prepare("INSERT INTO mcp_oauth_codes(hash,record) VALUES(?,?)").run(hash(code),JSON.stringify({grant:grant.id,redirect:auth.redirect,challenge:auth.challenge,expires:Date.now()+120000}));this.db.exec("COMMIT");
    }catch(e){this.db.exec("ROLLBACK");throw e;}
    redirect.searchParams.set("code",code);return redirect.href;
  }
  authenticateClient(params:URLSearchParams,authorization:string|null) {
    let id=params.get("client_id")||"",secret=params.get("client_secret")||"",method=secret?"client_secret_post":"none";
    if(authorization){if(!authorization.startsWith("Basic ") || secret)throw new Error("invalid_client");const decoded=Buffer.from(authorization.slice(6),"base64").toString();const split=decoded.indexOf(":");if(split<0)throw new Error("invalid_client");const basicId=decodeURIComponent(decoded.slice(0,split));if(id&&id!==basicId)throw new Error("invalid_client");id=basicId;secret=decodeURIComponent(decoded.slice(split+1));method="client_secret_basic";}
    const client=this.client(id);if(client.method!==method || client.secretHash && !equal(client.secretHash,hash(secret)))throw new Error("invalid_client");return client;
  }
  private grant(id:string):Grant {const row=this.db.prepare("SELECT record FROM mcp_oauth_grants WHERE id=?").get(id);if(!row)throw new Error("invalid_grant");return JSON.parse(String(row.record));}
  private revoke(grant:Grant) {if(grant.credential)this.inbound.revoke(grant.company,grant.principal,grant.credential);this.db.prepare("UPDATE mcp_oauth_grants SET record=? WHERE id=?").run(JSON.stringify({...grant,revoked:true}),grant.id);}
  private mint(grant:Grant,checkOwner:(grant:Owner)=>void) {
    if(grant.revoked || grant.expires<=Date.now() || grant.resource!==`${this.issuer}/api/mcp`)throw new Error("invalid_grant");
    checkOwner(grant);
    if(grant.credential){const previous=this.inbound.list(grant.company,grant.principal).find(row=>row.id===grant.credential);if(!previous || previous.revoked)throw new Error("invalid_grant");this.inbound.revoke(grant.company,grant.principal,grant.credential);}
    const result=this.inbound.create(grant.company,grant.principal,`OAuth: ${grant.name}`,grant.scopes,grant.memberId,3600000,grant.resource);
    const refresh=opaque();this.db.prepare("UPDATE mcp_oauth_grants SET record=? WHERE id=?").run(JSON.stringify({...grant,credential:result.credential.id}),grant.id);this.db.prepare("INSERT INTO mcp_oauth_refresh(hash,grant_id) VALUES(?,?)").run(hash(refresh),grant.id);
    return {access_token:result.token,token_type:"Bearer",expires_in:3600,refresh_token:refresh,scope:grant.scopes.join(" ")};
  }
  token(params:URLSearchParams,authorization:string|null,checkOwner:(grant:Owner)=>void=()=>{}) {
    if([...new Set(params.keys())].some(key=>params.getAll(key).length!==1))throw new Error("invalid_request");const client=this.authenticateClient(params,authorization);
    this.inbound.consume(`oauth:${client.id}`);
    this.db.exec("BEGIN IMMEDIATE");let replay=false;
    try {
      let grant:Grant;const type=params.get("grant_type");
      if(type==="authorization_code") {
        const row=this.db.prepare("SELECT record,used FROM mcp_oauth_codes WHERE hash=?").get(hash(params.get("code")||""));if(!row)throw new Error("invalid_grant");const code=JSON.parse(String(row.record));grant=this.grant(code.grant);
        const verifier=params.get("code_verifier")||"";if(grant.client!==client.id || code.redirect!==params.get("redirect_uri") || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || createHash("sha256").update(verifier).digest("base64url")!==code.challenge || params.has("resource")&&params.get("resource")!==grant.resource)throw new Error("invalid_grant");
        if(row.used){this.revoke(grant);replay=true;throw new Error("invalid_grant");}if(code.expires<=Date.now())throw new Error("invalid_grant");
        this.db.prepare("UPDATE mcp_oauth_codes SET used=1 WHERE hash=?").run(hash(params.get("code")!));
      } else if(type==="refresh_token") {
        const row=this.db.prepare("SELECT grant_id,used FROM mcp_oauth_refresh WHERE hash=?").get(hash(params.get("refresh_token")||""));if(!row)throw new Error("invalid_grant");grant=this.grant(String(row.grant_id));
        if(grant.client!==client.id || params.has("resource")&&params.get("resource")!==grant.resource)throw new Error("invalid_grant");if(row.used){this.revoke(grant);replay=true;throw new Error("invalid_grant");}
        if(params.has("scope")){const scopes=parseScopes(params.get("scope")!);if(scopes.some(scope=>!grant.scopes.includes(scope)))throw new Error("invalid_scope");grant={...grant,scopes};}
        this.db.prepare("UPDATE mcp_oauth_refresh SET used=1 WHERE hash=?").run(hash(params.get("refresh_token")!));
      } else throw new Error("unsupported_grant_type");
      const result=this.mint(grant,checkOwner);this.db.exec("COMMIT");return result;
    } catch(e){this.db.exec(replay?"COMMIT":"ROLLBACK");throw e;}
  }
  close(){this.db.close();}
}
export const openMcpOAuth=()=>new McpOAuthRepository(resolve(process.env.SETTLBOX_BUSINESS_DATABASE||".data/business.sqlite"),oauthIssuer());
