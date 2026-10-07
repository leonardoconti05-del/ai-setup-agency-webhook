import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeAction, executeGovernedAction } from '../lib/governance/action-gateway.js';

function ctx(overrides = {}) {
  return {
    cliente_id: '00000000-0000-0000-0000-000000000001',
    actor: 'agent:whatsapp',
    agent: 'whatsapp',
    request_id: '00000000-0000-0000-0000-000000000002',
    authorization_source: 'twilio-server',
    server_derived: true,
    ...overrides,
  };
}

function db({ agent = [{ agent_id: 'whatsapp', attivo: true }], action = [{ action_id: 'reply', active: true, required_autonomy: 3, approval_required: false, executor: 'whatsapp.reply', executor_version: '1', risk_level: 'low', metadata: { agent: 'whatsapp' } }], policy = [] } = {}) {
  const f = async (url, opts = {}) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/agent_registry')) return { ok: true, status: 200, json: async () => agent };
    if (u.pathname.endsWith('/action_registry')) {
      const requested = u.searchParams.get('action_id')?.replace('eq.', '');
      if (requested && action.length > 0 && action[0]?.action_id && requested !== action[0].action_id) {
        return { ok: true, status: 200, json: async () => [] };
      }
      return { ok: true, status: 200, json: async () => action };
    }
    if (u.pathname.endsWith('/tenant_action_policy')) return { ok: true, status: 200, json: async () => policy };
    if (u.pathname.endsWith('/approval_requests')) return { ok: true, status: 201, json: async () => [{ id: 'approval-1' }] };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return f;
}

describe('Action Gateway', () => {
  test('unknown action is denied', async () => {
    const r = await authorizeAction({ tenantContext: ctx(), action: 'unknown', SUPABASE_URL: 'https://s.test', headers: { Authorization: 'Bearer x' }, fetchImpl: db() });
    assert.equal(r.verdict, 'DENY');
    assert.equal(r.reason, 'unknown_action');
  });

  test('unknown agent is denied', async () => {
    const r = await authorizeAction({ tenantContext: ctx({ agent: 'evil-agent' }), action: 'reply', SUPABASE_URL: 'https://s.test', headers: { Authorization: 'Bearer x' }, fetchImpl: db({ agent: [] }) });
    assert.equal(r.verdict, 'DENY');
    assert.equal(r.reason, 'unknown_agent');
  });

  test('inactive action and inactive agent are denied', async () => {
    assert.equal((await authorizeAction({ tenantContext: ctx(), action: 'reply', SUPABASE_URL: 'https://s.test', headers: { Authorization: 'Bearer x' }, fetchImpl: db({ action: [{ action_id: 'reply', active: false, required_autonomy: 3 }] }) })).reason, 'inactive_action');
    assert.equal((await authorizeAction({ tenantContext: ctx(), action: 'reply', SUPABASE_URL: 'https://s.test', headers: { Authorization: 'Bearer x' }, fetchImpl: db({ agent: [{ agent_id: 'whatsapp', attivo: false }] }) })).reason, 'inactive_agent');
  });

  test('missing tenant and model-controlled tenant are denied', async () => {
    assert.equal((await authorizeAction({ tenantContext: null, action: 'reply', SUPABASE_URL: 'https://s.test', headers: { Authorization: 'Bearer x' }, fetchImpl: db() })).reason, 'tenant_context_incomplete');
    assert.equal((await authorizeAction({ tenantContext: ctx({ server_derived: false }), action: 'reply', SUPABASE_URL: 'https://s.test', headers: { Authorization: 'Bearer x' }, fetchImpl: db() })).reason, 'tenant_context_not_server_derived');
  });

  test('tenant policy cannot elevate an action above its registry requirement', async () => {
    const policy = [{ agent_id: 'whatsapp', action: 'reply', autonomy_level: 2, condizioni: {} }];
    const r = await authorizeAction({ tenantContext: ctx(), action: 'reply', SUPABASE_URL: 'https://s.test', headers: { Authorization: 'Bearer x' }, fetchImpl: db({ policy }) });
    assert.equal(r.verdict, 'DENY');
    assert.equal(r.reason, 'insufficient_autonomy');
  });

  test('registered action cannot be invoked by the wrong agent', async () => {
    const action=[{ action_id:'reply',active:true,required_autonomy:3,approval_required:false,executor:'whatsapp.reply',executor_version:'1',risk_level:'low',metadata:{agent:'whatsapp'} }];
    const r=await authorizeAction({tenantContext:ctx({agent:'followup'}),action:'reply',SUPABASE_URL:'https://s.test',headers:{Authorization:'Bearer x'},fetchImpl:db({action,agent:[{agent_id:'followup',attivo:true}]})});
    assert.equal(r.verdict,'DENY');
    assert.equal(r.reason,'action_agent_mismatch');
  });

  test('model-controlled cross-tenant payload is denied', async () => {
    const r=await authorizeAction({tenantContext:ctx(),action:'reply',payload:{cliente_id:'00000000-0000-0000-0000-000000000999'},SUPABASE_URL:'https://s.test',headers:{Authorization:'Bearer x'},fetchImpl:db()});
    assert.equal(r.verdict,'DENY');
    assert.equal(r.reason,'payload_tenant_mismatch');
  });

  test('approval is required before execution', async () => {
    const action=[{ action_id:'reply',active:true,required_autonomy:3,approval_required:true,executor:'whatsapp.reply',executor_version:'1',risk_level:'medium' }];
    let executed=false;
    const r=await executeGovernedAction({tenantContext:ctx(),action:'reply',SUPABASE_URL:'https://s.test',headers:{Authorization:'Bearer x'},fetchImpl:db({action}),execute:async()=>{executed=true;},executorId:'whatsapp.reply'});
    assert.equal(r.verdict,'REQUIRE_APPROVAL');
    assert.equal(r.approval_id,'approval-1');
    assert.equal(executed,false);
  });

  test('executor runs only after ALLOW and is auditable', async () => {
    const ledger=[];
    let executed=false;
    const r=await executeGovernedAction({tenantContext:ctx(),action:'reply',SUPABASE_URL:'https://s.test',headers:{Authorization:'Bearer x'},fetchImpl:db(),ledger:async(e)=>ledger.push(e),execute:async({executor})=>{executed=executor==='whatsapp.reply';return {sent:true};},executorId:'whatsapp.reply'});
    assert.equal(r.verdict,'ALLOW');
    assert.equal(r.executed,true);
    assert.equal(executed,true);
    assert.equal(ledger.length,1);
    assert.equal(ledger[0].result,'ok');
  });

  test('executor failure is audited and never reclassified as success', async () => {
    const ledger=[];
    const r=await executeGovernedAction({tenantContext:ctx(),action:'reply',SUPABASE_URL:'https://s.test',headers:{Authorization:'Bearer x'},fetchImpl:db(),ledger:async(e)=>ledger.push(e),execute:async()=>{throw new Error('provider down');},executorId:'whatsapp.reply'});
    assert.equal(r.executed,false);
    assert.equal(r.error,'provider down');
    assert.equal(ledger.at(-1).result,'error');
  });
});


describe('executor binding', () => {
  test('unregistered executor cannot execute', async () => {
    const ledger=[];
    const r=await executeGovernedAction({tenantContext:ctx(),action:'reply',SUPABASE_URL:'https://s.test',headers:{Authorization:'Bearer x'},fetchImpl:db(),ledger:async(e)=>ledger.push(e),execute:async()=>({sent:true}),executorId:'wrong.executor'});
    assert.equal(r.verdict,'DENY');
    assert.equal(r.reason,'executor_not_authorized');
    assert.equal(ledger.at(-1).result,'denied:executor_not_authorized');
  });
});
