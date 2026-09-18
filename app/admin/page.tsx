'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  KeyRound, 
  Building2, 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  LogOut, 
  AlertCircle,
  Users,
  MapPin,
  Bike,
  Car
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { POLI_LIST, RS_NAME, RS_SHORT } from '@/lib/constants';

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

const DEFAULT_PIN = '1234';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [selectedPoli, setSelectedPoli] = useState<string>(POLI_LIST[0]);
  const [queues, setQueues] = useState<PatientQueue[]>([]);
  const [loading, setLoading] = useState(false);

  // Verifikasi PIN
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === DEFAULT_PIN) {
      setIsAuthenticated(true);
      setPinError('');
      sessionStorage.setItem('rsub_admin_auth', 'true');
    } else {
      setPinError('PIN salah. Silakan coba lagi.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('rsub_admin_auth');
  };

  useEffect(() => {
    const authStatus = sessionStorage.getItem('rsub_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch antrean dari Supabase
  const fetchQueues = async () => {
    const { data, error } = await supabase
      .from('queues')
      .select('*')
      .order('queue_number', { ascending: true });

    if (!error && data) {
      setQueues(data as PatientQueue[]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchQueues();

      const channel = supabase
        .channel('admin_queues_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'queues' },
          () => {
            fetchQueues();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  // Update Status Pasien
  const updatePatientStatus = async (id: number, status: 'in-progress' | 'completed' | 'cancelled') => {
    setLoading(true);
    await supabase.from('queues').update({ status }).eq('id', id);
    fetchQueues();
    setLoading(false);
  };

  // Reset Antrean Poli Tertentu
  const resetPoliQueue = async () => {
    if (confirm(`Apakah Anda yakin ingin mereset seluruh antrean untuk ${selectedPoli}?`)) {
      setLoading(true);
      await supabase.from('queues').delete().eq('poli', selectedPoli);
      fetchQueues();
      setLoading(false);
    }
  };

  const currentPoliQueues = queues.filter((q) => q.poli === selectedPoli);
  const activePatient = currentPoliQueues.find((q) => q.status === 'in-progress');
  const waitingPatients = currentPoliQueues.filter((q) => q.status === 'waiting');

  // Tampilan Login / Kunci Konsol
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-slate-200 text-center">
          
          {/* Logo pada Kartu Login */}
          <div className="relative w-16 h-16 mx-auto mb-3 drop-shadow-sm">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              fill 
              className="object-contain" 
              priority 
            />
          </div>

          <h1 className="text-xl font-black text-slate-800 tracking-tight">Portal Petugas RSUB</h1>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            {RS_NAME} — Masukkan PIN Loket
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {pinError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/25 active:scale-[0.98]"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Tampilan Dashboard Konsol Petugas
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Konsol dengan Logo */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 flex-shrink-0 drop-shadow-sm">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                fill 
                className="object-contain" 
              />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full">
                {RS_SHORT} Operator
              </span>
              <h1 className="text-xl font-black text-slate-800 mt-1">Konsol Pemanggilan Pasien</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Building2 className="w-4 h-4 text-blue-600 absolute left-3.5 top-3 pointer-events-none" />
              <select
                value={selectedPoli}
                onChange={(e) => setSelectedPoli(e.target.value)}
                className="w-full sm:w-56 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
              >
                {POLI_LIST.map((poli) => (
                  <option key={poli} value={poli}>
                    {poli}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-slate-200 transition"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Loket Aktif */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg shadow-blue-600/20 md:col-span-2 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-100 font-semibold block">
                Sedang Dilayani di Ruangan
              </span>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl md:text-5xl font-black">
                  {activePatient ? `#${activePatient.queue_number}` : '-'}
                </span>
                <span className="text-lg font-bold text-blue-100 truncate">
                  {activePatient ? activePatient.name : 'Tidak ada pasien aktif'}
                </span>
              </div>
            </div>

            {activePatient && (
              <div className="mt-5 flex gap-2">
                <button
                  disabled={loading}
                  onClick={() => updatePatientStatus(activePatient.id, 'completed')}
                  className="flex-1 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Selesai Pelayanan
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Menunggu ({selectedPoli})
              </span>
              <div className="flex items-center gap-2 mt-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-3xl font-black text-slate-800">{waitingPatients.length}</span>
                <span className="text-xs text-slate-500 font-medium">pasien</span>
              </div>
            </div>

            <button
              onClick={resetPoliQueue}
              disabled={loading || currentPoliQueues.length === 0}
              className="mt-4 w-full py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 font-bold rounded-xl text-xs transition border border-rose-100 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Antrean Poli Ini
            </button>
          </div>
        </div>

        {/* Daftar Antrean Menunggu */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Daftar Tunggu Pasien</h2>
            <span className="text-xs text-slate-400 font-medium">
              Real-time update aktif
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {waitingPatients.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada antrean yang menunggu di poli ini.
              </div>
            ) : (
              waitingPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-black text-lg text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100">
                      #{patient.queue_number}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{patient.name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 truncate max-w-[220px]">
                          <MapPin className="w-3 h-3 text-slate-400" /> {patient.location}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          {patient.travel_mode === 'motor' ? <Bike className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                          ±{patient.travel_time} mnt
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    onClick={() => updatePatientStatus(patient.id, 'in-progress')}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 text-blue-400" /> Panggil Masuk
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}