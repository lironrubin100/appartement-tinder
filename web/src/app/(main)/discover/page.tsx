import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import DiscoverClient from './DiscoverClient';
import { tagOptionLabel, type TagKey } from '@/utils/profileTags';

const DISPLAY_TAGS: TagKey[] = ['cleanliness', 'sleep_schedule', 'social_guests'];

export default async function DiscoverPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('mode').eq('id', user.id).maybeSingle();
  if (profile?.mode === 'lister') redirect('/my-listings');
  const [{ data: candidates }, { data: sentLikes }] = await Promise.all([
    supabase.from('profiles_public').select('*').neq('id', user.id).limit(30),
    supabase.from('likes').select('to_user').eq('from_user', user.id).not('to_user', 'is', null),
  ]);
  const seenIds = new Set((sentLikes ?? []).flatMap((like) => like.to_user ? [like.to_user] : []));
  const cards = (candidates ?? []).flatMap((candidate) => {
    if (!candidate.id || !candidate.name || seenIds.has(candidate.id)) return [];
    return [{
      id: candidate.id,
      name: candidate.name,
      age: candidate.age,
      photo: candidate.photo_url,
      bio: candidate.bio ?? '',
      tags: DISPLAY_TAGS.flatMap((key) => {
        const label = tagOptionLabel(key, candidate[key]);
        return label ? [{ label }] : [];
      }),
      verified: candidate.public_badges?.includes('student_verified') ?? false,
    }];
  });
  return <DiscoverClient currentUserId={user.id} candidates={cards} />;
}
