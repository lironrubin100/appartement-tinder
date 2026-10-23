const fs=require('fs'),assert=require('node:assert/strict'),ts=require(process.cwd()+'/node_modules/typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file,dependencies={}) {
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const m={exports:{}};new Function('require','module','exports',code)(id=>id in dependencies?dependencies[id]:require(id),m,m.exports);return m.exports;
}
const {ListingDraftList}=load('src/components/listings/ListingDraftList.tsx',{'next/link':{__esModule:true,default:'a'}});
const items=Object.freeze([
 Object.freeze({id:'draft-a',title:' Private <home> ',updatedAt:'2026-10-23T00:00:00Z',kind:'new',continueHref:'/en/compose?draft=draft-a'}),
 Object.freeze({id:'draft-b',title:'  ',updatedAt:'2026-10-22T22:00:00Z',kind:'edit',continueHref:'/en/compose?draft=draft-b'})
]);
const render=(locale,rows=items)=>renderToStaticMarkup(React.createElement(ListingDraftList,{locale,items:rows}));
for(const locale of ['he','en']) {
 const html=render(locale);assert.match(html,/data-draft-id="draft-a"/);assert.match(html,/data-draft-id="draft-b"/);
 assert.match(html,/href="\/en\/compose\?draft=draft-a"/);assert.match(html,/href="\/en\/compose\?draft=draft-b"/);
 assert.match(html,/<time dateTime="2026-10-23T00:00:00Z"/i);assert.match(html,/Private &lt;home&gt;/);
 assert.match(html,locale==='en'?/Untitled draft/:/טיוטה ללא כותרת/);assert.match(html,locale==='en'?/Listing edit/:/עריכת מודעה/);
 assert.doesNotMatch(html,/Delete|מחיק|owner-listing/);assert.match(render(locale,[]),locale==='en'?/No saved drafts yet/:/עדיין אין טיוטות שמורות/);
 assert.doesNotMatch(render(locale,items.map(({continueHref,...item})=>item)),/href=/);
}
let calls=0;
const {ListingDraftSection,loadDashboardDrafts}=load('src/components/listings/ListingDraftSection.tsx',{
 '@/lib/listings/draft-actions':{listListingCloudDrafts:async input=>{calls++;return {ok:true,data:input};}},
 '@/lib/listings/text':{localePrefix:l=>l==='en'?'/en':''},'./ListingDraftList':{ListingDraftList},
});
(async()=>{
 assert.equal((await loadDashboardDrafts({draftCursor:['a','b']})).error.code,'CURSOR_STALE');assert.equal(calls,0);
 assert.deepEqual((await loadDashboardDrafts({draftCursor:'bound-cursor'})).data,{cursor:'bound-cursor'});
 for(const locale of ['he','en']) {
  const error=renderToStaticMarkup(await ListingDraftSection({locale,paged:false,result:Promise.resolve({ok:false,error:{code:'INTERNAL',retryable:true,correlationId:'never-render-secret'}})}));
  assert.match(error,/role="alert"/);assert.doesNotMatch(error,/No saved drafts|No listings|never-render-secret/);
  const fullDraft={id:'a',kind:'new',updatedAt:'2026-10-23T00:00:00Z',fields:{title:'Visible',address:{address:'DO NOT SERIALIZE'}},photos:[{objectPath:'PRIVATE-PATH'}],ownerId:'PRIVATE-OWNER'};
  const view=await ListingDraftSection({locale,paged:true,result:Promise.resolve({ok:true,data:{items:[fullDraft],next_cursor:'signed+cursor',has_more:true}})});
  const html=renderToStaticMarkup(view);
  assert.match(html,/draftCursor=signed%2Bcursor/);assert.match(html,/saved-drafts/);assert.doesNotMatch(html,/DO NOT SERIALIZE|PRIVATE-PATH|PRIVATE-OWNER/);
  assert.deepEqual(Object.keys(view.props.children[0].props.items[0]).sort(),['continueHref','id','kind','title','updatedAt']);
 }
 console.log('PASS HE/EN separate identities/actions, empty/no-action, escaped titles, deterministic dates, minimal private projection, errors and bounded paging');
})().catch(error=>{console.error(error);process.exitCode=1;});
