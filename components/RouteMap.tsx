'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);

  const tomtomKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || '';

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // 1. Inisialisasi peta Leaflet
    const map = L.map(mapContainerRef.current).setView(
      [userCoords.lat, userCoords.lng],
      13
    );
    mapInstanceRef.current = map;

    // 2. Gunakan Tile TomTom (Traffic & Map) jika API Key ada, atau fallback ke OpenStreetMap
    if (tomtomKey) {
      // Tile Peta Dasar TomTom
      L.tileLayer(
        `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomtomKey}`,
        {
          attribution: '&copy; <a href="https://www.tomtom.com">TomTom</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      // Tile Kemacetan Real-Time (Traffic Flow) TomTom
      L.tileLayer(
        `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${tomtomKey}`,
        {
          attribution: 'Traffic &copy; TomTom',
          maxZoom: 19,
          opacity: 0.7,
        }
      ).addTo(map);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
    }

    // 3. Marker Pasien (Biru)
    const patientIcon = L.divIcon({
      className: '',
      html: '<div style="width: 18px; height: 18px; background-color: #2563eb; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([userCoords.lat, userCoords.lng], { icon: patientIcon })
      .addTo(map)
      .bindPopup('Posisi Kamu');

    // 4. Marker Rumah Sakit (Merah)
    const hospitalIcon = L.divIcon({
      className: '',
      html: '<div style="width: 18px; height: 18px; background-color: #e11d48; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([hospitalCoords.lat, hospitalCoords.lng], { icon: hospitalIcon })
      .addTo(map)
      .bindPopup('RSUB');

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [tomtomKey, hospitalCoords.lat, hospitalCoords.lng, userCoords.lat, userCoords.lng]);

  // Gambar rute jalan raya jika GeoJSON diterima
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !routeGeoJSON) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }

    routeLayerRef.current = L.geoJSON(routeGeoJSON, {
      style: {
        color: '#2563eb',
        weight: 5,
        opacity: 0.8,
      },
    }).addTo(map);

    try {
      const bounds = routeLayerRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch {
      // Abaikan jika bounds belum terbaca
    }
  }, [routeGeoJSON]);

  return (
    <div className="w-full h-56 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}