'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix icon marker Leaflet di bundler Webpack/Next.js
const patientIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const hospitalIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Auto-fit kamera peta agar kedua titik terlihat
function MapBoundsUpdater({
  userCoords,
  hospitalCoords,
}: {
  userCoords: { lat: number; lng: number };
  hospitalCoords: { lat: number; lng: number };
}) {
  const map = useMap();

  useEffect(() => {
    if (userCoords && hospitalCoords) {
      const bounds = L.latLngBounds(
        [userCoords.lat, userCoords.lng],
        [hospitalCoords.lat, hospitalCoords.lng]
      );
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
    }
  }, [userCoords, hospitalCoords, map]);

  return null;
}

interface RouteMapProps {
  userCoords: { lat: number; lng: number };
  hospitalCoords: { lat: number; lng: number };
  routeGeoJSON?: any;
}

export default function RouteMap({
  userCoords,
  hospitalCoords,
  routeGeoJSON,
}: RouteMapProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 h-52 w-full relative z-0">
      <MapContainer
        center={[hospitalCoords.lat, hospitalCoords.lng]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater userCoords={userCoords} hospitalCoords={hospitalCoords} />

        {/* Marker Pasien */}
        <Marker position={[userCoords.lat, userCoords.lng]} icon={patientIcon}>
          <Popup>Lokasi Berangkat Pasien</Popup>
        </Marker>

        {/* Marker RSUB (Kimia Farma / Pintu Masuk) */}
        <Marker position={[hospitalCoords.lat, hospitalCoords.lng]} icon={hospitalIcon}>
          <Popup>RS Brawijaya (Kimia Farma)</Popup>
        </Marker>

        {/* Garis Rute Biru */}
        {routeGeoJSON && (
          <GeoJSON
            key={JSON.stringify(routeGeoJSON)}
            data={routeGeoJSON}
            style={{
              color: '#2563eb',
              weight: 5,
              opacity: 0.85,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}