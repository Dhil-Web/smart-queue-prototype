'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Import komponen Leaflet secara dinamis (disable SSR agar tidak crash di Next.js)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// Koordinat gerbang masuk RSUB (titik X Jalan Soekarno-Hatta)
const RSUB_COORDS = { lat: -7.940263, lng: 112.617468 };

export default function Home() {
  const [currentQueue, setCurrentQueue] = useState(12);
  const [userQueue] = useState(18);
  const [travelTime, setTravelTime] = useState(10);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: -7.9355, // Titik simulasi awal di Mojolangu
    lng: 112.6145,
  });
  const [data, setData] = useState<any>(null);

  // Ambil rute & estimasi waktu tempuh dari OSRM
  const fetchRouteAndDuration = async (lat: number, lng: number) => {
    try {
      // Format OSRM: {lng},{lat}
      const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${RSUB_COORDS.lng},${RSUB_COORDS.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.routes && json.routes.length > 0) {
        const route = json.routes[0];
        // Leaflet format: [lat, lng]
        const latLngs: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        setRouteCoords(latLngs);
        setTravelTime(Math.max(1, Math.round(route.duration / 60)));
        setDistanceKm(Number((route.distance / 1000).toFixed(1)));
      }
    } catch (err) {
      console.error('Gagal mengambil rute OSRM:', err);
    }
  };

  // Hitung jadwal antrean
  const fetchQueueEstimate = async () => {
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentQueue,
          userQueue,
          avgServiceTime: 5,
          travelTimeMinutes: travelTime,
        }),
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Gagal menghitung antrean:', err);
    }
  };

  // Deteksi lokasi asli pengguna via browser GPS
  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          fetchRouteAndDuration(coords.lat, coords.lng);
        },
        (err) => {
          console.warn('Geolocation ditolak/gagal, memakai titik default Mojolangu', err);
          fetchRouteAndDuration(userCoords.lat, userCoords.lng);
        }
      );
    } else {
      fetchRouteAndDuration(userCoords.lat, userCoords.lng);
    }
  };

  useEffect(() => {
    fetchRouteAndDuration(userCoords.lat, userCoords.lng);
  }, []);

  useEffect(() => {
    fetchQueueEstimate();
  }, [currentQueue, travelTime]);

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-5">
        
        {/* Header Poli & RS */}
        <div className="border-b pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Live Queue Tracker
            </span>
            <button
              onClick={handleDetectLocation}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              📍 Perbarui Lokasi
            </button>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mt-2">SmartArrive AI</h1>
          <p className="text-sm text-slate-500">Poli Umum — RS Universitas Brawijaya</p>
        </div>

        {/* Peta Leaflet & Rute OSRM */}
        <div className="rounded-xl overflow-hidden border border-slate-200 h-48 w-full relative z-0">
          <MapContainer
            center={[RSUB_COORDS.lat, RSUB_COORDS.lng]}
            zoom={15}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Titik User */}
            <Marker position={[userCoords.lat, userCoords.lng]}>
              <Popup>Posisi Pasien</Popup>
            </Marker>
            {/* Titik Masuk RSUB */}
            <Marker position={[RSUB_COORDS.lat, RSUB_COORDS.lng]}>
              <Popup>Gerbang Masuk RSUB</Popup>
            </Marker>
            {/* Garis Rute */}
            {routeCoords.length > 0 && (
              <Polyline positions={routeCoords} color="#2563eb" weight={5} />
            )}
          </MapContainer>
        </div>

        {/* Status Jarak */}
        {distanceKm !== null && (
          <div className="flex justify-between items-center text-xs text-slate-500 px-1">
            <span>Jarak Rute Aktual ke RSUB:</span>
            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {distanceKm} km
            </span>
          </div>
        )}

        {/* Status Antrean */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <p className="text-xs text-slate-500 font-medium">Antrean Saat Ini</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">#{currentQueue}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
            <p className="text-xs text-blue-600 font-medium">Nomor Kamu</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-1">#{userQueue}</p>
          </div>
        </div>

        {/* Panel Rekomendasi Waktu Keberangkatan */}
        {data && (
          <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Sisa antrean di depan:</span>
              <span className="font-semibold text-slate-800">{data.remainingPeople} pasien</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Estimasi giliran:</span>
              <span className="font-semibold text-slate-800">{data.estimatedCallTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Waktu perjalanan (OSRM):</span>
              <span className="font-semibold text-slate-800">±{travelTime} menit</span>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="flex justify-between items-center bg-blue-600 text-white p-3 rounded-lg">
                <div>
                  <p className="text-xs text-blue-100 font-medium">Rekomendasi Berangkat</p>
                  <p className="text-lg font-bold">{data.departureTime}</p>
                </div>
                <span className="text-2xl">🚗</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic text-center pt-1">
              *Sudah termasuk cadangan {data.bufferMinutes} menit sebelum nomor dipanggil.
            </p>
          </div>
        )}

        {/* Panel Kontrol Simulasi (Demo Juri) */}
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Kontrol Simulasi Antrean
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentQueue((prev) => Math.min(userQueue, prev + 1))}
              disabled={currentQueue >= userQueue}
              className="flex-1 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg transition"
            >
              +1 Pasien Selesai
            </button>
            <button
              onClick={() => setCurrentQueue(10)}
              className="px-3 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
            >
              Reset
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}