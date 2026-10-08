'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

type ToggleResult =
  | { ok: true; saved: boolean; interestCount: number }
  | { ok: false; message: string };

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        if (!cancelled) setReady(true);
        return;
      }

      const { data, error } = await supabase
        .from('saves')
        .select('apartment_id')
        .eq('user_id', uid);
      if (!cancelled && !error) {
        setFavorites(new Set((data ?? []).map((save) => save.apartment_id)));
      }
      if (!cancelled) setReady(true);
    }

    void init();
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback(async (apartmentId: string): Promise<ToggleResult> => {
    if (pendingIds.has(apartmentId)) {
      return { ok: false, message: 'הפעולה כבר מתבצעת' };
    }

    setPendingIds((current) => new Set(current).add(apartmentId));
    const { data, error } = await supabase.rpc('toggle_apartment_save_and_interest', {
      p_apartment_id: apartmentId,
    });
    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(apartmentId);
      return next;
    });

    const result = data?.[0];
    if (error || !result) {
      return { ok: false, message: 'לא הצלחנו לעדכן את המודעה. נסי שוב.' };
    }

    setFavorites((current) => {
      const next = new Set(current);
      if (result.saved) next.add(apartmentId); else next.delete(apartmentId);
      return next;
    });
    return { ok: true, saved: result.saved, interestCount: Number(result.interest_count) };
  }, [pendingIds]);

  return {
    favorites,
    ready,
    isSaved: (id: string) => favorites.has(id),
    isPending: (id: string) => pendingIds.has(id),
    toggle,
  };
}
