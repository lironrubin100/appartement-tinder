import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { taxonomy, residentFields, apartmentFields, requiredResidentFields, scoringContract,
  parseResidentFacts, parseApartmentFacts, parseResidentPreferences, publicResidentFacts,
  applianceViews, parseBills, billsIncluded, adaptLegacyTags } from '../web/src/lib/contracts/taxonomy.ts';
import { resolveConfig, publicConfig, structuralLimits } from '../web/src/lib/contracts/config.ts';

test('all 31 approved headings map once and scoring weights stay 12/15', () => {
  const source = readFileSync(new URL('../docs/specs/TAXONOMY.md', import.meta.url), 'utf8');
  const ids = [...source.matchAll(/^\| ([RA]\d{2}) /gm)].map(m => m[1]);
  assert.equal(ids.length, 31);
  assert.deepEqual(Object.keys(taxonomy).sort(), ids.sort());
  assert.equal(Object.values(taxonomy).filter(c => c.weight > 0).length, 12);
  assert.equal(Object.values(taxonomy).reduce((s,c) => s+c.weight,0),15);
  assert.deepEqual(scoringContract, {version:'taxonomy-v1',factors:12,possibleWeight:15,minimumFactors:3,minimumWeight:6});
  assert.deepEqual(requiredResidentFields,['cleanliness','sleep_schedule','guests','smoking']);
  for(const c of Object.values(taxonomy)) { assert.ok(c.label.he && c.label.en); for(const f of c.fields) assert.ok(f==='bills'||f in residentFields||f in apartmentFields,f); }
  assert.equal(taxonomy.R01.state,'excluded');assert.equal(taxonomy.A06.state,'deferred');
});
test('every canonical enum has HE/EN labels and validates; unknown stays null', () => {
  for(const [definitions,parse] of [[residentFields,parseResidentFacts],[apartmentFields,parseApartmentFacts]]) {
    for(const [key,field] of Object.entries(definitions)) {
      if(!field.options) continue;
      for(const [id,label] of Object.entries(field.options)) {
        assert.ok(label.he && label.en, `${key}:${id}`);
        const value=field.kind==='set'?{answered:true,values:[id]}:id;
        const input=key==='allowed_pets'?{pet_rule_known:true,[key]:value}:{[key]:value};
        const result=parse(input)[key];
        assert.deepEqual(result,id==='unknown'?null:value,`${key}:${id}`);
      }
      assert.throws(()=>parse({[key]:'not_an_option'}));
    }
  }
});
test('unanswered differs from explicit none; sets canonicalize without duplicates',()=>{
  assert.deepEqual(parseResidentFacts({}),{});
  assert.deepEqual(parseResidentFacts({pets:{answered:false}}),{pets:null});
  assert.deepEqual(parseResidentFacts({pets:{answered:true,values:[]}}),{pets:{answered:true,values:[]}});
  assert.deepEqual(parseResidentFacts({pets:{answered:true,values:['cat','dog']}}).pets.values,['dog','cat']);
  assert.throws(()=>parseResidentFacts({pets:[]}));
  assert.throws(()=>parseResidentFacts({pets:{answered:false,values:['dog']}}));
  assert.throws(()=>parseResidentFacts({pets:{answered:true,values:['dog','dog']}}));
});
test('required completion and all numeric/text bounds fail closed',()=>{
  assert.throws(()=>parseResidentFacts({},true));
  assert.doesNotThrow(()=>parseResidentFacts({cleanliness:'very_tidy',sleep_schedule:'early',guests:'rare',smoking:'none'},true));
  for(const [key,field] of Object.entries(apartmentFields)) {
    if(field.kind==='integer') { for(const bad of [field.min-1,field.max+1,1.5,NaN,Infinity,'1']) assert.throws(()=>parseApartmentFacts({[key]:bad}));
      assert.equal(parseApartmentFacts({[key]:field.min})[key],field.min); assert.equal(parseApartmentFacts({[key]:field.max})[key],field.max); }
    if(field.kind==='text') assert.throws(()=>parseApartmentFacts({[key]:'a'.repeat(field.max+1)}));
  }
  for(const forbidden of ['gender','gender_dynamic','relationship_status','miluim_reserve_duty','birth_date','phone','budget','exact_address','__proto__']) {
    assert.throws(()=>parseResidentFacts(JSON.parse(`{"${forbidden}":"private"}`)));
  }
});
test('preferences are explicit, private, canonical and preferred is subset of accepted',()=>{
  assert.deepEqual(parseResidentPreferences({accepted_cleanliness:[]}),{accepted_cleanliness:[]});
  assert.throws(()=>parseResidentPreferences({preferred_cleanliness:['very_tidy']}));
  assert.throws(()=>parseResidentPreferences({accepted_gender:['any']}));
  assert.throws(()=>parseResidentPreferences({quiet_hours_from:'22:00'}));
  assert.throws(()=>parseResidentPreferences({quiet_hours_from:'24:00',quiet_hours_to:'06:00'}));
  assert.throws(()=>parseResidentPreferences({strict_no_pets:'true'}));
  assert.throws(()=>parseResidentPreferences({accepted_pet_types:[]}));
  assert.throws(()=>parseResidentPreferences({pet_preference_answered:true}));
  assert.doesNotThrow(()=>parseResidentPreferences({pet_preference_answered:true,accepted_pet_types:[],quiet_hours_from:'22:00',quiet_hours_to:'06:00'}));
  const own={smoking:'none',pets:{answered:true,values:[]}};
  assert.deepEqual(publicResidentFacts(own,['smoking','phone','strict_no_pets','budget']),{smoking:'none'});
  assert.deepEqual(publicResidentFacts(own,[]),{});
});
test('canonical appliances and bill unknowns never fabricate facts',()=>{
  assert.deepEqual(applianceViews({}),{washer:null,dryer:null,dishwasher:null,washer_connection:null});
  assert.deepEqual(applianceViews(parseApartmentFacts({appliances:{answered:true,values:['washer','dishwasher']}})),{washer:true,dryer:false,dishwasher:true,washer_connection:null});
  assert.throws(()=>parseApartmentFacts({washer:true}));
  assert.throws(()=>parseApartmentFacts({allowed_pets:{answered:true,values:[]}}));
  assert.throws(()=>parseApartmentFacts({pet_rule_known:true}));
  assert.equal(billsIncluded(parseBills({})),null);
  assert.equal(billsIncluded(parseBills({electricity:{status:'included'}})),null);
  assert.equal(billsIncluded(parseBills({electricity:{status:'separate',monthly_estimate:0}})),false);
  assert.equal(billsIncluded(parseBills(Object.fromEntries(['electricity','water','arnona','building_fee','internet'].map(k=>[k,{status:'included'}])))),true);
  assert.throws(()=>parseBills({water:{status:'separate',monthly_estimate:100001}}));
  assert.throws(()=>parseBills({water:{status:'separate',monthly_estimate:NaN}}));
});
test('legacy adapter preserves only exact meanings and requests review of ambiguous/identity values',()=>{
  const result=adaptLegacyTags({smoking:'yes',sleep_schedule:'night_owl',pets:'no',gender_dynamic:'coed_anyone',relationship_status:'single',miluim_reserve_duty:'yes'});
  assert.deepEqual(result.facts,{sleep_schedule:'late',pets:{answered:true,values:[]}});
  assert.deepEqual(result.needsReview,['smoking','gender_dynamic','relationship_status','miluim_reserve_duty']);
  assert.equal(adaptLegacyTags({smoking:'outdoor_only'}).facts.smoking,'outdoors_only');
});
test('config invalid/versioned input falls back safely and public output is allowlisted',()=>{
  const defaults=resolveConfig(null);
  for(const bad of [undefined,NaN,0,-1,51,1.5,'20']) assert.equal(resolveConfig({version:1,values:{page_size:bad}}).values.page_size,20);
  assert.equal(resolveConfig({version:2,values:{page_size:2}}).values.page_size,20);
  assert.equal(resolveConfig({version:1,values:{page_size:50}}).values.page_size,50);
  assert.deepEqual(publicConfig({version:1,values:{page_size:5,introductions_per_day:99,service_role:'secret',budget:100}}),{page_size:5,message_page_size:50});
  assert.equal(defaults.values.introductions_per_day,20);assert.equal(structuralLimits.groupMembers,4);
});

import { scorePair, scoreGroup } from './lib/scoring-reference.mjs';
const basicFacts = { cleanliness:'very_tidy',sleep_schedule:'early',guests:'rare' };
const basicPreferences = { accepted_cleanliness:['very_tidy'],accepted_sleep_schedule:['early'],accepted_guests:['rare'] };
const person = (facts = {}, preferences = {}) => ({ facts: { ...basicFacts, ...facts }, preferences: { ...basicPreferences, ...preferences } });
test('test-only score reference reproduces 57 percent at four factors/weight seven',()=>{
  const a=person({ household_noise:'quiet' },{ accepted_sleep_schedule:['early','late'],preferred_sleep_schedule:['late'],accepted_guests:['frequent'],accepted_household_noise:['quiet'] });
  const b=person({ household_noise:'quiet' },{ accepted_household_noise:['quiet'] });
  const result=scorePair(a,b);
  assert.equal(result.score,57);assert.equal(result.comparable_category_count,4);assert.equal(result.comparable_weight,7);
  assert.equal(scorePair(person(),person()).score,100);
  assert.equal(scorePair({facts:{pets:{answered:true,values:[]}},preferences:{pet_preference_answered:true,accepted_pet_types:[]}}, {facts:{pets:{answered:true,values:[]}},preferences:{pet_preference_answered:true,accepted_pet_types:[]}}).score,null);
  const missing=person();delete missing.preferences.accepted_guests;
  assert.equal(scorePair(person(),missing).score,null);
});
test('reference counts sets and kitchen once, excludes unspecified values and requires all group members',()=>{
  const a=person({music_habits:{answered:true,values:['headphones','social_music']},kitchen_rules:'kosher',grocery_sharing:'separate',climate:'flexible'},
    {accepted_music_habits:['headphones','social_music'],preferred_music_habits:['headphones'],accepted_kitchen_rules:['kosher'],accepted_grocery_sharing:['separate'],accepted_climate:['flexible']});
  const result=scorePair(a,a);
  assert.equal(result.factors.R06,0.5);assert.equal(result.factors.R09,1);assert.equal(result.factors.R07,null);
  assert.equal(result.comparable_category_count,5);assert.equal(result.comparable_weight,8);
  assert.equal(scoreGroup(a,[a,{facts:{},preferences:{}}]).score,null);
  assert.equal(scoreGroup(a,[]).score,null);
  assert.equal(scoreGroup(a,[a]).score,result.score);
  const missing=person({kitchen_rules:'kosher'},{accepted_kitchen_rules:['kosher']});
  assert.equal(scorePair(missing,missing).factors.R09,null);
});
test('reference pet mismatch remains explicit and other animals are unknown',()=>{
  const noPets=person({pets:{answered:true,values:[]}},{pet_preference_answered:true,accepted_pet_types:[]});
  const dog=person({pets:{answered:true,values:['dog']}},{pet_preference_answered:true,accepted_pet_types:['dog']});
  assert.equal(scorePair(noPets,dog).factors.R11,0);
  assert.equal(scorePair(noPets,dog).score,86);
  const other=person({pets:{answered:true,values:['other']}},{pet_preference_answered:true,accepted_pet_types:['other']});
  assert.equal(scorePair(noPets,other).factors.R11,null);
});
