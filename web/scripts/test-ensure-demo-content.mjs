import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_PEOPLE, exactTargetUrl, mergeOwnerContent, needsCanonicalSave, parseEnv } from './ensure-demo-content.mjs';

test('target parser accepts only the approved HTTPS project origin', () => {
  assert.equal(exactTargetUrl('https://npbduvjnqnbydolmdpsc.supabase.co'), 'https://npbduvjnqnbydolmdpsc.supabase.co');
  for (const bad of ['http://npbduvjnqnbydolmdpsc.supabase.co', 'https://other.supabase.co', 'https://npbduvjnqnbydolmdpsc.supabase.co/x', 'https://key@npbduvjnqnbydolmdpsc.supabase.co']) assert.throws(() => exactTargetUrl(bad));
});

test('missing canonical content gets the distinct approved fallback without replacing meaningful owner content', () => {
  const person = DEMO_PEOPLE[0];
  const merged = mergeOwnerContent(person, { fullName: 'Retained Name', birthDate: '1991-02-03', phone: '0500000000', bio: 'Retained bio', facts: { cleanliness: 'relaxed' }, preferences: { quiet_hours: true }, disclosed: ['cleanliness'] });
  assert.equal(merged.name, 'Retained Name'); assert.equal(merged.bio, 'Retained bio'); assert.equal(merged.facts.cleanliness, 'relaxed'); assert.equal(merged.facts.sleep_schedule, person.facts.sleep_schedule); assert.deepEqual(merged.preferences, { quiet_hours: true }); assert.deepEqual(merged.disclosed, ['cleanliness']);
});

test('save detection is idempotent after an already complete owner profile', () => {
  const person = DEMO_PEOPLE[1]; const state = { onboarded: true, mode: 'resident', fullName: person.name, birthDate: person.birthDate, bio: person.bio, facts: person.facts, disclosed: person.disclosed };
  assert.equal(needsCanonicalSave(state, mergeOwnerContent(person, state)), false);
  assert.equal(needsCanonicalSave({ ...state, facts: { cleanliness: 'tidy_shared' } }, mergeOwnerContent(person, { ...state, facts: { cleanliness: 'tidy_shared' } })), true);
});

test('env parser does not evaluate values', () => {
  const env = parseEnv('NEXT_PUBLIC_SUPABASE_URL="https://npbduvjnqnbydolmdpsc.supabase.co"\nBAD=$(never-run)');
  assert.equal(env.get('NEXT_PUBLIC_SUPABASE_URL'), 'https://npbduvjnqnbydolmdpsc.supabase.co'); assert.equal(env.get('BAD'), '$(never-run)');
});
