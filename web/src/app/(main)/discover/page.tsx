import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';
import DiscoverClient from './DiscoverClient';
import { localePath } from '@/utils/navigation';

export default async function DiscoverPage() {
  const locale =
    (await headers()).get('x-shutaf-locale') === 'en' ? 'en' : 'he';
  const client = await createServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect(localePath('/login', locale));
  const { data: profile } = await client
    .from('profiles')
    .select('mode')
    .eq('id', user.id)
    .maybeSingle();
  const [people, groups] = await Promise.all([
    client.rpc('discover_individuals', {}),
    client.rpc('discover_groups', {}),
  ]);
  if (people.error || groups.error) throw new Error('Could not load discovery');
  return (
    <DiscoverClient
      people={people.data ?? []}
      groups={groups.data ?? []}
      locale={locale}
      canParticipate={profile?.mode !== 'lister'}
    />
  );
}
