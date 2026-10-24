import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { getPublicMapConfig } from '@/lib/app-config';
import MapClient from './MapClient';

export default async function MapPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const publicMapConfig = await getPublicMapConfig();
  return <MapClient publicMapConfig={publicMapConfig} />;
}
