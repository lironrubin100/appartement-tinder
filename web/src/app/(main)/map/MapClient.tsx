'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { ShareListing } from '@/components/listings/ShareListing';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, MessageCircle } from 'lucide-react';
import { ListingCard } from '@/components/discovery';
import { Badge, Button, Modal } from '@/components/ui';
import JourneyError from '@/components/ui/JourneyError';
import { FilterBar } from '@/components/map/FilterBar';
import { APARTMENT_FILTERS } from '@/components/map/filters';
import { createClient } from '@/utils/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
import { useApartmentFilters } from '@/hooks/useApartmentFilters';
import type { Tables } from '@/types/database';
import { publicAreaLabel } from '@/lib/listings/locationPrivacy';
import { createListingInquiry } from '@/lib/listings/inquiries';

type Apartment = Tables<'apartments_public'>;

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-shutaf-lg bg-neutral-bg-soft animate-pulse" />
  ),
});

const NEW_WITHIN_DAYS = 7;
function isNewListing(createdAt: string) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs < NEW_WITHIN_DAYS * 24 * 60 * 60 * 1000;
}

export default function MapPage() {
  const locale = usePathname().startsWith('/en') ? 'en' : 'he';
  const en = locale === 'en';
  const prefix = en ? '/en' : '';
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { ready: favoritesReady, loadError: favoritesLoadError, uncertain, reload: reloadFavorites, isSaved, isPending, isUncertain, toggle } = useFavorites(locale);
  const failedSaveId = uncertain.values().next().value;
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const { values, setValue, filtered, reset, pending: filterPending, error: filterError, retry: retryFilters, validationError } = useApartmentFilters(apartments);

  useEffect(() => {
    let cancelled = false;
    let expired = false;
    const controller = new AbortController();
    const deadline = setTimeout(() => {
      if (cancelled) return;
      expired = true; controller.abort(); setLoadError(true); setLoading(false);
    }, 20_000);
    const supabase = createClient();

    let observedActor: string | null | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const actor = session?.user.id ?? null;
      if (observedActor !== undefined && observedActor !== actor) {
        cancelled = true; controller.abort(); clearTimeout(deadline);
        setApartments([]); setOwnedIds(new Set()); setSelectedId(null); setContactMessage(null);
        setLoadError(false); setLoading(true); setReloadCount(count => count + 1);
      }
      observedActor = actor;
    });
    void (async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Session unavailable');
        observedActor = user.id;
        const { data, error } = await supabase.from('apartments_public').select('*').abortSignal(controller.signal);
        if (error) throw error;
        const entries = data ?? [];
        // Ownership is a separate session-scoped read, never public poster data.
        const owned = entries.length ? await supabase.from('apartments').select('id')
          .eq('lister_id', user.id).in('id', entries.map(entry => entry.id)).abortSignal(controller.signal) : { data: [], error: null };
        if (owned.error) throw owned.error;
        const current = await supabase.auth.getUser();
        if (current.error || current.data.user?.id !== user.id || observedActor !== user.id) throw new Error('Session changed');
        if (cancelled || expired) return;
        setApartments(entries); setOwnedIds(new Set((owned.data ?? []).map(entry => entry.id)));
        setLoading(false);
      } catch {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      } finally {
        clearTimeout(deadline);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort(); clearTimeout(deadline);
      subscription.unsubscribe();
    };
  }, [reloadCount]);

  const retryLoadApartments = () => {
    setLoading(true);
    setLoadError(false);
    setApartments([]); setOwnedIds(new Set()); setSelectedId(null);
    setReloadCount((current) => current + 1);
  };

  const selected = filtered.find((a) => a.id === selectedId) ?? null;
  const handleSave = useCallback(async (apartmentId: string) => {
    const result = await toggle(apartmentId);
    if (!result.ok) return;
    setApartments((current) => current.map((apartment) => (
      apartment.id === apartmentId
        ? { ...apartment, interest_count: result.interestCount }
        : apartment
    )));
  }, [toggle]);
  const handleContact = useCallback(async (apartmentId: string) => {
    if (ownedIds.has(apartmentId)) return;
    setContactMessage(null);
    const result = await createListingInquiry(apartmentId);
    setContactMessage(result.ok ? en ? 'Your inquiry was sent. A private conversation opens after the owner accepts.' : 'הפנייה נשלחה לבעל/ת הנכס. לאחר אישור תיפתח שיחה פרטית.' : result.message);
  }, [ownedIds, en]);
  const selectedMinRoomPrice = selected?.min_room_price ?? selected?.price;
  const selectedMaxRoomPrice = selected?.max_room_price ?? selected?.price;
  const selectedPriceLabel = selectedMinRoomPrice === selectedMaxRoomPrice
    ? `₪${selectedMinRoomPrice?.toLocaleString()} ${en ? 'per room' : 'לחדר'}`
    : `₪${selectedMinRoomPrice?.toLocaleString()}–${selectedMaxRoomPrice?.toLocaleString()} ${en ? 'per room' : 'לחדר'}`;
  const selectedAvailabilityLabel = selected?.available_room_count === 1
    ? en ? '1 available room' : 'חדר פנוי אחד'
    : `${selected?.available_room_count} ${en ? 'available rooms' : 'חדרים פנויים'}`;

  const saveFeedback = (favoritesLoadError || failedSaveId) && <div role="alert" data-testid="favorite-error" className="mb-4 text-sm text-error">
    <p>{favoritesLoadError
      ? en ? 'Could not load your saved apartments.' : 'לא הצלחנו לטעון את השמורים שלך.'
      : en ? 'The update could not be confirmed. Retry keeps the same choice.' : 'לא ניתן לאשר שהעדכון הושלם. ניסיון חוזר שומר על אותה בחירה.'}</p>
    <button type="button" className="min-h-11 text-teal underline disabled:opacity-60"
      disabled={!!failedSaveId && isPending(failedSaveId)}
      onClick={() => { if (favoritesLoadError) void reloadFavorites(); else if (failedSaveId) void handleSave(failedSaveId); }}>
      {en ? 'Retry' : 'ניסיון חוזר'}
    </button>
  </div>;

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)] p-4 md:p-8">
      <FilterBar filters={APARTMENT_FILTERS} values={values}
        onChange={(id, value) => { setSelectedId(null); setValue(id, value); }}
        onReset={() => { setSelectedId(null); reset(); }} pending={loading || filterPending}
        validationError={validationError} resultCount={filtered.length} />
      {(!selected || (!favoritesLoadError && failedSaveId !== selected.id)) && saveFeedback}
      {contactMessage && <p role="status" className="mb-4 text-sm text-muted-text" aria-live="polite">{contactMessage}</p>}

      {loadError ? (
        <JourneyError retry={retryLoadApartments} />
      ) : filterError === 'request' ? (
        <JourneyError retry={retryFilters} />
      ) : filterError === 'scope' ? (
        <section role="alert" className="rounded-shutaf-lg border border-card-border bg-white p-5 text-ink">
          <h1 className="font-semibold">{en ? 'Narrow the filters' : 'צמצמו את הסינון'}</h1>
          <p>{en ? 'There are too many listings for one request. Try selecting bedrooms, bills or sublets.' : 'יש יותר מדי מודעות לבקשה אחת. אפשר לבחור מספר חדרים, חשבונות או סאבלט.'}</p>
        </section>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Map */}
          <div className="h-96 md:h-[calc(100vh-220px)] md:min-h-96 md:flex-1" data-testid="map-container">
            {loading ? (
              <div className="w-full h-full rounded-shutaf-lg bg-neutral-bg-soft flex items-center justify-center">
                <p role="status" className="text-muted-text">{en ? 'Loading map…' : 'טוען מפה…'}</p>
              </div>
            ) : (
              <LeafletMap apartments={filtered} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>

          {/* Listing Cards */}
          <div className="w-full md:w-[36rem]">
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[calc(100vh-220px)] overflow-y-auto content-start"
              data-testid="listing-grid"
            >
              {filtered.map((apt) => (
                <ListingCard
                  locale={locale}
                  key={apt.id}
                  id={apt.id}
                  title={apt.title}
                  price={apt.price}
                  minRoomPrice={apt.min_room_price}
                  maxRoomPrice={apt.max_room_price}
                  availableRoomCount={apt.available_room_count}
                  billsIncluded={apt.bills_included}
                  interestedCount={apt.interest_count}
                  image={apt.photos[0]}
                  location={en ? 'Approximate area' : publicAreaLabel()}
                  bedrooms={apt.bedrooms}
                  availableFrom={apt.available_from ?? ''}
                  tags={apt.is_sublet ? [en ? 'Sublet' : 'סאבלט'] : []}
                  isOwner={ownedIds.has(apt.id)}
                  manageHref={ownedIds.has(apt.id) ? `${prefix}/compose?listing=${apt.id}` : undefined}
                  selected={apt.id === selectedId}
                  isNew={isNewListing(apt.created_at)}
                  saved={isSaved(apt.id)}
                  savePending={isPending(apt.id)}
                  saveKnown={favoritesReady && !isUncertain(apt.id)}
                  onSave={handleSave}
                  onMessage={handleContact}
                  onClick={() => setSelectedId(apt.id)}
                />
              ))}
              {!loading && !filterPending && !validationError && filtered.length === 0 && <p role="status" className="rounded-shutaf-lg border border-card-border bg-white p-4 text-muted-text">
                {apartments.length ? en ? 'No listings match these filters.' : 'אין מודעות התואמות לסינון הזה.' : en ? 'No available listings yet.' : 'עדיין אין מודעות זמינות.'}
              </p>}
            </div>
          </div>
        </div>
      )}

      {/* Apartment detail */}
      <Modal isOpen={!!selected} onClose={() => setSelectedId(null)} size="md">
        {selected && (
          <div data-testid="apartment-detail" data-apartment-id={selected.id} data-owned={ownedIds.has(selected.id)}>
            {(favoritesLoadError || failedSaveId === selected.id) && saveFeedback}
            {ownedIds.has(selected.id) && <Badge variant="default" className="mb-3">{en ? 'Your listing' : 'המודעה שלך'}</Badge>}
            {selected.photos[0] && (
              <div className="relative mb-4 h-48 overflow-hidden rounded-shutaf-md">
                <Image src={selected.photos[0]} alt={selected.title} fill unoptimized sizes="(max-width: 768px) 100vw, 448px" className="object-cover" />
              </div>
            )}
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl font-bold text-ink">{selected.title}</h2>
              <button
                type="button"
                onClick={() => handleSave(selected.id)}
                aria-label={isSaved(selected.id) ? en ? 'Remove from saved' : 'הסר מהמועדפים' : en ? 'Save listing' : 'הוסף למועדפים'}
                aria-pressed={favoritesReady && !isUncertain(selected.id) ? isSaved(selected.id) : undefined}
                aria-busy={isPending(selected.id)}
                disabled={!favoritesReady || isPending(selected.id) || isUncertain(selected.id) || ownedIds.has(selected.id)}
                data-testid="favorite-toggle"
                className="p-2 bg-white rounded-full shadow-md shrink-0 disabled:cursor-wait disabled:opacity-60"
              >
                <Heart
                  className={`w-5 h-5 ${isSaved(selected.id) ? 'fill-gold text-gold' : 'text-muted-text'}`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2 text-muted-text text-sm mb-3">
              <MapPin className="w-4 h-4" />
              <span>{en ? 'Approximate area' : publicAreaLabel()}</span>
              <span>•</span>
              <span>{selected.bedrooms} {en ? 'rooms' : 'חדרים'}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-lg text-orange">{selectedPriceLabel}</span>
              {selected.is_sublet && <Badge variant="warning">{en ? 'Sublet' : 'סאבלט'}</Badge>}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge variant="default">{selectedAvailabilityLabel}</Badge>
              <Badge variant={selected.bills_included ? 'success' : 'default'}>
                {selected.bills_included ? en ? 'Bills included' : 'חשבונות כלולים' : en ? 'Bills not included' : 'חשבונות לא כלולים'}
              </Badge>
            </div>
            {selected.available_from && (
              <p className="text-sm text-muted-text mb-3">
                {en ? 'Available from: ' : 'זמין מ: '}{new Date(selected.available_from).toLocaleDateString(en ? 'en-GB' : 'he-IL')}
              </p>
            )}
            <p className="mb-3 rounded-shutaf-md bg-neutral-bg-soft px-3 py-2 text-xs text-muted-text">
              {en ? 'The map shows an approximate area. The exact address is available in the chat only after the owner accepts your inquiry.' : 'המיקום במפה מוצג כאזור כללי בלבד. הכתובת המדויקת תהיה זמינה בצ׳אט רק לאחר שבעל/ת הנכס יאשרו את הפנייה.'}
            </p>
            {selected.description && <p className="text-body-text mb-4">{selected.description}</p>}
            <Link href={`${prefix}/listings/${selected.id}`} className="mb-4 inline-block rounded-xl border border-card-border px-4 py-3 text-teal">{en ? 'View full listing' : 'צפייה במודעה המלאה'}</Link>
            <ShareListing id={selected.id} locale={locale}/>
            {ownedIds.has(selected.id) ? <Link href={`${prefix}/compose?listing=${selected.id}`} prefetch={false} className="min-h-11 flex items-center justify-center rounded-xl bg-orange px-4 py-3 font-semibold text-white">
              {en ? 'Manage listing' : 'ניהול המודעה'}
            </Link> : <Button
              variant="primary"
              className="w-full"
              onClick={() => handleContact(selected.id)}
            >
              <MessageCircle className="w-4 h-4 ms-2" />
              {en ? 'Contact owner' : 'יצירת קשר עם בעל/ת הנכס'}
            </Button>}
          </div>
        )}
      </Modal>
    </div>
  );
}
