'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Heart, MapPin, MessageCircle } from 'lucide-react';
import { ListingCard } from '@/components/discovery';
import { Badge, Button, Modal } from '@/components/ui';
import { createClient } from '@/utils/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
import type { Tables } from '@/types/database';

type Apartment = Tables<'apartments'>;

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-shutaf-lg bg-neutral-bg-soft animate-pulse" />
  ),
});

export default function MapPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isSaved, toggle } = useFavorites();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('apartments')
      .select('*')
      .eq('status', 'active')
      .then(({ data }) => {
        setApartments(data ?? []);
        setLoading(false);
      });
  }, []);

  const selected = apartments.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6 p-4 md:p-8">
      {/* Map */}
      <div className="flex-1 min-h-96 md:min-h-screen">
        {loading ? (
          <div className="w-full h-full rounded-shutaf-lg bg-neutral-bg-soft flex items-center justify-center">
            <p className="text-muted-text">טוען מפה…</p>
          </div>
        ) : (
          <LeafletMap apartments={apartments} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </div>

      {/* Listing Cards */}
      <div className="w-full md:w-96 space-y-4">
        <h3 className="text-lg font-bold text-ink mb-6">דירות בבאר שבע</h3>
        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {apartments.map((apt) => (
            <ListingCard
              key={apt.id}
              id={apt.id}
              title={apt.title}
              price={apt.price}
              image={apt.photos[0]}
              location={apt.address ?? ''}
              bedrooms={apt.bedrooms}
              availableFrom={apt.available_from ?? ''}
              tags={apt.is_sublet ? ['סאבלט'] : []}
              saved={isSaved(apt.id)}
              onSave={toggle}
              onMessage={(id) => console.log('Message:', id)}
              onClick={() => setSelectedId(apt.id)}
            />
          ))}
        </div>
      </div>

      {/* Apartment detail */}
      <Modal isOpen={!!selected} onClose={() => setSelectedId(null)} size="md">
        {selected && (
          <div>
            {selected.photos[0] && (
              <img
                src={selected.photos[0]}
                alt={selected.title}
                className="w-full h-48 object-cover rounded-shutaf-md mb-4"
              />
            )}
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl font-bold text-ink">{selected.title}</h2>
              <button
                onClick={() => toggle(selected.id)}
                className="p-2 bg-white rounded-full shadow-md shrink-0"
              >
                <Heart
                  className={`w-5 h-5 ${isSaved(selected.id) ? 'fill-gold text-gold' : 'text-muted-text'}`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2 text-muted-text text-sm mb-3">
              <MapPin className="w-4 h-4" />
              <span>{selected.address}</span>
              <span>•</span>
              <span>{selected.bedrooms} חדרים</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-lg text-orange">₪{selected.price.toLocaleString()}</span>
              {selected.is_sublet && <Badge variant="warning">סאבלט</Badge>}
            </div>
            {selected.available_from && (
              <p className="text-sm text-muted-text mb-3">
                זמין מ: {new Date(selected.available_from).toLocaleDateString('he-IL')}
              </p>
            )}
            {selected.description && <p className="text-body-text mb-4">{selected.description}</p>}
            <Button
              variant="primary"
              className="w-full"
              onClick={() => console.log('Message:', selected.id)}
            >
              <MessageCircle className="w-4 h-4 ms-2" />
              שלח הודעה
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
