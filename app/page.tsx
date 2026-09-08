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
  Clock, 
  ArrowRight,
  Hash,
  AlertTriangle,
  Loader2
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
}

export default function PatientPage() {
  const [step, setStep] = useState<'form' | 'dashboard'>('form');
  const [queueList, setQueueList] = useState<PatientQueue[]>([]);

  // State Form Pasien
  const [registeredQueueId, setRegisteredQueueId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');
  const [selectedPoli, setSelectedPoli] = useState('');
  const [locationName, setLocationName] = useState('');
  const [travelMode, setTravelMode] = useState<'motor' | 'mobil'>('motor');
  const [travelTime, setTravelTime] = useState<number | ''>('');
  const [assignedQueue, setAssignedQueue] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Modal Peringatan Ubah Data
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [isDeletingOldData, setIsDeletingOldData] = useState(false);

  const avgServiceTime = 5; // 5 menit per pasien
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchQueues = async () => {
    const { data, error } = await supabase
      .from('queues')
      .select('*')
      .order('queue_number', { ascending: true });

    if (!error && data) {
      setQueueList(data as PatientQueue[]);
    }
  };

  useEffect(() => {
    fetchQueues();

    const channel = supabase
      .channel('realtime_patient_queues')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queues' },
        () => {
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

  // Hitung nomor antrean berikutnya
  const nextQueueNumber = queueList.length > 0 
    ? Math.max(...queueList.map((p) => p.queue_number)) + 1 
    : 1;

  // Pasien yang sedang dilayani
  const activePatient = queueList.find((p) => p.status === 'in-progress');
  const currentQueueNum = activePatient 
    ? activePatient.queue_number 
    : (queueList.find((p) => p.status === 'waiting')?.queue_number || 0);

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

  // Submit Registrasi Pasien Baru
  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    if (!patientName.trim() || !selectedPoli || !locationName.trim() || travelTime === '') {
      setErrorMessage('Semua field wajib diisi.');
      setIsSubmitting(false);
      return;
    }

    // Ambil nomor antrean terbaru
    const { data: latestData } = await supabase
      .from('queues')
      .select('queue_number')
      .order('queue_number', { ascending: false })
      .limit(1);

    const latestNumber = (latestData && latestData.length > 0) ? latestData[0].queue_number + 1 : 1;

    const { data: insertedData, error } = await supabase.from('queues').insert([
      {
        queue_number: latestNumber,
        name: patientName,
        poli: selectedPoli,
        location: locationName,
        travel_mode: travelMode,
        travel_time: Number(travelTime),
        status: 'waiting'
      }
    ]).select();

    if (error) {
      setErrorMessage('Gagal mendaftar antrean: ' + error.message);
      setIsSubmitting(false);
      return;
    }

    if (insertedData && insertedData.length > 0) {
      setRegisteredQueueId(insertedData[0].id);
    }
    setAssignedQueue(latestNumber);
    setStep('dashboard');
    setIsSubmitting(false);
  };

  // Eksekusi Hapus Data Lama & Buka Form Kembali
  const handleConfirmEdit = async () => {
    setIsDeletingOldData(true);
    if (registeredQueueId) {
      await supabase
        .from('queues')
        .delete()
        .eq('id', registeredQueueId);
      setRegisteredQueueId(null);
    }
    setIsDeletingOldData(false);
    setShowEditWarning(false);
    setStep('form');
  };

  // Kalkulasi Dashboard Pasien
  const waitingPatientsBeforeUser = queueList.filter((p) => p.queue_number < assignedQueue && p.status !== 'completed').length;
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
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            AI Dynamic Queue Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SmartArrive AI</h1>
          <p className="text-xs text-blue-100 mt-0.5">Prediksi Kedatangan Presisi Tanpa Antre di RS</p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handlePatientSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Nomor Antrean Otomatis */}
            <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-blue-600" /> Nomor Antrean Kamu (Otomatis)
                </p>
                <p className="text-[11px] text-blue-600">
                  {queueList.filter((p) => p.status === 'waiting').length} pasien menunggu di antrean
                </p>
              </div>
              <div className="flex items-center gap-1 bg-white px-3.5 py-1.5 rounded-xl border border-blue-200 shadow-sm">
                <span className="text-xs font-bold text-blue-500">#</span>
                <span className="font-extrabold text-xl text-blue-600">{nextQueueNumber}</span>
              </div>
            </div>

            {/* Identitas Pasien */}
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

            {/* Lokasi Pasien */}
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

              {/* Preset Cepat */}
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

              {/* Pilihan Moda Transportasi & Durasi */}
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
                <p className="text-xs text-blue-600 font-medium">{selectedPoli} — RS Sehat Sentosa</p>
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
                <span className="text-[11px] font-medium text-slate-500 block mb-1">Antrean Saat Ini</span>
                <span className="text-3xl font-extrabold text-slate-800">#{currentQueueNum || '-'}</span>
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
                  *Tersinkronisasi otomatis dengan panggilan loket faskes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PERINGATAN UBAH DATA (MENCEGAH DUPLIKASI) */}
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
                Mengubah data akan <span className="font-bold text-rose-600">membatalkan antrean #{assignedQueue}</span> dan menghapus pendaftaran Anda sebelumnya dari server untuk mencegah duplikasi. Anda akan mendapatkan nomor antrean baru setelah mendaftar ulang.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isDeletingOldData}
                  onClick={() => setShowEditWarning(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingOldData}
                  onClick={handleConfirmEdit}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
                >
                  {isDeletingOldData ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menghapus...
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