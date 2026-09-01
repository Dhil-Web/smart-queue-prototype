'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [currentQueue, setCurrentQueue] = useState(12);
  const [userQueue] = useState(18);
  const [travelTime, setTravelTime] = useState(10);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchEstimate = async () => {
    setLoading(true);
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate();
  }, [currentQueue, travelTime]);

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-6">
        
        {/* Header Poli & RS */}
        <div className="border-b pb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Live Queue Tracker
          </span>
          <h1 className="text-xl font-bold text-slate-800 mt-2">SmartArrive AI</h1>
          <p className="text-sm text-slate-500">Poli Umum — RS Sehat Sentosa</p>
        </div>

        {/* Status Antrean */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <p className="text-xs text-slate-500 font-medium">Antrean Saat Ini</p>
            <p className="text-3xl font-extrabold text-slate-800 mt-1">#{currentQueue}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <p className="text-xs text-blue-600 font-medium">Nomor Kamu</p>
            <p className="text-3xl font-extrabold text-blue-700 mt-1">#{userQueue}</p>
          </div>
        </div>

        {/* Panel Rekomendasi Keberangkatan */}
        {data && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Sisa antrean di depan:</span>
              <span className="font-semibold text-slate-800">{data.remainingPeople} pasien</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Estimasi giliran:</span>
              <span className="font-semibold text-slate-800">{data.estimatedCallTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Estimasi perjalanan:</span>
              <span className="font-semibold text-slate-800">±{travelTime} menit</span>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center bg-blue-600 text-white p-3 rounded-lg">
                <div>
                  <p className="text-xs text-blue-100 font-medium">Rekomendasi Berangkat</p>
                  <p className="text-xl font-bold">{data.departureTime}</p>
                </div>
                <span className="text-2xl">🚗</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic text-center pt-1">
              *Termasuk buffer cadangan {data.bufferMinutes} menit sebelum giliran dipanggil.
            </p>
          </div>
        )}

        {/* Panel Kontrol Simulasi (Demo Juri) */}
        <div className="pt-2 border-t border-slate-200 space-y-3">
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

          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Waktu Tempuh Rumah → RS:</span>
              <span className="font-medium">{travelTime} menit</span>
            </div>
            <input
              type="range"
              min="5"
              max="45"
              step="5"
              value={travelTime}
              onChange={(e) => setTravelTime(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

      </div>
    </main>
  );
}
