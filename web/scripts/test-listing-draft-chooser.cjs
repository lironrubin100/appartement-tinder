const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const source=fs.readFileSync('src/components/listings/ListingDraftChooser.tsx','utf8'),m={exports:{}};
new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(require,m,m.exports);
const {ListingDraftChooser}=m.exports;
const items=Object.freeze([Object.freeze({id:'draft-a',revision:7,title:' <A> ',kind:'new',updatedAt:'2026-10-23T00:00:00Z',fields:{address:'PRIVATE-ADDRESS'},photos:['PRIVATE-OBJECT']}),Object.freeze({id:'draft-b',revision:12,title:' ',kind:'edit',updatedAt:'2026-10-22T22:00:00Z'})]);
const nodes=element=>React.isValidElement(element)?[element,...React.Children.toArray(element.props.children).flatMap(nodes)]:[];
for(const locale of ['he','en']){
 const chosen=[];let closed=0,retries=0;const props={locale,items,hasLocalDraft:true,onChoose:c=>chosen.push(c),onClose:()=>closed++,onRetry:()=>retries++};
 const tree=ListingDraftChooser(props),html=renderToStaticMarkup(tree),buttons=nodes(tree).filter(e=>e.type==='button');
 assert.deepEqual(chosen,[]);assert.equal(closed,0);assert.equal(buttons.length,5);assert.match(html,/&lt;A&gt;/);assert.doesNotMatch(html,/PRIVATE-ADDRESS|PRIVATE-OBJECT/);assert.match(html,locale==='en'?/Untitled draft/:/טיוטה ללא כותרת/);assert.match(html,locale==='en'?/Listing edit/:/עריכת מודעה/);assert.match(html,locale==='en'?/dir="ltr"/:/dir="rtl"/);
 buttons[1].props.onClick();buttons[3].props.onClick();buttons[4].props.onClick();buttons[2].props.onClick();buttons[0].props.onClick();
 assert.deepEqual(chosen,[{kind:'new'},{kind:'continue',draftId:'draft-a',expectedRevision:7},{kind:'continue',draftId:'draft-b',expectedRevision:12},{kind:'import'}]);assert.equal(closed,1);
 const noLocal=nodes(ListingDraftChooser({...props,hasLocalDraft:false})).filter(e=>e.type==='button');assert.equal(noLocal.length,4);
 const pending=nodes(ListingDraftChooser({...props,pending:true}));assert.equal(pending.find(e=>e.type==='fieldset').props.disabled,true);assert.equal(pending.find(e=>e.type==='button').props.disabled,true);
 for(const loadState of ['loading','unavailable']){const state=ListingDraftChooser({...props,loadState}),text=renderToStaticMarkup(state);assert.doesNotMatch(text,/&lt;A&gt;|draft-a|Continue:/);assert.match(text,loadState==='loading'?/role="status"/:/role="alert"/);if(loadState==='unavailable'){const retry=nodes(state).filter(e=>e.type==='button').at(-1);retry.props.onClick();assert.equal(retries,1);}}
 const empty=renderToStaticMarkup(ListingDraftChooser({...props,items:[],hasLocalDraft:false}));assert.match(empty,locale==='en'?/No saved drafts yet/:/עדיין אין טיוטות שמורות/);
 assert.equal(chosen.length,4);assert.equal(items[0].revision,7);assert.equal(items[1].revision,12);
}
console.log('PASS HE/EN explicit New, Continue A/B with exact revision, optional Import and Close callbacks; no automatic selection, escaped/minimal rendering, loading/error/retry, empty and pending controls');
