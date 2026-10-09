'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Heart, MapPin, MessageCircle } from 'lucide-react';
import { ListingCard } from '@/components/discovery';
import { Badge, Button, Modal } from '@/components/ui';
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
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isSaved, isPending, toggle } = useFavorites();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const { values, setValue, filtered } = useApartmentFilters(apartments);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('apartments_public')
      .select('*')
      .then(({ data }) => {
        setApartments(data ?? []);
        setLoading(false);
      });
  }, []);

  const selected = apartments.find((a) => a.id === selectedId) ?? null;
  const handleSave = useCallback(async (apartmentId: string) => {
    setSaveError(null);
    const result = await toggle(apartmentId);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    setApartments((current) => current.map((apartment) => (
      apartment.id === apartmentId
        ? { ...apartment, interest_count: result.interestCount }
        : apartment
    )));
  }, [toggle]);
  const handleContact = useCallback(async (apartmentId: string) => {
    setContactMessage(null);
    const result = await createListingInquiry(apartmentId);
    setContactMessage(result.ok
      ? 'הפנייה נשלחה לבעל/ת הנכס. לאחר אישור תיפתח שיחה פרטית.'
      : result.message);
  }, []);
  const selectedMinRoomPrice = selected?.min_room_price ?? selected?.price;
  const selectedMaxRoomPrice = selected?.max_room_price ?? selected?.price;
  const selectedPriceLabel = selectedMinRoomPrice === selectedMaxRoomPrice
    ? `₪${selectedMinRoomPrice?.toLocaleString()} לחדר`
    : `₪${selectedMinRoomPrice?.toLocaleString()}–${selectedMaxRoomPrice?.toLocaleString()} לחדר`;
  const selectedAvailabilityLabel = selected?.available_room_count === 1
    ? 'חדר פנוי אחד'
    : `${selected?.available_room_count} חדרים פנויים`;

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)] p-4 md:p-8">
      <FilterBar filters={APARTMENT_FILTERS} values={values} onChange={setValue} resultCount={filtered.length} />
      {saveError && (
        <p role="alert" className="mb-4 text-sm text-error" aria-live="polite">
          {saveError}
        </p>
      )}
      {contactMessage && (
        <p role="status" className="mb-4 text-sm text-muted-text" aria-live="polite">
          {contactMessage}
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Map */}
        <div className="flex-1 min-h-96 md:min-h-[calc(100vh-220px)]" data-testid="map-container">
          {loading ? (
            <div className="w-full h-full rounded-shutaf-lg bg-neutral-bg-soft flex items-center justify-center">
              <p className="text-muted-text">טוען מפה…</p>
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
                location={publicAreaLabel()}
                bedrooms={apt.bedrooms}
                availableFrom={apt.available_from ?? ''}
                tags={apt.is_sublet ? ['סאבלט'] : []}
                isNew={isNewListing(apt.created_at)}
                saved={isSaved(apt.id)}
                savePending={isPending(apt.id)}
                onSave={handleSave}
                onMessage={handleContact}
                onClick={() => setSelectedId(apt.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Apartment detail */}
      <Modal isOpen={!!selected} onClose={() => setSelectedId(null)} size="md">
        {selected && (
          <div data-testid="apartment-detail">
            {selected.photos[0] && (
              <div className="relative mb-4 h-48 overflow-hidden rounded-shutaf-md">
                <Image src={selected.photos[0]} alt={selected.title} fill unoptimized sizes="(max-width: 768px) 100vw, 448px" className="object-cover" />
              </div>
            )}
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl font-bold text-ink">{selected.title}</h2>
              <button
                onClick={() => handleSave(selected.id)}
                aria-label={isSaved(selected.id) ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
                aria-pressed={isSaved(selected.id)}
                disabled={isPending(selected.id)}
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
              <span>{publicAreaLabel()}</span>
              <span>•</span>
              <span>{selected.bedrooms} חדרים</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-lg text-orange">{selectedPriceLabel}</span>
              {selected.is_sublet && <Badge variant="warning">סאבלט</Badge>}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge variant="default">{selectedAvailabilityLabel}</Badge>
              <Badge variant={selected.bills_included ? 'success' : 'default'}>
                {selected.bills_included ? 'חשבונות כלולים' : 'חשבונות לא כלולים'}
              </Badge>
            </div>
            {selected.available_from && (
              <p className="text-sm text-muted-text mb-3">
                זמין מ: {new Date(selected.available_from).toLocaleDateString('he-IL')}
              </p>
            )}
            <p className="mb-3 rounded-shutaf-md bg-neutral-bg-soft px-3 py-2 text-xs text-muted-text">
              המיקום במפה מוצג כאזור כללי בלבד. הכתובת המדויקת תהיה זמינה בצ׳אט רק לאחר שבעל/ת הנכס יאשרו את הפנייה.
            </p>
            {selected.description && <p className="text-body-text mb-4">{selected.description}</p>}
            <Button
              variant="primary"
              className="w-full"
              onClick={() => handleContact(selected.id)}
            >
              <MessageCircle className="w-4 h-4 ms-2" />
              יצירת קשר עם בעל/ת הנכס
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
