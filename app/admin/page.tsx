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
  RotateCcw, 
  Stethoscope,
  XCircle,
  Filter
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
  created_at: string;
}

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const [queueList, setQueueList] = useState<PatientQueue[]>([]);
  const [selectedFilterPoli, setSelectedFilterPoli] = useState<string>('Semua Poli');
  const [loading, setLoading] = useState(true);

  // Form Tambah Pasien Manual
  const [adminName, setAdminName] = useState('');
  const [adminPoli, setAdminPoli] = useState<string>(POLI_LIST[0]);
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

  // Antrean yang difilter di tampilan tabel
  const filteredQueues = selectedFilterPoli === 'Semua Poli'
    ? queueList
    : queueList.filter((p) => p.poli === selectedFilterPoli);

  // Cari pasien aktif khusus poli tertentu
  const getActiveQueueNum = (poli: string) => {
    const list = queueList.filter((p) => p.poli === poli);
    const active = list.find((p) => p.status === 'in-progress');
    return active ? active.queue_number : (list.find((p) => p.status === 'waiting')?.queue_number || '-');
  };

  // Panggil pasien (otomatis selesaikan pasien aktif lain di poli yang sama saja)
  const handleCallPatient = async (id: number, patientPoli: string) => {
    const currentlyActiveInPoli = queueList.find(
      (p) => p.poli === patientPoli && p.status === 'in-progress'
    );
    if (currentlyActiveInPoli) {
      await supabase.from('queues').update({ status: 'completed' }).eq('id', currentlyActiveInPoli.id);
    }
    await supabase.from('queues').update({ status: 'in-progress' }).eq('id', id);
  };

  const handleCompletePatient = async (id: number) => {
    await supabase.from('queues').update({ status: 'completed' }).eq('id', id);
  };

  // Mengalihkan poli pasien ke poli lain dengan nomor antrean urut baru di poli tujuan
  const handleUpdatePoli = async (id: number, newPoli: string) => {
    // Ambil antrean terbesar di poli tujuan
    const targetPoliQueues = queueList.filter((p) => p.poli === newPoli);
    const nextNumInTarget = targetPoliQueues.length > 0
      ? Math.max(...targetPoliQueues.map((p) => p.queue_number)) + 1
      : 1;

    const { error } = await supabase
      .from('queues')
      .update({ poli: newPoli, queue_number: nextNumInTarget })
      .eq('id', id);

    if (error) {
      alert('Gagal memperbarui poli: ' + error.message);
    }
  };

  // Tambah pasien loket manual dengan auto-increment per poli
  const handleAdminAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) return;

    const poliQueues = queueList.filter((p) => p.poli === adminPoli);
    const maxQueueInPoli = poliQueues.reduce((max, p) => p.queue_number > max ? p.queue_number : max, 0);

    await supabase.from('queues').insert([
      {
        queue_number: maxQueueInPoli + 1,
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

  // Reset antrean (bisa pilih reset poli yang sedang difilter atau semua poli)
  const handleResetQueue = async () => {
    const isFiltering = selectedFilterPoli !== 'Semua Poli';
    const confirmMessage = isFiltering
      ? `Yakin ingin mereset antrean khusus "${selectedFilterPoli}"? Antrean poli ini akan kembali mulai dari #1.`
      : 'Yakin ingin mereset SEMUA antrean seluruh poli? Seluruh data akan dibersihkan.';

    const confirmReset = window.confirm(confirmMessage);
    if (!confirmReset) return;

    setIsResetting(true);

    let query = supabase.from('queues').delete();
    if (isFiltering) {
      query = query.eq('poli', selectedFilterPoli);
    } else {
      query = query.neq('id', 0);
    }

    const { error } = await query;

    if (!error) {
      fetchQueues();
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
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        
        {/* Header Admin */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              Multi-Poli Hospital Console
            </div>
            <h1 className="text-2xl font-bold">Manajemen Antrean Presisi</h1>
            <p className="text-xs text-slate-300">RS Sehat Sentosa — Triase & Antrean Mandiri Per Poli</p>
          </div>

          <div className="flex items-center gap-3">
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
              title={selectedFilterPoli === 'Semua Poli' ? 'Reset Semua Antrean' : `Reset Antrean ${selectedFilterPoli}`}
            >
              <RotateCcw className="w-4 h-4" />
              {isResetting ? 'Mereset...' : selectedFilterPoli === 'Semua Poli' ? 'Reset Semua' : `Reset ${selectedFilterPoli}`}
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

        {/* Filter Poli Tab Bar */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-6 py-3 flex items-center gap-2 overflow-x-auto text-xs text-white">
          <Filter className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mr-1" />
          <span className="font-bold text-slate-400 mr-2 flex-shrink-0">Filter Poli:</span>
          <button
            onClick={() => setSelectedFilterPoli('Semua Poli')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition ${
              selectedFilterPoli === 'Semua Poli' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semua Poli ({queueList.length})
          </button>
          {POLI_LIST.map((p) => {
            const count = queueList.filter((q) => q.poli === p && q.status !== 'cancelled').length;
            return (
              <button
                key={p}
                onClick={() => setSelectedFilterPoli(p)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition ${
                  selectedFilterPoli === p 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>

        {/* Statistik Ringkas */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block">Sedang Diperiksa</span>
              <span className="text-lg font-bold text-slate-800">
                {filteredQueues.filter((p) => p.status === 'in-progress').length} Pasien
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
                {filteredQueues.filter((p) => p.status === 'waiting').length} Pasien
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
                {filteredQueues.filter((p) => p.status === 'completed').length} Pasien
              </span>
            </div>
          </div>
        </div>

        {/* Tabel Antrean */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Daftar Antrean ({selectedFilterPoli})
            </h2>
            <span className="text-[11px] text-slate-400 italic">
              *Setiap poli memiliki nomor antrean 1..N yang terpisah
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sinkronisasi data Supabase...</p>
          ) : filteredQueues.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              Belum ada antrean untuk {selectedFilterPoli}. Antrean berikutnya dimulai dari #1.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-3">No. Antrean Poli</th>
                    <th className="py-3 px-3">Nama Pasien</th>
                    <th className="py-3 px-3">Poli Tujuan (Bisa Dialihkan)</th>
                    <th className="py-3 px-3">Estimasi Jarak & Titik Mulai</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Aksi Loket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueues.map((item) => {
                    const isCancelled = item.status === 'cancelled';

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition ${isCancelled ? 'bg-slate-50/90 opacity-60' : 'hover:bg-slate-50/80'}`}
                      >
                        <td className="py-3.5 px-3">
                          <span className={`text-sm font-extrabold px-2.5 py-1 rounded-lg border ${
                            isCancelled 
                              ? 'text-slate-400 bg-slate-100 border-slate-200 line-through' 
                              : 'text-blue-700 bg-blue-50 border-blue-200'
                          }`}>
                            #{item.queue_number}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className={`font-bold text-sm ${isCancelled ? 'text-slate-500' : 'text-slate-800'}`}>
                            {item.name}
                          </div>
                          <span className="text-[10px] text-slate-400">ID: {item.id}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className={`w-3.5 h-3.5 flex-shrink-0 ${isCancelled ? 'text-slate-300' : 'text-indigo-500'}`} />
                            {isCancelled ? (
                              <span className="text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded-lg text-xs">
                                {item.poli}
                              </span>
                            ) : (
                              <select
                                value={item.poli}
                                onChange={(e) => handleUpdatePoli(item.id, e.target.value)}
                                className="bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                              >
                                {POLI_LIST.map((poliName) => (
                                  <option key={poliName} value={poliName}>
                                    {poliName}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[170px]">{item.location}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Waktu tempuh: ±{item.travel_time} mnt ({item.travel_mode})
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          {item.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
                              <XCircle className="w-3 h-3 text-slate-500" /> Ubah Data
                            </span>
                          )}
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
                          {item.status === 'cancelled' ? (
                            <span className="text-slate-400 text-[11px] italic">Dibatalkan (Ubah Data)</span>
                          ) : item.status === 'waiting' ? (
                            <button
                              onClick={() => handleCallPatient(item.id, item.poli)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition inline-flex items-center gap-1 text-[11px]"
                            >
                              <Play className="w-3 h-3" /> Panggil
                            </button>
                          ) : item.status === 'in-progress' ? (
                            <button
                              onClick={() => handleCompletePatient(item.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition inline-flex items-center gap-1 text-[11px]"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Selesaikan
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-medium">Terselesaikan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
            <p className="text-xs text-slate-500 mb-4">Pilih poli tujuan untuk alokasi nomor antrean</p>

            <form onSubmit={handleAdminAddPatient} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Poli Tujuan</label>
                <select
                  value={adminPoli}
                  onChange={(e) => setAdminPoli(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {POLI_LIST.map((poliName) => (
                    <option key={poliName} value={poliName}>
                      {poliName}
                    </option>
                  ))}
                </select>
              </div>

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