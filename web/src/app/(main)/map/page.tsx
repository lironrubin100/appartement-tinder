'use client';

import { ListingCard } from '@/components/discovery';

export default function MapPage() {
  const listings = [
    {
      id: '1',
      title: '3-חדרים מודרני בקרוב ל-BGU',
      price: 3500,
      location: 'בר-אילן',
      bedrooms: 3,
      availableFrom: '2026-09-01',
      tags: ['מזגן', 'חנייה', 'חי'],
      interestedCount: 5,
    },
    {
      id: '2',
      title: 'דירה משופצת, משופצת יפה',
      price: 2800,
      location: 'צומת בן גוריון',
      bedrooms: 2,
      availableFrom: '2026-09-15',
      tags: ['מרפסת'],
      interestedCount: 3,
    },
    {
      id: '3',
      title: 'חדר בדירה משותפת',
      price: 1500,
      location: 'עיר נוה',
      bedrooms: 1,
      availableFrom: '2026-10-01',
      tags: ['אינטרנט', 'כביסה'],
      interestedCount: 8,
    },
  ];

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6 p-4 md:p-8">
      {/* Left: Map Placeholder */}
      <div className="flex-1 rounded-shutaf-lg bg-gradient-to-br from-teal-soft via-neutral-bg-soft to-orange-soft flex items-center justify-center min-h-96 md:min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-ink mb-2">מפה אינטראקטיבית</h2>
          <p className="text-muted-text">בעתיד: Mapbox / Leaflet integration</p>
        </div>
      </div>

      {/* Right: Listing Cards */}
      <div className="w-full md:w-96 space-y-4">
        <h3 className="text-lg font-bold text-ink mb-6">דירות קרובות</h3>
        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              price={listing.price}
              location={listing.location}
              bedrooms={listing.bedrooms}
              availableFrom={listing.availableFrom}
              tags={listing.tags}
              interestedCount={listing.interestedCount}
              onMessage={(id) => console.log('Message:', id)}
              onSave={(id) => console.log('Save:', id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
