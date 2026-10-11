import { requireOperatorSession } from "@/services/server/operator-session";
import { readUsycPosition } from "@/services/server/usyc";
export const runtime="nodejs";
export async function GET(request:Request) {
  const headers={"Cache-Control":"no-store"};
  try {requireOperatorSession(request);} catch {return Response.json({error:"Sign in to your workspace"},{status:401,headers});}
  try {return Response.json(await readUsycPosition(),{headers});}
  catch {return Response.json({error:"USYC chain data is unavailable. Refresh to retry; no balance estimate or entitlement has been assumed."},{status:503,headers});}
}
