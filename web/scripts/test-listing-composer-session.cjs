const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');let effect,finishAuth,reads=0,writes=0;
const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/components/listings/ListingComposerSession.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>{
 if(id==='react')return{useCallback:fn=>fn,useRef:v=>({current:v}),useState:v=>[v,()=>{}],useEffect:fn=>effect=fn,useImperativeHandle:()=>{}};
 if(id==='@/utils/supabase/client')return{createClient:()=>({auth:{getUser:()=>new Promise(resolve=>finishAuth=resolve)}})};
 if(id==='@/lib/listings/draft-actions')return{listListingCloudDrafts:()=>reads++,createListingCloudDraft:()=>writes++,loadListingCloudDraft:()=>reads++};
 if(id==='@/lib/listings/draft-store')return{loadListingDraft:()=>reads++};if(id==='@/lib/listings/draft-import')return{importLegacyListingDraft:()=>writes++};
 if(id.startsWith('@/app/')||id==='./ListingDraftChooser')return{};return require(id);
},m,m.exports);
(async()=>{m.exports.ListingComposerSession({accountId:'owner',locale:'en',hasPrivatePhone:false,onClose:()=>{}});const cleanup=effect();await new Promise(resolve=>setImmediate(resolve));cleanup();finishAuth({data:{user:{id:'owner'}},error:null});await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,0);assert.equal(writes,0);console.log('PASS unmounted Plus session cannot list/create/import after delayed identity response');})().catch(e=>{console.error(e);process.exitCode=1});
