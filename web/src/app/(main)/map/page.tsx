import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import MapClient from './MapClient';

export default async function MapPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <MapClient />;
}
