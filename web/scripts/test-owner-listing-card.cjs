const fs=require('fs'),assert=require('assert/strict'),ts=require(process.cwd()+'/node_modules/typescript');
const React=require(process.cwd()+'/node_modules/react'),{renderToStaticMarkup}=require(process.cwd()+'/node_modules/react-dom/server');
const code=ts.transpileModule(fs.readFileSync('src/components/listings/OwnerListingCard.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const m={exports:{}},stub=id=>id==='next/link'?{__esModule:true,default:'a'}:id==='next/image'?{__esModule:true,default:({unoptimized,...props})=>React.createElement('img',props)}:id==='@/lib/listings/text'?{localePrefix:l=>l==='en'?'/en':''}:id==='react/jsx-runtime'?require(process.cwd()+'/node_modules/react/jsx-runtime'):require(id);
new Function('require','module','exports',code)(stub,m,m.exports);
const base={id:'listing',title:'Test home',public_location_label:'Test city',photos:['/photo.jpg'],status:'active',apartment_rooms:[{monthly_price:2200,is_available:true},{monthly_price:3000,is_available:false}]};
function render(listing,locale,more={}){Object.freeze(listing.apartment_rooms);Object.freeze(listing);return renderToStaticMarkup(React.createElement(m.exports.OwnerListingCard,{listing,locale,...more}));}
let h=render({...base},'en',{viewHref:'/en/listings/listing'});assert.match(h,/Active/);assert.match(h,/2,200/);assert.match(h,/1 available rooms/);assert.match(h,/href="\/en\/listings\/listing"/);assert.doesNotMatch(h,/Manage listing/);assert.match(h,/photo.jpg/);assert.doesNotMatch(h,/<button/);
h=render({...base,status:'taken'},'he');assert.match(h,/הושכרה/);assert.doesNotMatch(h,/ניהול המודעה/);
h=render({...base,photos:null,apartment_rooms:[]},'en');assert.match(h,/No available rooms/);assert.doesNotMatch(h,/<img/);assert.doesNotMatch(h,/Infinity/);
h=render({...base,photos:[],apartment_rooms:null},'he',{manageHref:'/my-listings#manage'});assert.match(h,/אין חדרים פנויים/);assert.match(h,/href="\/my-listings#manage"/);
assert.deepEqual(base.apartment_rooms,[{monthly_price:2200,is_available:true},{monthly_price:3000,is_available:false}]);console.log('PASS active, rented, no-photo, no-room, HE/EN links and immutable presentation');
