import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { EditProfileForm } from './EditProfileForm';

export default async function EditProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/login');

  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();

  const { data: photos } = await supabase
    .from('profile_photos')
    .select('*')
    .eq('profile_id', user.id)
    .order('display_order', { ascending: true });

  return <EditProfileForm profile={profile} privateProfile={privateProfile} initialPhotos={photos ?? []} />;
}
