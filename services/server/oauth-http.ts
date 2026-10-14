export async function oauthBody(request:Request) {
  const reader=request.body?.getReader();if(!reader)throw new Error("invalid_request");const chunks:Uint8Array[]=[];let bytes=0;
  while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>8192){await reader.cancel();throw new Error("invalid_request");}chunks.push(chunk.value);}return Buffer.concat(chunks).toString("utf8");
}
export const oauthHeaders={"Cache-Control":"no-store","Pragma":"no-cache","Access-Control-Allow-Origin":"*"};
