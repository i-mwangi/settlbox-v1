import {custom,fallback,http,type HttpTransportConfig} from "viem";

const methods=['eth_chainId','eth_blockNumber','eth_getCode','eth_getBalance','eth_call','eth_getLogs','eth_getTransactionReceipt','eth_getTransactionByHash','eth_getBlockByNumber','eth_getBlockByHash','eth_estimateGas','eth_gasPrice','eth_maxPriorityFeePerGas','eth_feeHistory','eth_getTransactionCount'];
export function arcReadTransport(options:Pick<HttpTransportConfig,'fetchFn'|'timeout'|'retryDelay'>={}){
 const primary=process.env.NEXT_PUBLIC_ARC_RPC_URL||'https://rpc.testnet.arc.io';
 const backup=process.env.SETTLBOX_ARC_BACKUP_RPC_URL||'https://rpc.drpc.testnet.arc.io';
 const urls=[...new Set([primary,backup])];
 for(const raw of urls){const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Arc read RPC must use HTTPS without embedded credentials');}
 return ((parameters)=>{
  const transport=fallback(urls.map(url=>http(url,{timeout:5000,retryCount:1,retryDelay:250,...options})),{retryCount:0,rank:false})(parameters);
  return custom({request:async(args)=>{
   if(!methods.includes(args.method))throw new Error('This RPC transport permits reads only');
   try{return await transport.request(args);}catch{throw new Error('Current Arc data is unavailable after retrying the primary and backup RPC. No new action was authorized. Retry the same request when the network recovers.');}
  }},{retryCount:0})(parameters);
 }) satisfies ReturnType<typeof custom>;
}
