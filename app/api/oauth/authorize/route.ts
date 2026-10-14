import {requireOperatorSession,requireSameOrigin} from "@/services/server/operator-session";
import {readTreasuryConfiguration} from "@/services/server/treasury-runtime";
import {openMcpOAuth,parseScopes} from "@/services/server/mcp-oauth";
import {oauthBody} from "@/services/server/oauth-http";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer"};
async function handle(request:Request){let owner;try{owner=requireOperatorSession(request);if(owner.role!=="OWNER")return Response.json({error:"Company owner required"},{status:403,headers});if(request.method==="POST")requireSameOrigin(request);}catch{return Response.json({error:"Sign in as company owner"},{status:401,headers});}
  const store=openMcpOAuth();try{const company=readTreasuryConfiguration().wallet.companyId;if(owner.companyId&&owner.companyId!==company)throw new Error("Company mismatch");
    if(request.method==="GET"){const auth=store.authorization(new URL(request.url).searchParams);return Response.json({name:auth.client.name,callback:auth.redirect,scopes:auth.scopes,company},{headers});}
    if(request.headers.get("content-type")?.split(";")[0]!=="application/json")throw new Error();const body=JSON.parse(await oauthBody(request));
    if(typeof body.query!=="string"||body.query.length>6000||!["allow","deny"].includes(body.decision)||!Array.isArray(body.scopes)||body.scopes.some((scope:unknown)=>typeof scope!=="string")||Object.keys(body).some(key=>!["query","decision","scopes"].includes(key)))throw new Error();
    const scopes=body.decision==="allow"?parseScopes(body.scopes.join(" ")):[];
    const redirect=store.consent(new URLSearchParams(body.query),{company,principal:owner.id,memberId:owner.memberId},scopes,body.decision==="allow");return Response.json({redirect},{headers});
  }catch{return Response.json({error:"Invalid or unsupported authorization request"},{status:400,headers});}finally{store.close();}}
export const GET=handle;export const POST=handle;
