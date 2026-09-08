'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  Clock, 
  UserCheck, 
  Play, 
  Check, 
  CheckCircle2, 
  Plus, 
  MapPin, 
  Lock, 
  KeyRound, 
  LogOut,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PatientQueue {
  id: number;
  queue_number: number;
  name: string;
  poli: string;
  location: string;
  travel_mode: 'motor' | 'mobil';
  travel_time: number;
  status: 'waiting' | 'in-progress' | 'completed';
  created_at: string;
}

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const [queueList, setQueueList] = useState<PatientQueue[]>([]);
  const [loading, setLoading] = useState(true);

  const [adminName, setAdminName] = useState('');
  const [adminPoli, setAdminPoli] = useState('Poli Umum');
  const [adminLoc, setAdminLoc] = useState('Loket Pendaftaran RS');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('PIN Keamanan salah. Coba: 1234');
    }
  };

  const fetchQueues = async () => {
    const { data, error } = await supabase
      .from('queues')
      .select('*')
      .order('queue_number', { ascending: true });

    if (!error && data) {
      setQueueList(data as PatientQueue[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchQueues();

    const channel = supabase
      .channel('realtime_admin_queues')
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
  }, [isAuthenticated]);

  const activePatient = queueList.find(p => p.status === 'in-progress');
  const currentQueueNum = activePatient 
    ? activePatient.queue_number 
    : (queueList.find(p => p.status === 'waiting')?.queue_number || 0);

  const handleCallPatient = async (id: number) => {
    if (activePatient) {
      await supabase.from('queues').update({ status: 'completed' }).eq('id', activePatient.id);
    }
    await supabase.from('queues').update({ status: 'in-progress' }).eq('id', id);
  };

  const handleCompletePatient = async (id: number) => {
    await supabase.from('queues').update({ status: 'completed' }).eq('id', id);
  };

  const handleAdminAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) return;

    const maxQueue = queueList.reduce((max, p) => p.queue_number > max ? p.queue_number : max, 0);
    await supabase.from('queues').insert([
      {
        queue_number: maxQueue + 1,
        name: adminName,
        poli: adminPoli,
        location: adminLoc,
        travel_mode: 'motor',
        travel_time: 0,
        status: 'waiting'
      }
    ]);

    setAdminName('');
    setShowAddModal(false);
  };

  // Fitur Reset Seluruh Antrean
  const handleResetQueue = async () => {
    const confirmReset = window.confirm(
      'Apakah Anda yakin ingin mereset seluruh antrean? Semua data antrean saat ini akan dihapus dan antrean berikutnya kembali dari #1.'
    );
    if (!confirmReset) return;

    setIsResetting(true);
    const { error } = await supabase.from('queues').delete().neq('id', 0);

    if (!error) {
      setQueueList([]);
    } else {
      alert('Gagal mereset antrean: ' + error.message);
    }
    setIsResetting(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-800 text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Portal Petugas Faskes</h1>
          <p className="text-xs text-slate-500 mt-1 mb-6">RS Sehat Sentosa — Masukkan PIN Loket</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN (Default: 1234)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-indigo-600/25"
            >
              Buka Dashboard Loket
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-4 md:p-8 font-sans text-slate-800">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        
        {/* Header Admin */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              Loket Resepsionis & Dokter (Live Supabase)
            </div>
            <h1 className="text-2xl font-bold">Manajemen Antrean Presisi</h1>
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
              <Plus className="w-4 h-4" /> Pasien Loket
            </button>
            <button
              onClick={handleResetQueue}
              disabled={isResetting}
              className="px-3.5 py-2.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-rose-500/30"
              title="Reset seluruh antrean"
            >
              <RotateCcw className="w-4 h-4" />
              {isResetting ? 'Mereset...' : 'Reset Antrean'}
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition"
              title="Keluar / Kunci Layar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block">Sedang Diperiksa</span>
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
              <span className="text-[11px] text-slate-400 font-semibold block">Menunggu / OTW</span>
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

        {/* Tabel Pasien */}
        <div className="p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Daftar Antrean Pasien Masuk
          </h2>

          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sinkronisasi data Supabase...</p>
          ) : queueList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              Belum ada antrean terdaftar. Antrean berikutnya akan dimulai dari nomor #1.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-3">No. Antrean</th>
                    <th className="py-3 px-3">Nama Pasien & Poli</th>
                    <th className="py-3 px-3">Estimasi Jarak & Titik Mulai</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Aksi Loket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queueList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-3">
                        <span className="text-sm font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          #{item.queue_number}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                        <span className="text-[11px] text-blue-600">{item.poli}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{item.location}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Waktu tempuh: ±{item.travel_time} mnt ({item.travel_mode})
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {item.status === 'in-progress' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                            <Activity className="w-3 h-3" /> Diperiksa
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
                            <Play className="w-3 h-3" /> Panggil
                          </button>
                        )}
                        {item.status === 'in-progress' && (
                          <button
                            onClick={() => handleCompletePatient(item.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition inline-flex items-center gap-1 text-[11px]"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Selesaikan
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
          )}
        </div>
      </div>

      {/* Modal Tambah Pasien Manual */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-800 mb-1">Tambah Pasien Loket Manual</h2>
            <p className="text-xs text-slate-500 mb-4">Untuk pasien yang datang langsung ke RS</p>

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