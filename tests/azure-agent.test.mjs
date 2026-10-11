import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewAgentPlan } from '../services/server/azure-agent.ts';

test('Azure review preserves policy decisions, minimizes input and rejects failed responses', async () => {
  const names=['SETTLBOX_AI_PROVIDER','AZURE_OPENAI_ENDPOINT','AZURE_OPENAI_DEPLOYMENT','AZURE_OPENAI_API_KEY'];
  const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  Object.assign(process.env,{SETTLBOX_AI_PROVIDER:'azure',AZURE_OPENAI_ENDPOINT:'https://test.openai.azure.com',AZURE_OPENAI_DEPLOYMENT:'finance',AZURE_OPENAI_API_KEY:'test-key'});
  const plan={mode:'proposal_only',engine:'deterministic',balanceUsdc:'1',reserveUsdc:'0.5',obligationsUsdc:'0.1',unallocatedUsdc:'0.4',actions:[{recordId:'private-id',title:'Private employee',kind:'bill',amountUsdc:'0.1',dueDate:'2026-10-11',disposition:'blocked',reasons:['Payment limit exceeded'],tool:'review_payment'}]};
  try {
    const result=await reviewAgentPlan(plan,async (url,options)=>{
      assert.equal(url.pathname,'/openai/v1/responses');
      const payload=JSON.parse(options.body);
      assert.equal(payload.store,false);
      assert.equal(payload.tools,undefined);
      assert.ok(!payload.input.includes('private-id'));
      assert.ok(!payload.input.includes('Private employee'));
      return Response.json({status:'completed',id:'resp_test',model:'finance',output:[{type:'message',content:[{type:'output_text',text:'Review blocked obligations.'}]}]});
    });
    assert.deepEqual(result.actions,plan.actions);
    assert.equal(result.aiReview.responseId,'resp_test');
    assert.equal(plan.aiReview,undefined);
    await assert.rejects(reviewAgentPlan(plan,async()=>new Response('secret-provider-error',{status:429})),/HTTP 429/);
    await assert.rejects(reviewAgentPlan(plan,async()=>Response.json({status:'incomplete'})),/incomplete review/);
    process.env.AZURE_OPENAI_ENDPOINT='https://attacker.example';
    await assert.rejects(reviewAgentPlan(plan,async()=>{throw Error('must not send credential');}),/Azure HTTPS/);
  } finally {
    for(const name of names) if(previous[name]===undefined) delete process.env[name]; else process.env[name]=previous[name];
  }
});
