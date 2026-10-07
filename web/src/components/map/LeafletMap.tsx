'use client';

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

// Fixed-size box (not content-sized) so the div's own bounding rect — what
// Leaflet uses for click hit-testing — actually covers the visible pill.
// A CSS-transform-positioned auto-width tag leaves a 0x0 hit target.
function priceIcon(apt: Apartment, isSelected: boolean) {
  const roomPrice = apt.min_room_price ?? apt.price;
  const roomPriceLabel = apt.max_room_price && apt.max_room_price !== roomPrice
    ? `₪${roomPrice.toLocaleString()}+`
    : `₪${roomPrice.toLocaleString()}`;

  return L.divIcon({
    className: '',
    html: `<div
      data-testid="apartment-marker"
      data-apartment-id="${apt.id}"
      role="button"
      aria-label="${apt.title.replace(/"/g, '&quot;')}, ${roomPriceLabel} לחדר"
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
            icon={priceIcon(apt, apt.id === selectedId)}
            eventHandlers={{ click: () => onSelect(apt.id) }}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
