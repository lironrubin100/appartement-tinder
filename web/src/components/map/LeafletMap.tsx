'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Tables } from '@/types/database';

type Apartment = Tables<'apartments'>;

// Beer Sheva city center — this is where Shutaf launches (DECISIONS.md L3).
const BEER_SHEVA_CENTER: [number, number] = [31.2530, 34.7915];

// Fixed-size box (not content-sized) so the div's own bounding rect — what
// Leaflet uses for click hit-testing — actually covers the visible pill.
// A CSS-transform-positioned auto-width tag leaves a 0x0 hit target.
function priceIcon(price: number, isSelected: boolean) {
  return L.divIcon({
    className: '',
    html: `<div style="
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
    ">₪${price.toLocaleString()}</div>`,
    iconSize: [64, 28],
    iconAnchor: [32, 28],
  });
}

interface LeafletMapProps {
  apartments: Apartment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function LeafletMap({ apartments, selectedId, onSelect }: LeafletMapProps) {
  return (
    <MapContainer
      center={BEER_SHEVA_CENTER}
      zoom={13}
      scrollWheelZoom
      className="w-full h-full rounded-shutaf-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {apartments.map((apt) => (
        <Marker
          key={apt.id}
          position={[apt.lat, apt.lng]}
          icon={priceIcon(apt.price, apt.id === selectedId)}
          eventHandlers={{ click: () => onSelect(apt.id) }}
        />
      ))}
    </MapContainer>
  );
}
