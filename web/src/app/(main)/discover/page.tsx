import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import DiscoverClient from './DiscoverClient';

export default async function DiscoverPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('mode').eq('id', user.id).maybeSingle();
  if (profile?.mode === 'lister') redirect('/my-listings');
  return <DiscoverClient />;
}
