'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createPersonalSavesStore } from '@/lib/listings/personal-saves-store';
import type { Locale } from '@/utils/navigation';

// No client/session is constructed while this module renders on the server.
const store = createPersonalSavesStore({
  async getActor() {
    const { data: { user }, error } = await createClient().auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    return user?.id ?? null;
  },
  async read(actor, signal) {
    const { data, error } = await createClient().from('saves').select('apartment_id').eq('user_id', actor).abortSignal(signal);
    if (error) throw error;
    return (data ?? []).map(row => row.apartment_id);
  },
  async set(actor, id, desired, signal) {
    const { data, error } = await createClient().rpc('set_apartment_saved', {
      p_apartment_id: id, p_saved: desired, p_expected_actor: actor,
    }).abortSignal(signal);
    if (error || data?.length !== 1) throw error ?? new Error('INVALID_SAVE_REPLY');
    return { saved: data[0].saved, interestCount: Number(data[0].interest_count) };
  },
});
let started = false;
function subscribe(listener: () => void) {
  const unsubscribe = store.subscribe(listener);
  if (!started) {
    started = true;
    // One tab-lifetime observer clears old account state even between routes.
    createClient().auth.onAuthStateChange((_event, session) => store.observe(session?.user.id ?? null));
    void store.reload();
  }
  return unsubscribe;
}

export function useFavorites(locale: Locale = 'he') {
  const snapshot = useSyncExternalStore(subscribe, store.getSnapshot, store.getServerSnapshot);
  const toggle = useCallback(async (id: string) => {
    const result = await store.toggle(id);
    if (result.ok) return result;
    const en = locale === 'en';
    const message = result.code === 'busy'
      ? en ? 'This update is still in progress.' : 'העדכון עדיין מתבצע.'
      : result.code === 'auth' || result.code === 'changed'
        ? en ? 'Your account changed. Reload your saved apartments.' : 'החשבון השתנה. טענו מחדש את השמורים.'
        : en ? 'The update could not be confirmed. Retry to apply the same choice.' : 'לא ניתן לאשר שהעדכון הושלם. ניסיון חוזר ישמור על אותה בחירה.';
    return { ...result, message };
  }, [locale]);
  return {
    ...snapshot,
    isSaved: (id: string) => snapshot.favorites.has(id),
    isPending: (id: string) => snapshot.pending.has(id),
    isUncertain: (id: string) => snapshot.uncertain.has(id),
    reload: store.reload,
    toggle,
  };
}
