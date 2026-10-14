import {openMcpOAuth} from "@/services/server/mcp-oauth";
import {oauthBody,oauthHeaders} from "@/services/server/oauth-http";
export const runtime="nodejs";
export async function POST(request:Request){const store=openMcpOAuth();try{if(request.headers.get("content-type")?.split(";")[0]!=="application/json")throw new Error("invalid_client_metadata");const body=JSON.parse(await oauthBody(request));if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("invalid_client_metadata");return Response.json(store.register(body),{status:201,headers:oauthHeaders});}catch(e){return Response.json({error:e instanceof Error&&e.message==="registration_limit"?"temporarily_unavailable":"invalid_client_metadata"},{status:400,headers:oauthHeaders});}finally{store.close();}}
