import { oauthIssuer, oauthScopes } from "@/services/server/mcp-oauth";
export const dynamic="force-dynamic";
export async function GET(){const issuer=oauthIssuer();return Response.json({resource:`${issuer}/api/mcp`,authorization_servers:[issuer],scopes_supported:oauthScopes,bearer_methods_supported:["header"]},{headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});}
