'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ikon Pin Leaflet
const patientIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const hospitalIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RouteMapProps {
  userCoords: { lat: number; lng: number };
  hospitalCoords: { lat: number; lng: number };
  routeGeoJSON?: any;
}

export default function RouteMap({ userCoords, hospitalCoords, routeGeoJSON }: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        [userCoords.lat, userCoords.lng],
        13
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Bersihkan marker & rute lama sebelum render baru
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });

    // Pasang Pin Lokasi Pasien & Pin RSUB
    L.marker([userCoords.lat, userCoords.lng], { icon: patientIcon })
      .addTo(map)
      .bindPopup('<b>Lokasi Anda</b>');

    L.marker([hospitalCoords.lat, hospitalCoords.lng], { icon: hospitalIcon })
      .addTo(map)
      .bindPopup('<b>RSUB Malang</b>');

    // Gambar Garis Rute Biru
    if (routeGeoJSON) {
      const routeLayer = L.geoJSON(routeGeoJSON, {
        style: {
          color: '#2563eb',
          weight: 5,
          opacity: 0.85,
        },
      }).addTo(map);

      map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });
    } else {
      const bounds = L.latLngBounds(
        [userCoords.lat, userCoords.lng],
        [hospitalCoords.lat, hospitalCoords.lng]
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [userCoords, hospitalCoords, routeGeoJSON]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-48 rounded-2xl border border-blue-200 shadow-inner overflow-hidden z-0"
    />
  );
}