const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const {chromium}=require('@playwright/test');
const actor='00000000-0000-4000-8000-000000000001';
(async()=>{
 const code=Object.fromEntries([['store','src/lib/listings/draft-store.ts'],['validation','src/lib/listings/validation.ts']].map(([key,file])=>[key,ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText]));
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
 try{
  const context=await browser.newContext(),page=await context.newPage();await page.goto('https://appartement-tinder.vercel.app/en/login');
  async function load(target){await target.evaluate(code=>{const cache={};function module(name){if(cache[name])return cache[name].exports;const value={exports:{}};cache[name]=value;new Function('require','module','exports',code[name])(id=>{if(id==='./validation')return module('validation');throw Error('Unexpected store dependency');},value,value.exports);return value.exports;}window.qaStore=module('store');},code);}
  await page.evaluate(async actor=>{
   const open=indexedDB.open('shutaf-listing-drafts',1);open.onupgradeneeded=()=>open.result.createObjectStore('drafts');const db=await new Promise((resolve,reject)=>{open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});window.qaOldDb=db;
   const file=new File([new Uint8Array([1,2,3,4])],'synthetic.png',{type:'image/png',lastModified:1234});const source={version:1,title:'Preserve version 1 input',bedrooms:'',availableFrom:'',billsIncluded:false,description:'',roomPrices:[],address:null,requestKey:null,photos:[file]};
   await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(source,actor);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  },actor);
  await load(page);const blocked=await page.evaluate(async actor=>{try{await window.qaStore.loadListingDraft(actor);return false;}catch(error){return error.message.includes('blocked');}},actor);assert.equal(blocked,true);
  await page.evaluate(()=>window.qaOldDb.close());const loaded=await page.evaluate(async actor=>{const source=await window.qaStore.loadListingDraft(actor);return {title:source.title,name:source.photos[0].name,modified:source.photos[0].lastModified,bytes:Array.from(new Uint8Array(await source.photos[0].arrayBuffer()))};},actor);
  assert.deepEqual(loaded,{title:'Preserve version 1 input',name:'synthetic.png',modified:1234,bytes:[1,2,3,4]});console.log('PASS blocked version upgrade recovers and preserves version-1 fields/File bytes');
  const first=await page.evaluate(async actor=>{const ticket=await window.qaStore.claimLegacyDraftImport(actor);return {key:ticket.receipt.requestKey,ids:ticket.receipt.objectIds,revision:ticket.sourceRevision};},actor);assert(first.revision);
  const second=await context.newPage();await second.goto('https://appartement-tinder.vercel.app/en/login');await load(second);
  const concurrent=await Promise.all([page,second].map(target=>target.evaluate(async actor=>{const ticket=await window.qaStore.claimLegacyDraftImport(actor);return {key:ticket.receipt.requestKey,ids:ticket.receipt.objectIds};},actor)));
  for(const ticket of concurrent){assert.equal(ticket.key,first.key);assert.deepEqual(ticket.ids,first.ids);}console.log('PASS two real tabs claim one durable import receipt and photo identity set');
  await page.reload();await load(page);const after=await page.evaluate(async actor=>{const ticket=await window.qaStore.claimLegacyDraftImport(actor);return {key:ticket.receipt.requestKey,ids:ticket.receipt.objectIds,revision:ticket.sourceRevision};},actor);assert.deepEqual(after,first);console.log('PASS receipt and source revision survive reload without losing the local source');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
