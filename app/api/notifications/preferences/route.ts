import { requireOperatorSession,requireSameOrigin } from "@/services/server/operator-session";
import { openNotifications } from "@/services/server/notifications";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
export const runtime="nodejs";
async function handle(request:Request){
  const headers={"Cache-Control":"no-store"};let canEdit=false;
  try {
    const principal=requireOperatorSession(request);canEdit=principal.role==="OWNER" || principal.role==="ADMIN";
    if(request.method!=="GET"){requireSameOrigin(request);if(!canEdit)return Response.json({error:"Owner or admin access is required"},{status:403,headers});}
  }catch{return Response.json({error:"Workspace authorization is required"},{status:401,headers});}
  const repository=openNotifications();
  try {
    const company=readTreasuryConfiguration().wallet.companyId;
    const preferences=request.method==="GET"?repository.preferences(company):repository.savePreferences(company,await request.json());
    return Response.json({preferences,canEdit,deliveryConfigured:false},{headers});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Preferences could not be saved"},{status:409,headers});}
  finally{repository.close();}
}
export const GET=handle;
export const PATCH=handle;
