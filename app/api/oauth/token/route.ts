import {openMcpOAuth} from "@/services/server/mcp-oauth";
import {oauthBody,oauthHeaders} from "@/services/server/oauth-http";
import {readTreasuryConfiguration} from "@/services/server/treasury-runtime";
import {openTeamMembers} from "@/services/server/team-members";
export const runtime="nodejs";
export async function POST(request:Request){const store=openMcpOAuth();try{
  if(request.headers.get("content-type")?.split(";")[0]!=="application/x-www-form-urlencoded")throw new Error("invalid_request");
  const result=store.token(new URLSearchParams(await oauthBody(request)),request.headers.get("authorization"),owner=>{
    if(owner.company!==readTreasuryConfiguration().wallet.companyId)throw new Error("invalid_grant");
    if(owner.memberId){const members=openTeamMembers();try{const member=members.get(owner.company,owner.memberId);if(!member||member.status!=="ACTIVE"||member.role!=="OWNER")throw new Error("invalid_grant");}finally{members.close();}}
  });return Response.json(result,{headers:oauthHeaders});
}catch(e){const error=e instanceof Error&&["invalid_client","invalid_grant","invalid_scope","unsupported_grant_type","invalid_request"].includes(e.message)?e.message:"invalid_request";return Response.json({error},{status:error==="invalid_client"?401:400,headers:oauthHeaders});}finally{store.close();}}
