'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { 
  User, 
  MapPin, 
  Car, 
  Bike, 
  Building2, 
  ChevronLeft, 
  AlertCircle, 
  ArrowRight, 
  Hash, 
  AlertTriangle, 
  Loader2, 
  Info, 
  Stethoscope,
  CheckCircle2,
  LocateFixed,
  Edit3,
  Compass,
  Bell,
  Clock,
  Navigation
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { POLI_LIST, RS_NAME, RS_SHORT, RS_ADDRESS } from '@/lib/constants';

// Load Komponen Peta secara dinamis tanpa SSR
const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-52 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col items-center justify-center text-xs text-blue-500 gap-2">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Menyiapkan Peta Rute RSUB...</span>
    </div>
  ),
});

// Titik Gerbang Kimia Farma RSUB Malang (menghindari one-way Jl. Soekarno-Hatta)
const RSUB_COORDS = { lat: -7.94132, lng: 112.61715 };

interface PatientQueue {
  id: number;
  queue_number: number;
  name: string;
  poli: string;
  location: string;
  travel_mode: 'motor' | 'mobil';
  travel_time: number;
  status: 'waiting' | 'in-progress' | 'completed' | 'cancelled';
  updated_at?: string;
  created_at?: string;
}

interface CalculationResult {
  lastCalledAt: string;
  remainingPeople: number;
  estimatedCallTime: string;
  recommendedDepartureTime: string;
  bufferMinutes: number;
  isUrgent: boolean;
}

const STORAGE_KEY = 'smartarrive_patient_session';

export default function PatientPage() {
  const [step, setStep] = useState<'form' | 'dashboard'>('form');
  const [queueList, setQueueList] = useState<PatientQueue[]>([]);

  // State Form
  const [registeredQueueId, setRegisteredQueueId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');
  const [selectedPoli, setSelectedPoli] = useState<string>(POLI_LIST[0]);
  
  // Input Lokasi
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>('auto');
  const [locationName, setLocationName] = useState('');
  
  // Koordinat & Peta
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);

  // Jarak & GPS
  const [detectedDistanceKm, setDetectedDistanceKm] = useState<number | null>(null);
  const [distanceType, setDistanceType] = useState<'less_1' | 'custom'>('less_1');
  const [customDistanceKm, setCustomDistanceKm] = useState<number | ''>('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState('');

  const [travelMode, setTravelMode] = useState<'motor' | 'mobil'>('motor');
  const [travelTime, setTravelTime] = useState<number | ''>('');
  const [assignedQueue, setAssignedQueue] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetNotice, setResetNotice] = useState(false);
  const [completedNotice, setCompletedNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hasil Kalkulasi Server
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);

  // Modal Peringatan Ubah Data
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [isUpdatingOldData, setIsUpdatingOldData] = useState(false);

  const avgServiceTime = 6;
  const [currentTime, setCurrentTime] = useState(new Date());

  const activeIdRef = useRef<number | null>(null);
  activeIdRef.current = registeredQueueId;

  // Rumus estimasi durasi manual fallback
  const calculateDurationFromKm = (km: number, mode: 'motor' | 'mobil') => {
    if (km <= 0) return 3;
    if (mode === 'motor') {
      return Math.max(3, Math.round((km / 25) * 60 + 2));
    } else {
      return Math.max(5, Math.round((km / 18) * 60 + 4));
    }
  };

  useEffect(() => {
    if (locationMode === 'manual') {
      const dist = distanceType === 'less_1' ? 0.8 : (typeof customDistanceKm === 'number' ? customDistanceKm : 0);
      if (dist > 0) {
        setTravelTime(calculateDurationFromKm(dist, travelMode));
      }
    } else if (locationMode === 'auto' && detectedDistanceKm !== null) {
      setTravelTime(calculateDurationFromKm(detectedDistanceKm, travelMode));
    }
  }, [distanceType, customDistanceKm, detectedDistanceKm, travelMode, locationMode]);

  // Reverse Geocoding (Nominatim) + Routing OSRM
  const handleDetectGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setErrorMessage('Fitur GPS tidak didukung di peramban ini.');
      return;
    }

    setIsDetectingGps(true);
    setGpsStatusText('Mencari sinyal GPS...');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserCoords({ lat: userLat, lng: userLng });

        try {
          setGpsStatusText('Membaca nama wilayah (Nominatim)...');

          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLat}&lon=${userLng}`;
          const geoRes = await fetch(nominatimUrl, {
            headers: {
              'Accept-Language': 'id',
            },
          });
          const geoData = await geoRes.json();

          let resolvedAddress = 'Lokasi Pasien Terdeteksi';
          if (geoData && geoData.address) {
            const addr = geoData.address;
            const street = addr.road || addr.pedestrian || addr.residential || '';
            const village = addr.village || addr.suburb || addr.neighbourhood || '';
            const city = addr.city || addr.town || addr.municipality || 'Malang';

            const parts = [street, village, city].filter(Boolean);
            resolvedAddress = parts.length > 0 ? parts.join(', ') : geoData.display_name.split(',').slice(0, 3).join(',');
          }
          setLocationName(resolvedAddress);

          setGpsStatusText('Menggambar rute ke RSUB...');
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${RSUB_COORDS.lng},${RSUB_COORDS.lat}?overview=full&geometries=geojson`;
          const osrmRes = await fetch(osrmUrl);
          const osrmData = await osrmRes.json();

          if (osrmData.routes && osrmData.routes.length > 0) {
            const primaryRoute = osrmData.routes[0];
            const distanceMeters = primaryRoute.distance;
            const durationSeconds = primaryRoute.duration;

            setRouteGeoJSON(primaryRoute.geometry);

            const distKm = parseFloat((distanceMeters / 1000).toFixed(1));
            let durMinutes = Math.max(2, Math.round(durationSeconds / 60));

            if (travelMode === 'motor') {
              durMinutes = Math.max(2, Math.round(durMinutes * 0.75));
            }

            setDetectedDistanceKm(distKm);
            setTravelTime(durMinutes);
            setGpsStatusText(`Rute siap! Jarak: ${distKm} km ke RSUB`);
          } else {
            setDetectedDistanceKm(1.5);
            setTravelTime(5);
            setGpsStatusText('Posisi terkunci');
          }
        } catch (err) {
          console.error(err);
          setLocationName('Lokasi Terdeteksi (Malang)');
          setDetectedDistanceKm(2.0);
          setTravelTime(8);
          setGpsStatusText('Menggunakan estimasi default');
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsStatusText('');
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage('Izin lokasi ditolak. Silakan izinkan akses lokasi atau gunakan opsi Input Manual.');
        } else {
          setErrorMessage('Gagal mendeteksi lokasi GPS: ' + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Baca sesi lokal pasien
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) {
          setRegisteredQueueId(parsed.id);
          activeIdRef.current = parsed.id;
          setPatientName(parsed.name || '');
          setSelectedPoli(parsed.poli || POLI_LIST[0]);
          setLocationName(parsed.location || '');
          setTravelMode(parsed.travel_mode || 'motor');
          setTravelTime(parsed.travel_time || 0);
          setAssignedQueue(parsed.queue_number || 1);
          setStep('dashboard');
        }
      } catch (err) {
        console.error('Gagal membaca sesi lokal:', err);
      }
    }
  }, []);

  const fetchQueues = async () => {
    const { data, error } = await supabase
      .from('queues')
      .select('*')
      .order('queue_number', { ascending: true });

    if (!error && data) {
      const list = data as PatientQueue[];
      setQueueList(list);

      const currentActiveId = activeIdRef.current;
      if (currentActiveId) {
        const currentData = list.find((p) => p.id === currentActiveId);

        if (!currentData) {
          localStorage.removeItem(STORAGE_KEY);
          setRegisteredQueueId(null);
          activeIdRef.current = null;
          setStep('form');
          setResetNotice(true);
          setTimeout(() => setResetNotice(false), 6000);
          return;
        }

        if (currentData.status === 'completed') {
          localStorage.removeItem(STORAGE_KEY);
          setRegisteredQueueId(null);
          activeIdRef.current = null;
          setStep('form');
          setCompletedNotice(true);
          setTimeout(() => setCompletedNotice(false), 7000);
          return;
        }

        if (currentData.status === 'cancelled') {
          localStorage.removeItem(STORAGE_KEY);
          setRegisteredQueueId(null);
          activeIdRef.current = null;
          setStep('form');
          return;
        }

        if (currentData.poli !== selectedPoli) {
          setSelectedPoli(currentData.poli);
        }
      }
    }
  };

  useEffect(() => {
    fetchQueues();

    const channel = supabase
      .channel('realtime_patient_queues')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queues' },
        (payload) => {
          const currentActiveId = activeIdRef.current;

          if (payload.eventType === 'DELETE') {
            if (!payload.old || payload.old.id === currentActiveId || !currentActiveId) {
              localStorage.removeItem(STORAGE_KEY);
              setRegisteredQueueId(null);
              activeIdRef.current = null;
              setStep('form');
              setResetNotice(true);
              setTimeout(() => setResetNotice(false), 6000);
            }
          }

          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedRow = payload.new as PatientQueue;
            if (updatedRow.id === currentActiveId && updatedRow.status === 'completed') {
              localStorage.removeItem(STORAGE_KEY);
              setRegisteredQueueId(null);
              activeIdRef.current = null;
              setStep('form');
              setCompletedNotice(true);
              setTimeout(() => setCompletedNotice(false), 7000);
            }
          }

          fetchQueues();
        }
      )
      .subscribe();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  const currentPoliQueues = queueList.filter((p) => p.poli === selectedPoli);

  const nextQueueNumber = currentPoliQueues.length > 0 
    ? Math.max(...currentPoliQueues.map((p) => p.queue_number)) + 1 
    : 1;

  const activePoliPatient = currentPoliQueues.find((p) => p.status === 'in-progress');
  const currentPoliQueueNum = activePoliPatient 
    ? activePoliPatient.queue_number 
    : (currentPoliQueues.find((p) => p.status === 'waiting')?.queue_number || 0);

  // Waktu pemanggilan antrean sebelumnya
  const lastCalledTimeFormatted = activePoliPatient && activePoliPatient.updated_at
    ? new Date(activePoliPatient.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    : currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  // Request kalkulasi cerdas ke API Backend
  useEffect(() => {
    if (step === 'dashboard') {
      const runCalculation = async () => {
        try {
          const res = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentQueue: currentPoliQueueNum,
              userQueue: assignedQueue,
              avgServiceTime,
              travelTimeMinutes: typeof travelTime === 'number' ? travelTime : 15,
              lastCalledTimeStr: lastCalledTimeFormatted,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setCalcResult(data);
          }
        } catch (err) {
          console.error('Kalkulasi API error:', err);
        }
      };

      runCalculation();
    }
  }, [step, currentPoliQueueNum, assignedQueue, travelTime, lastCalledTimeFormatted]);

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    if (!patientName.trim() || !selectedPoli || !locationName.trim() || travelTime === '') {
      setErrorMessage(
        locationMode === 'auto'
          ? 'Silakan tekan tombol "Cari Posisi GPS Saya" terlebih dahulu.'
          : 'Semua field lokasi dan estimasi jarak wajib diisi.'
      );
      setIsSubmitting(false);
      return;
    }

    const { data: latestPoliData } = await supabase
      .from('queues')
      .select('queue_number')
      .eq('poli', selectedPoli)
      .order('queue_number', { ascending: false })
      .limit(1);

    const latestNumber = (latestPoliData && latestPoliData.length > 0) 
      ? latestPoliData[0].queue_number + 1 
      : 1;

    const finalLocationLabel = locationMode === 'manual'
      ? `${locationName} (${distanceType === 'less_1' ? '<1 km' : `${customDistanceKm || 1} km`})`
      : `${locationName} (${detectedDistanceKm || 0} km)`;

    const newPatient = {
      queue_number: latestNumber,
      name: patientName,
      poli: selectedPoli,
      location: finalLocationLabel,
      travel_mode: travelMode,
      travel_time: Number(travelTime),
      status: 'waiting'
    };

    const { data: insertedData, error } = await supabase
      .from('queues')
      .insert([newPatient])
      .select();

    if (error) {
      setErrorMessage('Gagal mendaftar antrean: ' + error.message);
      setIsSubmitting(false);
      return;
    }

    if (insertedData && insertedData.length > 0) {
      const savedItem = insertedData[0];
      setRegisteredQueueId(savedItem.id);
      activeIdRef.current = savedItem.id;
      setAssignedQueue(latestNumber);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItem));
    }

    setStep('dashboard');
    setIsSubmitting(false);
  };

  const handleConfirmEdit = async () => {
    setIsUpdatingOldData(true);
    if (registeredQueueId) {
      await supabase
        .from('queues')
        .update({ status: 'cancelled' })
        .eq('id', registeredQueueId);
      
      setRegisteredQueueId(null);
      activeIdRef.current = null;
    }

    localStorage.removeItem(STORAGE_KEY);
    setIsUpdatingOldData(false);
    setShowEditWarning(false);
    setStep('form');
  };

  const waitingPatientsBeforeUser = currentPoliQueues.filter(
    (p) => p.queue_number < assignedQueue && p.status === 'waiting'
  ).length;

  const numericTravelTime = typeof travelTime === 'number' ? travelTime : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden relative">
        
        {/* Header Pasien RSUB dengan Logo Baru */}
        <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-sky-700 p-6 text-white text-center relative flex flex-col items-center">
          <div className="relative w-14 h-14 mb-2 drop-shadow-md">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              fill 
              className="object-contain" 
              priority 
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-1.5 text-blue-100">
            🏥 {RS_SHORT}
          </div>
          <h1 className="text-xl font-black tracking-tight">{RS_NAME}</h1>
          <p className="text-[11px] text-blue-100/90 mt-0.5">{RS_ADDRESS}</p>
        </div>

        {/* Notifikasi Sesi Di-reset Admin */}
        {resetNotice && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2 animate-bounce">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Sesi antrean poli telah direset oleh petugas RSUB. Silakan daftar kembali jika dibutuhkan.</span>
          </div>
        )}

        {/* Notifikasi Pelayanan Selesai */}
        {completedNotice && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Pelayanan Selesai!</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Pemeriksaan Anda di {RS_SHORT} telah selesai. Terima kasih atas kunjungan Anda.
              </p>
            </div>
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handlePatientSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Pilihan Poliklinik RSUB */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Pilih Poliklinik RSUB Tujuan *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-blue-600 absolute left-3.5 top-3.5 pointer-events-none" />
                <select
                  required
                  value={selectedPoli}
                  onChange={(e) => setSelectedPoli(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-blue-50/40 border border-blue-200 font-semibold text-blue-950 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition appearance-none cursor-pointer"
                >
                  {POLI_LIST.map((poli) => (
                    <option key={poli} value={poli}>
                      {poli}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nomor Antrean Otomatis Sesuai Poli */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-blue-600" /> Antrean {selectedPoli}
                </p>
                <p className="text-[11px] text-slate-500">
                  {currentPoliQueues.filter((p) => p.status === 'waiting').length} pasien menunggu di poli ini
                </p>
              </div>
              <div className="flex items-center gap-1 bg-white px-3.5 py-1.5 rounded-xl border border-blue-200 shadow-sm">
                <span className="text-xs font-bold text-blue-500">#</span>
                <span className="font-extrabold text-xl text-blue-600">{nextQueueNumber}</span>
              </div>
            </div>

            {/* Nama Pasien */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Nama Lengkap Pasien *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Masukkan nama lengkap pasien"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Lokasi Keberangkatan */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Lokasi Keberangkatan ke RSUB *
                </label>
                {/* Switcher Tab */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationMode('auto');
                      setLocationName('');
                      setDetectedDistanceKm(null);
                      setUserCoords(null);
                      setRouteGeoJSON(null);
                      setTravelTime('');
                      setGpsStatusText('');
                    }}
                    className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                      locationMode === 'auto' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Compass className="w-3 h-3" /> Otomatis (GPS)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationMode('manual');
                      setLocationName('');
                      setUserCoords(null);
                      setRouteGeoJSON(null);
                      setDistanceType('less_1');
                      setCustomDistanceKm('');
                      setTravelTime(calculateDurationFromKm(0.8, travelMode));
                      setGpsStatusText('');
                    }}
                    className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                      locationMode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" /> Input Manual
                  </button>
                </div>
              </div>

              {/* TAB 1: OTOMATIS (GPS + NOMINATIM + PETA INTERAKTIF) */}
              {locationMode === 'auto' ? (
                <div className="space-y-2.5 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100">
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={isDetectingGps}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 active:scale-[0.99]"
                  >
                    {isDetectingGps ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mendeteksi Lokasi & Geocoding...</span>
                      </>
                    ) : (
                      <>
                        <LocateFixed className="w-4 h-4" />
                        <span>Cari Posisi GPS Saya & Buat Rute</span>
                      </>
                    )}
                  </button>

                  {/* Panel Peta Leaflet & Info Geocoding */}
                  {detectedDistanceKm !== null && userCoords ? (
                    <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm space-y-3">
                      
                      {/* Alamat Dinamis dari Nominatim */}
                      <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">
                            Hasil Geocoding (Nominatim)
                          </span>
                          <p className="text-xs font-semibold text-slate-800 leading-snug">
                            {locationName}
                          </p>
                        </div>
                      </div>

                      {/* Komponen Peta Leaflet */}
                      <RouteMap
                        userCoords={userCoords}
                        hospitalCoords={RSUB_COORDS}
                        routeGeoJSON={routeGeoJSON}
                      />

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Jarak Rute Aktual ke RSUB:</span>
                        <span className="text-sm font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                          {detectedDistanceKm} km
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 text-center italic py-1">
                      Klik tombol di atas untuk membaca nama jalan via Nominatim dan membuat rute ke RSUB.
                    </p>
                  )}

                  {gpsStatusText && (
                    <p className="text-[10px] text-blue-600 font-medium text-center">{gpsStatusText}</p>
                  )}
                </div>
              ) : (
                /* TAB 2: INPUT MANUAL */
                <div className="space-y-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Alamat / Nama Tempat Keberangkatan
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Contoh: Jl. Soekarno Hatta No. 9, Jatimulyo"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Estimasi Jarak ke RSUB
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setDistanceType('less_1')}
                        className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition ${
                          distanceType === 'less_1'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        &lt; 1 km (Sangat Dekat RSUB)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDistanceType('custom')}
                        className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition ${
                          distanceType === 'custom'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        ≥ 1 km (Isi Jarak Km)
                      </button>
                    </div>

                    {distanceType === 'custom' && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500">Jarak rute ke RSUB:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="150"
                          required
                          value={customDistanceKm}
                          onChange={(e) => setCustomDistanceKm(e.target.value ? Number(e.target.value) : '')}
                          placeholder="Misal: 3.5"
                          className="w-20 font-bold text-xs text-slate-800 bg-transparent focus:outline-none text-center border-b border-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-700">km</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pilihan Kendaraan & Durasi */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex bg-slate-100 p-1 rounded-xl flex-1">
                  <button
                    type="button"
                    onClick={() => setTravelMode('motor')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      travelMode === 'motor' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" /> Motor
                  </button>
                  <button
                    type="button"
                    onClick={() => setTravelMode('mobil')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      travelMode === 'mobil' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" /> Mobil
                  </button>
                </div>
                
                <div className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400">Durasi ke RSUB</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      required
                      min="1"
                      max="180"
                      value={travelTime}
                      onChange={(e) => setTravelTime(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0"
                      className="w-10 text-center text-xs font-bold text-blue-700 bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] font-semibold text-slate-500">menit</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mendaftarkan Antrean RSUB...
                </>
              ) : (
                <>
                  Hitung Rekomendasi Jam Berangkat
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* DASHBOARD TRACKER PASIEN */
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Pasien Terdaftar RSUB</span>
                <h2 className="text-base font-bold text-slate-800">{patientName}</h2>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-0.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {selectedPoli} — {RS_SHORT}
                </div>
              </div>
              <button
                onClick={() => setShowEditWarning(true)}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 p-1.5 rounded-lg hover:bg-rose-50 transition border border-rose-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Ubah Data
              </button>
            </div>

            {/* Status Nomor Antrean */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center">
                <span className="text-[11px] font-medium text-slate-500 block mb-1">
                  Panggilan {selectedPoli}
                </span>
                <span className="text-3xl font-extrabold text-slate-800">
                  {currentPoliQueueNum ? `#${currentPoliQueueNum}` : '-'}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 text-center">
                <span className="text-[11px] font-medium text-blue-600 block mb-1">Nomor Anda</span>
                <span className="text-3xl font-extrabold text-blue-600">#{assignedQueue}</span>
              </div>
            </div>

            {/* Peta Mini Live Tracker */}
            {userCoords && (
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <RouteMap
                  userCoords={userCoords}
                  hospitalCoords={RSUB_COORDS}
                  routeGeoJSON={routeGeoJSON}
                />
              </div>
            )}

            {/* Panel Ringkasan Detail Estimasi Antrean */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Waktu Pemanggilan Sebelumnya:
                </span>
                <span className="font-bold text-slate-700">
                  {calcResult?.lastCalledAt || lastCalledTimeFormatted}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Titik Berangkat:
                </span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">{locationName}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  Antrean di depan ({selectedPoli}):
                </span>
                <span className="font-bold text-slate-800">
                  {calcResult?.remainingPeople ?? waitingPatientsBeforeUser} pasien
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-slate-400" />
                  Estimasi Perjalanan ({travelMode === 'motor' ? 'Motor' : 'Mobil'}):
                </span>
                <span className="font-bold text-slate-800">±{numericTravelTime} menit</span>
              </div>

              <div className="flex justify-between items-center text-indigo-700 bg-indigo-50/70 px-2.5 py-1.5 rounded-xl border border-indigo-100 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  Perkiraan Giliran Anda Dipanggil:
                </span>
                <span className="font-bold text-indigo-900">
                  {calcResult?.estimatedCallTime || 'Menghitung...'}
                </span>
              </div>
            </div>

            {/* Banner Jadwal Berangkat Otomatis */}
            <div
              className={`p-4 rounded-2xl text-white shadow-lg text-center relative overflow-hidden transition-all duration-300 ${
                calcResult?.isUrgent || waitingPatientsBeforeUser === 0
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-rose-600/20'
                  : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 shadow-blue-700/20'
              }`}
            >
              <div className="relative z-10">
                <span className="text-xs uppercase tracking-wider text-white/80 font-bold block mb-0.5">
                  Rekomendasi Waktu Berangkat ke RSUB
                </span>
                <div className="text-3xl font-black tracking-tight my-1">
                  {waitingPatientsBeforeUser === 0
                    ? 'Segera Menuju Ruangan'
                    : calcResult?.recommendedDepartureTime || 'Menghitung...'}
                </div>
                <p className="text-[11px] text-white/90">
                  {waitingPatientsBeforeUser === 0
                    ? 'Antrean Anda sedang dipanggil dokter.'
                    : `*Sudah termasuk toleransi parkir & registrasi ulang ${calcResult?.bufferMinutes || 5} menit.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Peringatan Ubah Data */}
        {showEditWarning && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Peringatan Perubahan Data
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                Mengubah data akan membatalkan antrean <span className="font-bold text-rose-600">#{assignedQueue} ({selectedPoli})</span> di RSUB. Anda perlu mendaftar antrean baru setelahnya.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isUpdatingOldData}
                  onClick={() => setShowEditWarning(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isUpdatingOldData}
                  onClick={handleConfirmEdit}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
                >
                  {isUpdatingOldData ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Ya, Ubah Data'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}