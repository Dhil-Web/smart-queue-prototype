'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Car, 
  Bike, 
  Building2, 
  Sparkles, 
  ChevronLeft, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  UserCheck, 
  Play, 
  Check, 
  Plus, 
  ShieldCheck, 
  Users,
  Activity
} from 'lucide-react';

interface PatientQueue {
  id: number;
  queueNumber: number;
  name: string;
  poli: string;
  location: string;
  travelMode: 'motor' | 'mobil';
  travelTime: number;
  status: 'waiting' | 'in-progress' | 'completed';
  registeredAt: string;
}

export default function SmartArriveApp() {
  // Role switcher: 'patient' | 'receptionist'
  const [activeRole, setActiveRole] = useState<'patient' | 'receptionist'>('patient');

  // Master Data Antrean Bersama (State Terpusat)
  const [queueList, setQueueList] = useState<PatientQueue[]>([
    {
      id: 1,
      queueNumber: 11,
      name: 'Budi Santoso',
      poli: 'Poli Umum',
      location: 'Jl. Kalipat (±1 km)',
      travelMode: 'motor',
      travelTime: 5,
      status: 'completed',
      registeredAt: '08:00'
    },
    {
      id: 2,
      queueNumber: 12,
      name: 'Siti Rahma',
      poli: 'Poli Umum',
      location: 'Jl. Soekarno-Hatta (±4 km)',
      travelMode: 'motor',
      travelTime: 12,
      status: 'in-progress',
      registeredAt: '08:15'
    },
    {
      id: 3,
      queueNumber: 13,
      name: 'Rudi Hartono',
      poli: 'Poli Umum',
      location: 'Jl. MT Haryono (±2.5 km)',
      travelMode: 'mobil',
      travelTime: 15,
      status: 'waiting',
      registeredAt: '08:20'
    }
  ]);

  // State Form Pasien
  const [patientStep, setPatientStep] = useState<'form' | 'dashboard'>('form');
  const [patientName, setPatientName] = useState('');
  const [selectedPoli, setSelectedPoli] = useState('');
  const [userQueue, setUserQueue] = useState<number | ''>('');
  const [locationName, setLocationName] = useState('');
  const [travelMode, setTravelMode] = useState<'motor' | 'mobil'>('motor');
  const [travelTime, setTravelTime] = useState<number | ''>('');
  const [errorMessage, setErrorMessage] = useState('');

  // State Form Tambah Pasien Manual oleh Resepsionis
  const [adminName, setAdminName] = useState('');
  const [adminPoli, setAdminPoli] = useState('Poli Umum');
  const [adminLoc, setAdminLoc] = useState('Daftar Langsung di Loket RS');
  const [showAddModal, setShowAddModal] = useState(false);

  // Parameter Waktu & Antrean
  const avgServiceTime = 5; // 5 menit per pasien
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Antrean yang sedang dilayani saat ini
  const activePatient = queueList.find(p => p.status === 'in-progress');
  const currentQueueNum = activePatient ? activePatient.queueNumber : (queueList.find(p => p.status === 'waiting')?.queueNumber || 0);

  // Preset Jarak untuk Pasien
  const handleLocationPreset = (preset: 'dekat' | 'sedang' | 'jauh') => {
    if (preset === 'dekat') {
      setLocationName('Area Sekitar RS (±2 km)');
      setTravelTime(travelMode === 'motor' ? 7 : 12);
    } else if (preset === 'sedang') {
      setLocationName('Area Dalam Kota (±5 km)');
      setTravelTime(travelMode === 'motor' ? 15 : 22);
    } else {
      setLocationName('Area Pinggiran / Luar Kota (±10 km)');
      setTravelTime(travelMode === 'motor' ? 25 : 40);
    }
  };

  // Submit Registrasi Pasien
  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!patientName.trim()) {
      setErrorMessage('Nama lengkap pasien wajib diisi.');
      return;
    }
    if (!selectedPoli) {
      setErrorMessage('Silakan pilih poliklinik tujuan.');
      return;
    }
    if (userQueue === '' || Number(userQueue) <= 0) {
      setErrorMessage('Masukkan nomor antrean yang valid.');
      return;
    }
    if (!locationName.trim()) {
      setErrorMessage('Titik lokasi keberangkatan wajib diisi.');
      return;
    }
    if (travelTime === '' || Number(travelTime) <= 0) {
      setErrorMessage('Perkiraan waktu tempuh wajib diisi.');
      return;
    }

    const nextNumber = Number(userQueue);
    const newPatient: PatientQueue = {
      id: Date.now(),
      queueNumber: nextNumber,
      name: patientName,
      poli: selectedPoli,
      location: locationName,
      travelMode: travelMode,
      travelTime: Number(travelTime),
      status: 'waiting',
      registeredAt: currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setQueueList(prev => [...prev.filter(p => p.queueNumber !== nextNumber), newPatient]);
    setPatientStep('dashboard');
  };

  // Aksi Resepsionis: Panggil Pasien
  const handleCallPatient = (id: number) => {
    setQueueList(prev => prev.map(p => {
      if (p.id === id) return { ...p, status: 'in-progress' };
      if (p.status === 'in-progress') return { ...p, status: 'completed' };
      return p;
    }));
  };

  // Aksi Resepsionis: Tandai Pasien Selesai
  const handleCompletePatient = (id: number) => {
    setQueueList(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' } : p));
  };

  // Aksi Resepsionis: Tambah Pasien dari Loket
  const handleAdminAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) return;

    const maxQueue = queueList.reduce((max, p) => p.queueNumber > max ? p.queueNumber : max, 10);
    const newPatient: PatientQueue = {
      id: Date.now(),
      queueNumber: maxQueue + 1,
      name: adminName,
      poli: adminPoli,
      location: adminLoc,
      travelMode: 'motor',
      travelTime: 0,
      status: 'waiting',
      registeredAt: currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setQueueList(prev => [...prev, newPatient]);
    setAdminName('');
    setShowAddModal(false);
  };

  // Kalkulasi untuk Tampilan Pasien
  const numericUserQueue = typeof userQueue === 'number' ? userQueue : currentQueueNum;
  const numericTravelTime = typeof travelTime === 'number' ? travelTime : 0;
  const waitingPatientsBeforeUser = queueList.filter(p => p.queueNumber < numericUserQueue && p.status !== 'completed').length;
  const estimatedWaitMinutes = waitingPatientsBeforeUser * avgServiceTime;
  const estimatedCallDate = new Date(currentTime.getTime() + estimatedWaitMinutes * 60000);
  const departureDate = new Date(estimatedCallDate.getTime() - (numericTravelTime + 5) * 60000);

  const formatTime = (date: Date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-4 md:p-8 font-sans text-slate-800">
      
      {/* ROLE SWITCHER TOP BAR (UNTUK KEBUTUHAN DEMO & LOMBA) */}
      <div className="w-full max-w-4xl bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 px-3">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-700">Mode Sistem SmartArrive:</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveRole('patient')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeRole === 'patient' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" /> Portal Calon Pasien
          </button>
          <button
            onClick={() => setActiveRole('receptionist')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeRole === 'receptionist' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Dashboard Resepsionis RS
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAMPILAN 1: PORTAL CALON PASIEN                                            */}
      {/* ========================================================================= */}
      {activeRole === 'patient' && (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-2 text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              AI Patient Portal
            </div>
            <h1 className="text-2xl font-bold tracking-tight">SmartArrive AI</h1>
            <p className="text-xs text-blue-100 mt-0.5">Prediksi Kedatangan Presisi Tanpa Antre di RS</p>
          </div>

          {patientStep === 'form' ? (
            <form onSubmit={handlePatientSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Identitas Pasien *
                </label>
                <div className="space-y-2">
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

                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <select
                      required
                      value={selectedPoli}
                      onChange={(e) => setSelectedPoli(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition appearance-none cursor-pointer text-slate-700"
                    >
                      <option value="" disabled>-- Pilih Poliklinik Tujuan --</option>
                      <option value="Poli Umum">Poli Umum — dr. Hendra (Lt. 1)</option>
                      <option value="Poli Gigi">Poli Gigi & Mulut — drg. Sarah (Lt. 2)</option>
                      <option value="Poli Anak">Poli Tumbuh Kembang Anak (Lt. 2)</option>
                      <option value="Poli Penyakit Dalam">Poli Penyakit Dalam (Lt. 3)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-900">Nomor Antrean Anda *</p>
                  <p className="text-[11px] text-blue-600">Antrean faskes saat ini: #{currentQueueNum || 10}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-blue-600">#</span>
                  <input
                    type="number"
                    required
                    min="1"
                    max="99"
                    value={userQueue}
                    onChange={(e) => setUserQueue(e.target.value ? Number(e.target.value) : '')}
                    placeholder="14"
                    className="w-16 text-center font-bold text-lg py-1 bg-white border border-blue-200 rounded-lg text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Lokasi Keberangkatan Pasien *
                </label>

                <div className="relative mb-2">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Ketik alamat / titik mulai berangkat"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

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

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl flex-1">
                    <button
                      type="button"
                      onClick={() => { setTravelMode('motor'); setTravelTime(travelTime ? Math.max(5, Math.round(Number(travelTime) * 0.7)) : ''); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        travelMode === 'motor' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Bike className="w-3.5 h-3.5" /> Motor
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTravelMode('mobil'); setTravelTime(travelTime ? Math.round(Number(travelTime) * 1.4) : ''); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        travelMode === 'mobil' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" /> Mobil
                    </button>
                  </div>
                  
                  <div className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400">Durasi (Menit)</span>
                    <input
                      type="number"
                      required
                      min="1"
                      max="180"
                      value={travelTime}
                      onChange={(e) => setTravelTime(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0"
                      className="w-12 text-center text-xs font-bold text-slate-700 bg-transparent focus:outline-none"
                    />
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
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Pasien Terdaftar</span>
                  <h2 className="text-base font-bold text-slate-800">{patientName}</h2>
                  <p className="text-xs text-blue-600 font-medium">{selectedPoli} — RS Sehat Sentosa</p>
                </div>
                <button
                  onClick={() => setPatientStep('form')}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-600 flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Ubah Data
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center">
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Antrean Saat Ini</span>
                  <span className="text-3xl font-extrabold text-slate-800">#{currentQueueNum}</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 text-center">
                  <span className="text-[11px] font-medium text-blue-600 block mb-1">Nomor Kamu</span>
                  <span className="text-3xl font-extrabold text-blue-600">#{numericUserQueue}</span>
                </div>
              </div>

              <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Titik Berangkat:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">{locationName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Sisa antrean di depan:</span>
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
                    *Sudah termasuk cadangan 5 menit buffer sebelum dipanggil.
                  </p>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setActiveRole('receptionist')}
                  className="text-xs text-slate-400 hover:text-indigo-600 underline font-medium transition"
                >
                  Buka Dashboard Resepsionis untuk memproses antrean →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAMPILAN 2: DASHBOARD RESEPSIONIS / ADMIN POLIKLINIK RS                   */}
      {/* ========================================================================= */}
      {activeRole === 'receptionist' && (
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          
          {/* Header Resepsionis */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                Loket Resepsionis Faskes
              </div>
              <h1 className="text-2xl font-bold">Manajemen Antrean Cerdas</h1>
              <p className="text-xs text-slate-300">RS Sehat Sentosa — Poliklinik Terintegrasi AI</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm text-center border border-white/10">
                <span className="text-[10px] text-slate-300 block">Antrean Berjalan</span>
                <span className="text-xl font-black text-amber-400">#{currentQueueNum || '-'}</span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md"
              >
                <Plus className="w-4 h-4" /> Pasien Loket Manual
              </button>
            </div>
          </div>

          {/* Statistik Cepat */}
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Sedang Dilayani</span>
                <span className="text-lg font-bold text-slate-800">
                  {queueList.filter(p => p.status === 'in-progress').length} Pasien
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Menunggu / Perjalanan</span>
                <span className="text-lg font-bold text-slate-800">
                  {queueList.filter(p => p.status === 'waiting').length} Pasien
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Selesai Berobat</span>
                <span className="text-lg font-bold text-slate-800">
                  {queueList.filter(p => p.status === 'completed').length} Pasien
                </span>
              </div>
            </div>
          </div>

          {/* Tabel Antrean */}
          <div className="p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Daftar Permintaan & Antrean Pasien
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-3">No. Antrean</th>
                    <th className="py-3 px-3">Nama Pasien & Poli</th>
                    <th className="py-3 px-3">Status Lokasi / Jarak</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Aksi Resepsionis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queueList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-3">
                        <span className="text-sm font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          #{item.queueNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                        <span className="text-[11px] text-blue-600">{item.poli} • Daftar {item.registeredAt}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{item.location}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Estimasi tiba: ±{item.travelTime} mnt ({item.travelMode})
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {item.status === 'in-progress' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                            <Activity className="w-3 h-3" /> Sedang Diperiksa
                          </span>
                        )}
                        {item.status === 'waiting' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                            <Clock className="w-3 h-3" /> Menunggu / OTW
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <Check className="w-3 h-3" /> Selesai
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {item.status === 'waiting' && (
                          <button
                            onClick={() => handleCallPatient(item.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition inline-flex items-center gap-1 text-[11px]"
                          >
                            <Play className="w-3 h-3" /> Panggil Pasien
                          </button>
                        )}
                        {item.status === 'in-progress' && (
                          <button
                            onClick={() => handleCompletePatient(item.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition inline-flex items-center gap-1 text-[11px]"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Selesai Layanan
                          </button>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-slate-400 text-[11px] font-medium">Terselesaikan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PASIEN DI LOKET OLEH ADMIN */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-800 mb-1">Tambah Pasien Loket Manual</h2>
            <p className="text-xs text-slate-500 mb-4">Untuk pasien yang datang langsung tanpa aplikasi</p>

            <form onSubmit={handleAdminAddPatient} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nama Pasien</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Nama Pasien"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Poli Tujuan</label>
                <select
                  value={adminPoli}
                  onChange={(e) => setAdminPoli(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Poli Umum">Poli Umum</option>
                  <option value="Poli Gigi">Poli Gigi & Mulut</option>
                  <option value="Poli Anak">Poli Anak</option>
                  <option value="Poli Penyakit Dalam">Poli Penyakit Dalam</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/20"
                >
                  Simpan Antrean
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}