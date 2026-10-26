import { test, expect, type Browser, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import type { Database } from '../src/types/database';
import { validatePool, beginScenario, recordScenarioResource, saveScenario, cleanupScenario } from '../scripts/qa-pool.mjs';

// No administrative credentials enter Playwright. The executing agent services
// private baseline/cleanup checkpoints through the authorized database connector.
// No successful receipt is inferred from a file's existence alone: its nonce,
// target/run identity and ordinary-client postconditions must all agree.
test.use({ trace: 'off', actionTimeout: 20_000 });
test('two real group admission runs preserve the prepared actors and recover cleanly', async ({ browser, baseURL }) => {
  test.setTimeout(600_000);
  const folder = process.env.QA_FIXTURE_DIRECTORY;
  expect(folder, 'Run through the existing room44 pool wrapper').toBe('.qa/room44-pool');
  expect(process.env.QA_FIXTURE_MANIFEST).toBe('.qa/room44-pool/accounts.json');
  const directory = folder!;
  const run = JSON.parse(await readFile(join(directory, 'run.json'), 'utf8'));
  const accounts: {id:string;email:string;password:string}[] = JSON.parse(await readFile(process.env.QA_FIXTURE_MANIFEST!, 'utf8'));
  const env = new Map((await readFile('.env.local', 'utf8')).split(/\r?\n/).flatMap(line=>{
    const match=line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1],match[2].replace(/^(['"])(.*)\1$/,'$2')]] : [];
  }));
  const target = env.get('NEXT_PUBLIC_SUPABASE_URL')!;
  expect(target).toBe('https://npbduvjnqnbydolmdpsc.supabase.co');
  validatePool(accounts, run, target);
  const url = baseURL!;
  const apiFor = () => createClient<Database>(target, env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!, {auth:{persistSession:false,autoRefreshToken:false}});
  const clients = accounts.map(() => apiFor());
  const index = (role:string) => accounts.findIndex(account=>account.id===run.actors[role]);
  const owner = clients[index('owner')], accepted = clients[index('accepted_requester')], pending = clients[index('pending_requester')];
  const path = join(directory,'scenario.json');
  const save = (journal:object) => saveScenario(path,journal);
  const results: object[] = [];
  const checkpoint = async (phase:string, iteration:number, payload:object = {}) => {
    const operation = randomUUID();
    await writeFile(join(directory,'qa-reuse-request.json'),JSON.stringify({operation,phase,iteration,target,...payload},null,2),{mode:0o600});
    console.log(`QA reuse: ${phase} checkpoint ${iteration}; awaiting executor connector receipt`);
    const receiptPath=join(directory,`qa-reuse-${phase}-${iteration}.json`);
    await expect.poll(async()=>{
      try { const value=JSON.parse(await readFile(receiptPath,'utf8'));return value.operation===operation && value.target===target ? value : null; }
      catch { return null; }
    },{timeout:180_000,intervals:[500,1000]}).not.toBeNull();
    const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
    expect(receipt.ok,'Privileged checkpoint failed; preserve the private journal').toBe(true);
    return receipt;
  };
  async function profileHash(client:typeof owner,id:string) {
    const data=await Promise.all([
      client.from('profiles').select('id,name,bio,mode,onboarded,photo_url').eq('id',id).single(),
      client.from('profile_private').select('full_name,birth_date,phone').eq('profile_id',id).single(),
      client.from('profile_lifestyle').select('facts,disclosed_fields,revision').eq('profile_id',id).single(),
      client.from('profile_lifestyle_private').select('preferences').eq('profile_id',id).single(),
      client.from('profile_photos').select('id,url,display_order').eq('profile_id',id).order('id'),
    ]);
    data.forEach(result=>expect(result.error).toBeNull());
    return createHash('sha256').update(JSON.stringify(data.map(result=>result.data))).digest('hex');
  }
  async function browserPage(browser:Browser, role:string, locale:string, width:number) {
    const account=accounts[index(role)]; const cookies:{name:string;value:string}[]=[];
    const auth=createServerClient(target,env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!,{auth:{autoRefreshToken:false},cookies:{getAll:()=>cookies,setAll:values=>{cookies.splice(0,cookies.length,...values);}}});
    expect((await auth.auth.signInWithPassword(account)).error).toBeNull();
    const context=await browser.newContext({viewport:{width,height:900}});
    await context.addCookies(cookies.map(({name,value})=>({name,value,url,sameSite:'Lax' as const})));
    return {page:await context.newPage(),context,auth,prefix:locale==='en'?'/en':''};
  }
  async function see(page:Page,message:string) { await expect(page.getByText(message,{exact:false})).toBeVisible(); }
  try {
    for (let i=0;i<clients.length;i++) expect((await clients[i].auth.signInWithPassword(accounts[i])).data.user?.id).toBe(accounts[i].id);
    const hashes=await Promise.all(clients.map((client,i)=>profileHash(client,accounts[i].id)));
    // An accepted personal contact is an explicitly retained precondition, not
    // mutable test data. Establish at most once and retain it in both snapshots.
    const contacts=await owner.rpc('list_group_contacts');expect(contacts.error).toBeNull();
    if(!contacts.data?.some(contact=>contact.id===run.actors.accepted_requester)) {
      const intro=await owner.rpc('send_introduction',{p_user:run.actors.accepted_requester,p_group:null,p_message:'QA reusable contact baseline',p_ref_tag:'bio'});
      expect(intro.error).toBeNull();
      const result=await accepted.rpc('accept_like',{p_like_id:intro.data!});expect(result.error).toBeNull();expect(result.data).toBeTruthy();
    }
    for (const iteration of [1,2]) {
      const receipt=await checkpoint('baseline',iteration);
      const journal=beginScenario(run,receipt.inventory);await save(journal);
      let conversation=''; let group='';
      try {
        const created=await owner.rpc('create_group_from_chats',{p_name:`QA reuse ${journal.run_id}`,p_contacts:[run.actors.accepted_requester],p_policy:'admin'});
        expect(created.error).toBeNull();conversation=created.data!;
        const row=await owner.from('conversations').select('group_id').eq('id',conversation).single();expect(row.error).toBeNull();group=row.data!.group_id!;
        await recordScenarioResource({journal,run,kind:'group',id:group,save});
        await recordScenarioResource({journal,run,kind:'conversation',id:conversation,save});
        const before=`QA private before admission ${iteration}`;
        expect((await owner.rpc('send_chat_message',{p_conversation_id:conversation,p_body:before,p_request_key:randomUUID()})).error).toBeNull();
        const denied=await pending.from('messages').select('id').eq('conversation_id',conversation);expect(denied.error).toBeNull();expect(denied.data).toEqual([]);
        expect((await pending.rpc('send_chat_message',{p_conversation_id:conversation,p_body:'must be denied',p_request_key:randomUUID()})).error).not.toBeNull();
        const invite=await accepted.from('group_invites').select('id').eq('group_id',group).single();expect(invite.error).toBeNull();
        expect((await accepted.rpc('respond_group_invite',{p_invite:invite.data!.id,p_accept:true})).data).toBe(conversation);
        const intro=await pending.rpc('send_introduction',{p_user:null,p_group:group,p_message:`QA group application ${iteration}`,p_ref_tag:'bio'});expect(intro.error).toBeNull();
        expect((await owner.rpc('decide_group_introduction',{p_like:intro.data!})).data).toBe(conversation);
        const roster=await owner.from('group_members').select('user_id').eq('group_id',group);expect(roster.error).toBeNull();
        expect(roster.data?.map(member=>member.user_id).sort()).toEqual([...run.ids].sort());
        const newcomerHistory=await pending.from('messages').select('body').eq('conversation_id',conversation);expect(newcomerHistory.error).toBeNull();
        expect(newcomerHistory.data?.some(message=>message.body===before)).toBe(false);
        const locale=iteration===1?'he':'en', width=iteration===1?390:1280;
        const member=await browserPage(browser,'pending_requester',locale,width);
        try {
          await member.page.goto(`${url}${member.prefix}/chats/${conversation}`);
          const message=`QA browser group message ${journal.run_id}`;
          await member.page.getByRole('textbox',{name:locale==='en'?'Message':'הודעה',exact:true}).fill(message);
          await member.page.getByRole('button',{name:locale==='en'?'Send message':'שליחת הודעה',exact:true}).click();
          await see(member.page,message);await member.page.reload();await see(member.page,message);
          const saved=await owner.from('messages').select('body').eq('conversation_id',conversation).eq('body',message);expect(saved.error).toBeNull();expect(saved.data).toHaveLength(1);
          await member.page.screenshot({path:join(directory,`qa-reuse-${iteration}.png`),fullPage:true});
        } finally {await member.context.close();await member.auth.auth.signOut({scope:'local'});}
      } catch (error) {
        await writeFile(join(directory,`qa-reuse-failure-${iteration}.json`),JSON.stringify({run_id:journal.run_id,message:error instanceof Error?error.message:String(error)},null,2),{mode:0o600});
        throw error;
      } finally {
        await cleanupScenario({journal,run,save,removeMedia:undefined,executeSql:async(sql:string)=>{
          await writeFile(join(directory,`qa-reuse-cleanup-${iteration}.sql`),sql,{mode:0o600});
          await checkpoint('cleanup',iteration,{run_id:journal.run_id,resources:journal.resources});
        }});
      }
      expect(journal.state).toBe('clean');
      for (const client of clients) {
        expect((await client.from('groups').select('id').eq('id',group)).data).toEqual([]);
        expect((await client.from('messages').select('id').eq('conversation_id',conversation)).data).toEqual([]);
      }
      for (let i=0;i<clients.length;i++) {
        expect(await profileHash(clients[i],accounts[i].id)).toBe(hashes[i]);
        expect((await clients[i].auth.signInWithPassword(accounts[i])).data.user?.id).toBe(accounts[i].id);
      }
      results.push({iteration,actor_ids:run.ids,run_id:journal.run_id,group_admission:true,browser_message:true,clean:true,profiles_preserved:true,credentials_preserved:true,outsider_denied:true});
      await writeFile(join(directory,'qa-reuse-receipts.json'),JSON.stringify(results,null,2),{mode:0o600});
      console.log(`QA reuse: run ${iteration} complete; same actors, profile hashes and credentials preserved`);
    }
  } finally {for(const client of clients)await client.auth.signOut({scope:'local'});}
});
