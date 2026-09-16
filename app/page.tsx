'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Navigation,
  Edit3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { POLI_LIST } from '@/lib/constants';

interface PatientQueue {
  id: number;
  queue_number: number;
  name: string;
  poli: string;
  location: string;
  travel_mode: 'motor' | 'mobil';
  travel_time: number;
  status: 'waiting' | 'in-progress' | 'completed' | 'cancelled';
}

const STORAGE_KEY = 'smartarrive_patient_session';

export default function PatientPage() {
  const [step, setStep] = useState<'form' | 'dashboard'>('form');
  const [queueList, setQueueList] = useState<PatientQueue[]>([]);

  // State Form Pasien
  const [registeredQueueId, setRegisteredQueueId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');
  const [selectedPoli, setSelectedPoli] = useState<string>('Poli Umum');
  
  // Opsi Input Lokasi: 'auto' | 'manual'
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>('auto');
  const [locationName, setLocationName] = useState('');
  
  // State Jarak Manual
  const [distanceType, setDistanceType] = useState<'less_1' | 'custom'>('less_1');
  const [customDistanceKm, setCustomDistanceKm] = useState<number | ''>('');

  const [travelMode, setTravelMode] = useState<'motor' | 'mobil'>('motor');
  const [travelTime, setTravelTime] = useState<number | ''>('');
  const [assignedQueue, setAssignedQueue] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetNotice, setResetNotice] = useState(false);
  const [completedNotice, setCompletedNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Modal Peringatan Ubah Data
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [isUpdatingOldData, setIsUpdatingOldData] = useState(false);

  const avgServiceTime = 5;
  const [currentTime, setCurrentTime] = useState(new Date());

  const activeIdRef = useRef<number | null>(null);
  activeIdRef.current = registeredQueueId;

  // Rumus hitung durasi dari jarak (km)
  const calculateDurationFromKm = (km: number, mode: 'motor' | 'mobil') => {
    if (km <= 0) return 3;
    if (mode === 'motor') {
      // Kecepatan rata-rata motor kota ~25 km/h + 2 menit traffic
      return Math.max(3, Math.round((km / 25) * 60 + 2));
    } else {
      // Kecepatan rata-rata mobil kota ~18 km/h + 4 menit traffic & parkir
      return Math.max(5, Math.round((km / 18) * 60 + 4));
    }
  };

  // Re-kalkulasi durasi saat jarak manual atau moda transportasi berubah
  useEffect(() => {
    if (locationMode === 'manual') {
      const dist = distanceType === 'less_1' ? 0.8 : (typeof customDistanceKm === 'number' ? customDistanceKm : 0);
      if (dist > 0) {
        setTravelTime(calculateDurationFromKm(dist, travelMode));
      }
    }
  }, [distanceType, customDistanceKm, travelMode, locationMode]);

  // Baca Sesi Lokal
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) {
          setRegisteredQueueId(parsed.id);
          activeIdRef.current = parsed.id;
          setPatientName(parsed.name || '');
          setSelectedPoli(parsed.poli || 'Poli Umum');
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

  // Preset Otomatis
  const handleLocationPreset = (preset: 'dekat' | 'sedang' | 'jauh') => {
    if (preset === 'dekat') {
      setLocationName('Area Sekitar RS (±2 km)');
      setTravelTime(calculateDurationFromKm(2, travelMode));
    } else if (preset === 'sedang') {
      setLocationName('Area Dalam Kota (±5 km)');
      setTravelTime(calculateDurationFromKm(5, travelMode));
    } else {
      setLocationName('Area Pinggiran / Luar Kota (±10 km)');
      setTravelTime(calculateDurationFromKm(10, travelMode));
    }
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    if (!patientName.trim() || !selectedPoli || !locationName.trim() || travelTime === '') {
      setErrorMessage('Semua field wajib diisi.');
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

    // Label titik lokasi yang disimpan
    const finalLocationLabel = locationMode === 'manual'
      ? `${locationName} (${distanceType === 'less_1' ? '<1 km' : `${customDistanceKm} km`})`
      : locationName;

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
  
  const estimatedWaitMinutes = waitingPatientsBeforeUser * avgServiceTime;
  const estimatedCallDate = new Date(currentTime.getTime() + estimatedWaitMinutes * 60000);
  const numericTravelTime = typeof travelTime === 'number' ? travelTime : 0;
  const departureDate = new Date(estimatedCallDate.getTime() - (numericTravelTime + 5) * 60000);

  const formatTime = (date: Date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden relative">
        
        {/* Header Pasien */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-2 text-blue-100">
            RS Sehat Sentosa
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Antrian</h1>
        </div>

        {/* Notifikasi Sesi Di-reset Admin */}
        {resetNotice && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2 animate-bounce">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Sesi antrean poli telah direset oleh petugas. Silakan daftar kembali jika dibutuhkan.</span>
          </div>
        )}

        {/* Notifikasi Pelayanan Selesai */}
        {completedNotice && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Pelayanan Selesai!</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Pemeriksaan Anda telah selesai. Terima kasih telah memanfaatkan layanan antrean terintegrasi.
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

            {/* Pilihan Poliklinik */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Pilih Poliklinik Tujuan *
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

            {/* Nomor Antrean Otomatis */}
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

            {/* Lokasi Pasien (Dua Opsi: Otomatis vs Manual) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Lokasi Keberangkatan *
                </label>
                {/* Tab Switcher */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationMode('auto');
                      setLocationName('');
                      setTravelTime('');
                    }}
                    className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                      locationMode === 'auto' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    <Navigation className="w-3 h-3" /> Otomatis
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationMode('manual');
                      setLocationName('');
                      setDistanceType('less_1');
                      setCustomDistanceKm('');
                      setTravelTime(calculateDurationFromKm(0.8, travelMode));
                    }}
                    className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                      locationMode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" /> Manual
                  </button>
                </div>
              </div>

              {/* TAMPILAN OPSI 1: OTOMATIS */}
              {locationMode === 'auto' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Pilih salah satu preset di bawah"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleLocationPreset('dekat')}
                      className="py-1 px-2 text-[11px] font-medium rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition border border-transparent hover:border-blue-200"
                    >
                      Dekat (~2km)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLocationPreset('sedang')}
                      className="py-1 px-2 text-[11px] font-medium rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition border border-transparent hover:border-blue-200"
                    >
                      Sedang (~5km)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLocationPreset('jauh')}
                      className="py-1 px-2 text-[11px] font-medium rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition border border-transparent hover:border-blue-200"
                    >
                      Jauh (~10km)
                    </button>
                  </div>
                </div>
              ) : (
                /* TAMPILAN OPSI 2: MANUAL */
                <div className="space-y-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Alamat / Nama Tempat Pasien
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Contoh: Jl. Danau Ranau No. 12, Sawojajar"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Estimasi Jarak ke Rumah Sakit
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
                        &lt; 1 km (Sangat Dekat)
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
                        ≥ 1 km (Isi Jarak)
                      </button>
                    </div>

                    {distanceType === 'custom' && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500">Jarak tempuh:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="150"
                          required
                          value={customDistanceKm}
                          onChange={(e) => setCustomDistanceKm(e.target.value ? Number(e.target.value) : '')}
                          placeholder="Misal: 4.5"
                          className="w-20 font-bold text-xs text-slate-800 bg-transparent focus:outline-none text-center border-b border-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-700">km</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Moda Transportasi & Hasil Durasi */}
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
                  <span className="text-[10px] text-slate-400">Durasi Tempuh</span>
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
                  Mendaftarkan Antrean...
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
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Pasien Terdaftar</span>
                <h2 className="text-base font-bold text-slate-800">{patientName}</h2>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-0.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {selectedPoli}
                </div>
              </div>
              <button
                onClick={() => setShowEditWarning(true)}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 p-1.5 rounded-lg hover:bg-rose-50 transition border border-rose-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Ubah Data
              </button>
            </div>

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
                <span className="text-[11px] font-medium text-blue-600 block mb-1">Nomor Kamu</span>
                <span className="text-3xl font-extrabold text-blue-600">#{assignedQueue}</span>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Titik Berangkat:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">{locationName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Antrean di depan ({selectedPoli}):</span>
                <span className="font-bold text-slate-800 text-sm">{waitingPatientsBeforeUser} pasien</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Perkiraan giliran dipanggil:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {waitingPatientsBeforeUser > 0 ? formatTime(estimatedCallDate) : 'Sekarang!'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Waktu tempuh ({travelMode === 'motor' ? 'Motor' : 'Mobil'}):</span>
                <span className="font-bold text-slate-800">±{numericTravelTime} menit</span>
              </div>
            </div>

            <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-600/20 text-center relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-xs uppercase tracking-wider text-blue-100 font-semibold block mb-0.5">
                  Rekomendasi Berangkat Dari Rumah
                </span>
                <div className="text-3xl font-black tracking-tight my-1">
                  {waitingPatientsBeforeUser > 0 ? formatTime(departureDate) : 'Segera Menuju Ruangan'}
                </div>
                <p className="text-[10px] text-blue-100/90 italic">
                  *Tersinkronisasi khusus antrean dokter {selectedPoli}.
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
                Mengubah data akan membatalkan antrean <span className="font-bold text-rose-600">#{assignedQueue} ({selectedPoli})</span>. Anda perlu mendaftar antrean baru setelahnya.
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