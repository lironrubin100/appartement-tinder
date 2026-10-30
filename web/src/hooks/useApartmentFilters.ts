'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { APARTMENT_FILTERS, apartmentFilterArguments, type FilterDef, type FilterState } from '@/components/map/filters';
import type { Tables } from '@/types/database';
import { createClient } from '@/utils/supabase/client';

type Apartment = Tables<'apartments_public'>;

function defaultState(filters: FilterDef[]): FilterState {
  return Object.fromEntries(filters.map((f) => [f.id, f.default]));
}

export function useApartmentFilters(apartments: Apartment[], filters: FilterDef[] = APARTMENT_FILTERS) {
  const [values, setValues] = useState<FilterState>(() => defaultState(filters));
  const [retryCount, setRetryCount] = useState(0);
  const [actorEpoch, setActorEpoch] = useState(0);
  const observedActor = useRef<string | null | undefined>(undefined);
  const [response, setResponse] = useState<{ key: object; ids: string[]; error: boolean } | null>(null);
  const request = useMemo(() => apartmentFilterArguments(values, filters), [values, filters]);
  const candidates = useMemo(() => {
    if (!request.ok) return [];
    const args = request.args;
    // Narrow only public apartment facts before the bounded server request.
    // The server repeats these checks and owns the same-room price/date test.
    return apartments.filter(apt =>
      (args.p_bedrooms === null || (args.p_bedrooms === 4 ? apt.bedrooms >= 4 : apt.bedrooms === args.p_bedrooms)) &&
      (!args.p_bills_included || apt.bills_included === true) && (!args.p_sublet_only || apt.is_sublet === true)
    ).map(apt => apt.id);
  }, [apartments, request]);
  const tooMany = candidates.length > 500;
  const key = useMemo(() => ({ candidates, request, retryCount, actorEpoch }), [candidates, request, retryCount, actorEpoch]);

  useEffect(() => {
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (observedActor.current !== undefined && observedActor.current !== next) setActorEpoch(epoch => epoch + 1);
      observedActor.current = next;
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!request.ok || !candidates.length || tooMany) return;
    const args = request.args, client = createClient(), controller = new AbortController();
    let cancelled = false, expired = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const initial = await client.auth.getUser();
        if (cancelled || expired) return;
        if (initial.error || !initial.data.user) throw new Error('Session unavailable');
        const actor = initial.data.user.id;
        if (observedActor.current === undefined) observedActor.current = actor;
        if (observedActor.current !== actor) throw new Error('Session changed');
        const { data, error } = await client.rpc('match_public_listing_ids', { ...args, p_listing_ids: candidates }).abortSignal(controller.signal);
        if (cancelled || expired) return;
        if (error) throw error;
        const current = await client.auth.getUser();
        if (current.error || current.data.user?.id !== actor || observedActor.current !== actor) throw new Error('Session changed');
        const candidateSet = new Set(candidates);
        if (!Array.isArray(data) || data.some(row => typeof row.id !== 'string' || !candidateSet.has(row.id)) || new Set(data.map(row => row.id)).size !== data.length) throw new Error('Invalid filter response');
        if (!cancelled && !expired) setResponse({ key, ids: data.map(row => row.id), error: false });
      } catch {
        if (!cancelled && !expired) setResponse({ key, ids: [], error: true });
      } finally {
        if (deadline) clearTimeout(deadline);
      }
    };
    const debounce = setTimeout(() => {
      deadline = setTimeout(() => {
        expired = true; controller.abort();
        if (!cancelled) setResponse({ key, ids: [], error: true });
      }, 20_000);
      void load();
    }, 200);
    return () => { cancelled = true; clearTimeout(debounce); if (deadline) clearTimeout(deadline); controller.abort(); };
  }, [key, candidates, request, tooMany]);

  const current = response?.key === key ? response : null;
  const pending = request.ok && candidates.length > 0 && !tooMany && !current;
  const error = tooMany ? 'scope' : current?.error ? 'request' : null;
  const matched = new Set(current?.ids ?? []);
  const filtered = request.ok && !pending && !error ? apartments.filter(apt => matched.has(apt.id)) : [];

  const setValue = (id: string, value: FilterDef['default']) =>
    setValues((prev) => ({ ...prev, [id]: value }));

  const retry = () => setRetryCount(count => count + 1);
  const reset = () => { setValues(defaultState(filters)); retry(); };

  return { values, setValue, reset, filtered, pending, error, retry, validationError: request.ok ? null : request.error };
}
