const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/components/listings/NewListingCloudDraft.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
let effect,finishAuth,writes=0,storageWrites=0;
const m={exports:{}};new Function('require','module','exports',code)(id=>{
 if(id==='react')return{useEffect:fn=>effect=fn,useState:v=>[v,()=>{}]};
 if(id==='next/navigation')return{useRouter:()=>({replace:()=>{throw Error('Unexpected navigation')}})};
 if(id==='@/lib/listings/draft-actions')return{createListingCloudDraft:async()=>{writes++;throw Error('Unexpected creation')}};
 if(id==='@/utils/supabase/client')return{createClient:()=>({auth:{getUser:()=>new Promise(resolve=>finishAuth=resolve)}})};
 if(id==='@/lib/listings/text')return{localePrefix:()=>''};return require(id);
},m,m.exports);
global.sessionStorage={getItem:()=>null,setItem:()=>storageWrites++};
m.exports.NewListingCloudDraft({accountId:'owner',locale:'en'});const cleanup=effect();cleanup();finishAuth({data:{user:{id:'owner'}}});
setImmediate(()=>{assert.equal(writes,0);assert.equal(storageWrites,0);console.log('PASS unmounted new-draft intent cannot create or mutate its receipt after delayed authentication');});
