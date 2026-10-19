'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Point = { latitude: number; longitude: number };
const icon = L.divIcon({ className: '', html: '<span style="display:block;width:24px;height:24px;background:#E2883A;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #444"></span>', iconSize: [24, 24], iconAnchor: [12, 12] });

function Position({ point, onChange }: { point: Point | null; onChange: (point: Point) => void }) {
  const map = useMap();
  useMapEvents({ click: ({ latlng }) => onChange({ latitude: latlng.lat, longitude: latlng.lng }) });
  useEffect(() => { if (point) map.panTo([point.latitude, point.longitude]); }, [map, point]);
  return point && <Marker position={[point.latitude, point.longitude]} icon={icon} />;
}

export default function PrivateLocationPicker({ point, onChange }: { point: Point | null; onChange: (point: Point) => void }) {
  const key = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY?.trim();
  return (
    <div className="relative z-0 h-64 overflow-hidden rounded-shutaf-md" data-testid="private-location-map">
      <MapContainer center={point ? [point.latitude, point.longitude] : [31.253, 34.7915]} zoom={15} scrollWheelZoom={false} className="h-full w-full">
        {key && <TileLayer url={`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' />}
        <Position point={point} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
