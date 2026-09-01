'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Car, 
  Bike, 
  Activity, 
  ArrowRight, 
  Clock, 
  Building2, 
  RotateCcw,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

export default function SmartArriveApp() {
  // State Halaman: 'form' | 'dashboard'
  const [step, setStep] = useState<'form' | 'dashboard'>('form');

  // State Form Pasien
  const [patientName, setPatientName] = useState('Ahmad Fadhil');
  const [selectedPoli, setSelectedPoli] = useState('Poli Umum');
  const [userQueue, setUserQueue] = useState(18);
  const [locationName, setLocationName] = useState('Kost / Rumah (Jl. MT Haryono)');
  const [travelMode, setTravelMode] = useState<'motor' | 'mobil'>('motor');
  const [travelTime, setTravelTime] = useState(12); // Menit

  // State Simulasi Antrean Live
  const [currentQueue, setCurrentQueue] = useState(12);
  const [avgServiceTime] = useState(5); // 5 menit per pasien
  const [currentTime, setCurrentTime] = useState(new Date());

  // Jam Real-time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update perkiraan waktu tempuh saat ganti moda transportasi
  const handleLocationPreset = (preset: 'dekat' | 'sedang' | 'jauh') => {
    if (preset === 'dekat') {
      setLocationName('Sekitar Kampus / Jl. Veteran (±2 km)');
      setTravelTime(travelMode === 'motor' ? 7 : 12);
    } else if (preset === 'sedang') {
      setLocationName('Jl. Soekarno-Hatta / Suhat (±4.5 km)');
      setTravelTime(travelMode === 'motor' ? 12 : 20);
    } else {
      setLocationName('Sawojajar / Singosari (±9 km)');
      setTravelTime(travelMode === 'motor' ? 22 : 35);
    }
  };

  // Kalkulasi AI Waktu
  const remainingPatients = Math.max(0, userQueue - currentQueue);
  const estimatedWaitMinutes = remainingPatients * avgServiceTime;
  const estimatedCallDate = new Date(currentTime.getTime() + estimatedWaitMinutes * 60000);
  const bufferMinutes = 5;
  const departureDate = new Date(estimatedCallDate.getTime() - (travelTime + bufferMinutes) * 60000);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        
        {/* Header SmartArrive AI */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-2 text-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            AI Dynamic Queue Engine
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SmartArrive AI</h1>
          <p className="text-xs text-blue-100 mt-0.5">Prediksi Kedatangan Presisi Tanpa Antre di RS</p>
        </div>

        {/* TAMPILAN 1: FORM PENDAFTARAN & INPUT LOKASI */}
        {step === 'form' ? (
          <form 
            onSubmit={(e) => { e.preventDefault(); setStep('dashboard'); }}
            className="p-6 space-y-4"
          >
            {/* 1. Identitas Pasien */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Identitas Calon Pasien
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nama Lengkap Pasien"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    value={selectedPoli}
                    onChange={(e) => setSelectedPoli(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition appearance-none cursor-pointer text-slate-700"
                  >
                    <option value="Poli Umum">Poli Umum — dr. Hendra (Lt. 1)</option>
                    <option value="Poli Gigi">Poli Gigi & Mulut — drg. Sarah (Lt. 2)</option>
                    <option value="Poli Anak">Poli Tumbuh Kembang Anak (Lt. 2)</option>
                    <option value="Poli Penyakit Dalam">Poli Penyakit Dalam (Lt. 3)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Nomor Antrean Pasien */}
            <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-900">Nomor Antrean Anda</p>
                <p className="text-[11px] text-blue-600">Sesuai tiket pendaftaran faskes</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">#</span>
                <input
                  type="number"
                  min={currentQueue + 1}
                  max="99"
                  value={userQueue}
                  onChange={(e) => setUserQueue(Number(e.target.value))}
                  className="w-16 text-center font-bold text-lg py-1 bg-white border border-blue-200 rounded-lg text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 3. Lokasi Keberangkatan & Moda Transportasi */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Lokasi Keberangkatan Sekarang
              </label>

              <div className="relative mb-2">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Titik keberangkatan kamu saat ini"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Preset Jarak Cepat */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
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

              {/* Pilihan Kendaraan & Estimasi Waktu Tempuh */}
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl flex-1">
                  <button
                    type="button"
                    onClick={() => { setTravelMode('motor'); setTravelTime(Math.max(5, Math.round(travelTime * 0.7))); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      travelMode === 'motor' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" /> Motor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTravelMode('mobil'); setTravelTime(Math.round(travelTime * 1.4)); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      travelMode === 'mobil' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" /> Mobil
                  </button>
                </div>
                
                <div className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-center">
                  <span className="text-[10px] text-slate-400 block leading-tight">Waktu Tempuh</span>
                  <span className="text-xs font-bold text-slate-700">± {travelTime} menit</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-[0.98]"
            >
              Hitung Rekomendasi Jam Berangkat
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* TAMPILAN 2: LIVE QUEUE TRACKER & AI RECOMMENDATION */
          <div className="p-6 space-y-5">
            {/* Info Pasien Aktif */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Pasien Terdaftar</span>
                <h2 className="text-base font-bold text-slate-800">{patientName}</h2>
                <p className="text-xs text-blue-600 font-medium">{selectedPoli} — RS Sehat Sentosa</p>
              </div>
              <button
                onClick={() => setStep('form')}
                className="text-xs font-semibold text-slate-400 hover:text-blue-600 flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Ubah Data
              </button>
            </div>

            {/* Kotak Antrean Berjalan vs Nomor Pasien */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center">
                <span className="text-[11px] font-medium text-slate-500 block mb-1">Antrean Saat Ini</span>
                <span className="text-3xl font-extrabold text-slate-800">#{currentQueue}</span>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 text-center">
                <span className="text-[11px] font-medium text-blue-600 block mb-1">Nomor Kamu</span>
                <span className="text-3xl font-extrabold text-blue-600">#{userQueue}</span>
              </div>
            </div>

            {/* Rincian Estimasi */}
            <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Sisa antrean di depan:</span>
                <span className="font-bold text-slate-800 text-sm">{remainingPatients} pasien</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Perkiraan giliran dipanggil:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {remainingPatients > 0 ? formatTime(estimatedCallDate) : 'Sekarang!'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Waktu tempuh ({travelMode === 'motor' ? 'Motor' : 'Mobil'}):</span>
                <span className="font-bold text-slate-800">±{travelTime} menit</span>
              </div>
            </div>

            {/* Card Rekomendasi Jam Berangkat */}
            <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-600/20 text-center relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-xs uppercase tracking-wider text-blue-100 font-semibold block mb-0.5">
                  Rekomendasi Berangkat Dari Rumah
                </span>
                <div className="text-3xl font-black tracking-tight my-1">
                  {remainingPatients > 0 ? formatTime(departureDate) : 'Segera Menuju Ruangan'}
                </div>
                <p className="text-[10px] text-blue-100/90 italic">
                  *Sudah termasuk cadangan 5 menit buffer sebelum dipanggil.
                </p>
              </div>
            </div>

            {/* Panel Kontrol Simulasi Interaktif Pasien Maju */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Kontrol Simulasi Antrean (Demo Juri)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentQueue((prev) => Math.min(prev + 1, userQueue))}
                  disabled={currentQueue >= userQueue}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5" />
                  +1 Pasien Selesai
                </button>
                <button
                  onClick={() => setCurrentQueue(12)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}