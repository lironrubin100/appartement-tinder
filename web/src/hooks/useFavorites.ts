'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const LOCAL_KEY = 'shutaf:favorites';
const supabase = createClient();

function readLocal(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function writeLocal(ids: Set<string>) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(ids)));
}

// ponytail: no sign-in flow exists yet anywhere in the app. Anonymous auth
// gives each device a stable auth.uid() so `saves` stays RLS-scoped per user
// without building a login screen. If the Supabase project has anonymous
// sign-ins disabled, this silently falls back to a localStorage-only list.
// Upgrade path: once real auth ships, migrate local saves into the `saves`
// table on first sign-in.
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      let uid = session?.user?.id ?? null;

      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error) uid = data.user?.id ?? null;
      }

      if (cancelled) return;

      if (uid) {
        setUserId(uid);
        const { data } = await supabase.from('saves').select('apartment_id').eq('user_id', uid);
        if (!cancelled) setFavorites(new Set((data ?? []).map((r) => r.apartment_id)));
      } else {
        setFavorites(readLocal());
      }
      if (!cancelled) setReady(true);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback(async (apartmentId: string) => {
    setFavorites((prev) => {
      const isSaved = prev.has(apartmentId);
      const next = new Set(prev);
      if (isSaved) next.delete(apartmentId); else next.add(apartmentId);

      if (userId) {
        if (isSaved) {
          supabase.from('saves').delete().eq('apartment_id', apartmentId).eq('user_id', userId);
        } else {
          supabase.from('saves').insert({ apartment_id: apartmentId, user_id: userId });
        }
      } else {
        writeLocal(next);
      }
      return next;
    });
  }, [userId]);

  return { favorites, ready, isSaved: (id: string) => favorites.has(id), toggle };
}
