import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      currentQueue = 10,
      userQueue = 15,
      avgServiceTime = 6, // Rata-rata menit per pasien
      travelTimeMinutes = 15, // Didapat dari routing OSRM / TomTom
      lastCalledTimeStr, // Opsional: misal "10:15"
    } = body;

    const remainingPeople = Math.max(0, userQueue - currentQueue);
    const waitTimeMinutes = remainingPeople * avgServiceTime;

    const now = new Date();

    // Waktu estimasi pasien ini akan dipanggil
    const estimatedCallDate = new Date(now.getTime() + waitTimeMinutes * 60000);

    // Buffer waktu parkir & registrasi ulang di poli (misal 5 menit)
    const bufferMinutes = 5;
    const totalPrepMinutes = travelTimeMinutes + bufferMinutes;

    // Rekomendasi waktu berangkat dari rumah
    const departureDate = new Date(estimatedCallDate.getTime() - totalPrepMinutes * 60000);

    const formatTime = (date: Date) =>
      date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    return NextResponse.json({
      success: true,
      lastCalledAt: lastCalledTimeStr || formatTime(now),
      currentQueue,
      userQueue,
      remainingPeople,
      travelTimeMinutes,
      bufferMinutes,
      estimatedCallTime: formatTime(estimatedCallDate),
      recommendedDepartureTime: formatTime(departureDate),
      isUrgent: departureDate <= now, // Jika waktu berangkat sudah lewat/mepet
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memproses estimasi antrean' }, { status: 400 });
  }
}