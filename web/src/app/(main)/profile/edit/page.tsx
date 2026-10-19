import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { EditProfileForm } from './EditProfileForm';
import { headers } from 'next/headers';
import { localePath } from '@/utils/navigation';

export default async function EditProfilePage() {
  const locale = (await headers()).get('x-shutaf-locale') === 'en' ? 'en' : 'he';
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(localePath('/login', locale));

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!profile) redirect(localePath('/login', locale));

  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();

  const { data: photos } = await supabase
    .from('profile_photos')
    .select('*')
    .eq('profile_id', user.id)
    .order('display_order', { ascending: true }).order('id');
  const [{ data: lifestyle }, { data: privateLifestyle }] = await Promise.all([
    supabase.from('profile_lifestyle').select('*').eq('profile_id', user.id).maybeSingle(),
    supabase.from('profile_lifestyle_private').select('*').eq('profile_id', user.id).maybeSingle(),
  ]);

  return <EditProfileForm profile={profile} privateProfile={privateProfile} initialPhotos={photos ?? []} lifestyle={lifestyle} privateLifestyle={privateLifestyle} locale={locale} />;
}
