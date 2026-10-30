'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Tables } from '@/types/database';

type Apartment = Tables<'apartments_public'>;

// Beer Sheva city center — this is where Shutaf launches (DECISIONS.md L3).
const BEER_SHEVA_CENTER: [number, number] = [31.2530, 34.7915];

// DECISIONS.md D14: cluster below zoom 14. Individual pins from zoom 14 up.
const CLUSTER_MAX_ZOOM = 14;

// CARTO Basemaps browser key, restricted to the app's origins in CARTO.
// NEXT_PUBLIC values are embedded by Next.js at build time.
const CARTO_BASEMAPS_KEY = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY?.trim();
const CARTO_TILE_URL = CARTO_BASEMAPS_KEY
  ? `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_BASEMAPS_KEY)}`
  : null;

// Fixed-size box (not content-sized) so the div's own bounding rect — what
// Leaflet uses for click hit-testing — actually covers the visible pill.
// A CSS-transform-positioned auto-width tag leaves a 0x0 hit target.
function priceIcon(apt: Apartment, isSelected: boolean, en: boolean) {
  const roomPrice = apt.min_room_price ?? apt.price;
  const roomPriceLabel = apt.max_room_price && apt.max_room_price !== roomPrice
    ? `₪${roomPrice.toLocaleString()}+`
    : `₪${roomPrice.toLocaleString()}`;

  const label = `${apt.title}, ${roomPriceLabel} ${en ? 'per room' : 'לחדר'}`
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return L.divIcon({
    className: '',
    html: `<div
      data-testid="apartment-marker"
      data-apartment-id="${apt.id}"
      role="button"
      aria-label="${label}"
      aria-pressed="${isSelected}"
      style="
      width:100%;height:100%;
      display:flex;align-items:center;justify-content:center;
      background:${isSelected ? '#B5661F' : '#E2883A'};
      color:#fff;
      border-radius:16px;
      font-weight:700;
      font-size:12px;
      white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.3);
      border:2px solid white;
    ">${roomPriceLabel}</div>`,
    iconSize: [64, 28],
    iconAnchor: [32, 28],
  });
}

// DECISIONS.md D17: "A numbered dark-circle pin shown when overlapping pins
// collapse at low zoom."
function clusterIcon(cluster: L.MarkerCluster) {
  return L.divIcon({
    className: '',
    html: `<div
      data-testid="apartment-cluster"
      style="
      width:36px;height:36px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      background:#262220;
      color:#fff;
      font-weight:700;
      font-size:14px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.3);
    ">${cluster.getChildCount()}</div>`,
    iconSize: [36, 36],
  });
}

interface LeafletMapProps {
  apartments: Apartment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function LeafletMap({ apartments, selectedId, onSelect }: LeafletMapProps) {
  const [tileError, setTileError] = useState(false);
  const [tileLayerKey, setTileLayerKey] = useState(0);
  const en = usePathname().startsWith('/en/');

  const retryTiles = () => {
    setTileError(false);
    setTileLayerKey((current) => current + 1);
  };

  return (
    <div className="relative h-full">
      <MapContainer
        center={BEER_SHEVA_CENTER}
        zoom={13}
        maxZoom={18}
        scrollWheelZoom
        className="w-full h-full rounded-shutaf-lg"
      >
        {CARTO_TILE_URL && <TileLayer
          key={tileLayerKey}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={CARTO_TILE_URL}
          eventHandlers={{
            tileerror: () => setTileError(true),
          }}
        />}
        <MarkerClusterGroup
          iconCreateFunction={clusterIcon}
          disableClusteringAtZoom={CLUSTER_MAX_ZOOM}
          spiderfyOnMaxZoom={false}
          showCoverageOnHover={false}
        >
          {apartments.map((apt) => (
            <Marker
              key={apt.id}
              position={[apt.lat, apt.lng]}
              icon={priceIcon(apt, apt.id === selectedId, en)}
              title={apt.title}
              eventHandlers={{
                click: () => onSelect(apt.id),
                keydown: event => {
                  const key = event.originalEvent.key;
                  if (key === 'Enter' || key === ' ') {
                    event.originalEvent.preventDefault();
                    onSelect(apt.id);
                  }
                },
              }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      {(!CARTO_TILE_URL || tileError) && (
        <div
          className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-3 rounded-shutaf-lg bg-page-bg/90 p-6 text-center"
          role="alert"
        >
          <p className="font-semibold text-ink">{en ? 'Could not load the map' : 'לא הצלחנו לטעון את המפה'}</p>
          <p className="text-sm text-muted-text">{!CARTO_TILE_URL
            ? (en ? 'You can still browse the listings beside the map.' : 'אפשר להמשיך לעיין בדירות שברשימה לצד המפה.')
            : (en ? 'Check your connection and try again.' : 'בדקו את החיבור ונסו שוב.')}</p>
          {CARTO_TILE_URL && <button
            type="button"
            onClick={retryTiles}
            className="min-h-11 rounded-shutaf-md bg-orange px-4 py-2 font-semibold text-white hover:bg-orange-dark"
          >
            {en ? 'Retry' : 'ניסיון חוזר'}
          </button>}
        </div>
      )}
    </div>
  );
}
