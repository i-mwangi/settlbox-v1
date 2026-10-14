export type BalancePeriod = "minute" | "hour" | "day" | "week" | "month" | "year";
export function balanceSeries(observations: {observedAt:string;amount:string}[], period:BalancePeriod, now:number) {
 const start=new Date(now);
 if(period==="minute")start.setTime(now-60000);
 else if(period==="hour")start.setTime(now-3600000);
 else {start.setHours(0,0,0,0);if(period==="week")start.setDate(start.getDate()-(start.getDay()+6)%7);if(period==="month")start.setDate(1);if(period==="year"){start.setMonth(0);start.setDate(1);}}
 const points=observations.map(row=>({time:Date.parse(row.observedAt),USDC:Number(row.amount),USDC__bal:Number(row.amount)})).filter(row=>Number.isFinite(row.time)&&Number.isFinite(row.USDC)&&row.time>=start.getTime()&&row.time<=now).sort((a,b)=>a.time-b.time);
 const end=now;const beginning=points.length?Math.max(start.getTime(),Math.min(points[0].time,end-60000)):start.getTime();
 const span=Math.max(1000,end-beginning);
 const steps=[10000,30000,60000,300000,900000,1800000,3600000,10800000,21600000,86400000,604800000,2592000000];
 const step=steps.find(value=>value>=span/6)||2592000000;
 const ticks=[];for(let t=Math.ceil(beginning/step)*step;t<=end;t+=step)ticks.push(t);
 const label=(value:number)=>new Date(value).toLocaleString(undefined,span<=120000?{minute:"2-digit",second:"2-digit"}:span<=86400000?{hour:"numeric",minute:"2-digit"}:span<=45*86400000?{month:"short",day:"numeric"}:{month:"short",year:"2-digit"});
 return {points,domain:[beginning,end] as [number,number],ticks,label,start:start.getTime()};
}
