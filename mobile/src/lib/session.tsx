import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

export type Profile = {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  vibe_tags: string[];
  mode: 'solo' | 'group' | 'room_filler' | 'lister';
  budget_min: number | null;
  budget_max: number | null;
  is_verified: boolean;
  is_pro: boolean;
  onboarded: boolean;
};

type Ctx = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    if (!session?.user) return setProfile(null);
    loadProfile(session.user.id);
    // Powers the 14-day auto-pause: the feed filters on this, so it has to be
    // written every time the app opens or everyone slowly vanishes.
    supabase.from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .then(() => {});
  }, [session?.user?.id]);

  async function signIn(provider: 'google' | 'apple') {
    const redirectTo = Linking.createURL('/');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw error ?? new Error('no auth url');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return;

    // Supabase returns the tokens in the URL fragment, which Linking does not parse.
    const fragment = result.url.split('#')[1] ?? '';
    const params = new URLSearchParams(fragment);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) throw new Error('auth callback had no tokens');
    await supabase.auth.setSession({ access_token, refresh_token });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        profile,
        loading,
        signIn,
        signOut,
        refreshProfile: async () => session?.user && loadProfile(session.user.id),
      }}>
      {children}
    </SessionContext.Provider>
  );
}
