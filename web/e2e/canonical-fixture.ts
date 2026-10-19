import { expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6E3sAAAAASUVORK5CYII=', 'base64');
// Only complete fresh exact-ID fixtures. Never reset or rewrite retained demos.
export async function completeCanonicalResident(api: SupabaseClient<Database>, id: string, name: string) {
  const profile = await api.from('profiles').select('onboarded,mode').eq('id', id).single();
  expect(profile.error).toBeNull();
  if (profile.data!.onboarded) {
    expect(profile.data!.mode, 'Completed fixture must retain resident capability').toBe('resident');
    return;
  }
  const current = await api.from('profile_lifestyle').select('revision').eq('profile_id', id).maybeSingle();
  expect(current.error).toBeNull();
  const photos = await api.from('profile_photos').select('id').eq('profile_id', id).limit(1);
  expect(photos.error).toBeNull();
  if (!photos.data?.length) {
    const path = `${id}/${crypto.randomUUID()}.png`;
    expect((await api.storage.from('profile-photos').upload(path, png, { contentType: 'image/png', upsert: false })).error).toBeNull();
    const url = api.storage.from('profile-photos').getPublicUrl(path).data.publicUrl;
    expect((await api.from('profile_photos').insert({ profile_id: id, url, display_order: 0 })).error).toBeNull();
  }
  expect((await api.rpc('save_resident_profile', {
    p_name: name, p_birth_date: '2000-02-20', p_phone: '0500000000', p_bio: 'Synthetic retained QA resident',
    p_facts: { cleanliness: 'tidy_shared', sleep_schedule: 'regular', guests: 'occasional', smoking: 'none' },
    p_preferences: {}, p_disclosed_fields: ['cleanliness'], p_complete: true,
    p_expected_revision: current.data?.revision ?? 0, p_request_key: crypto.randomUUID(),
  })).error).toBeNull();
}
