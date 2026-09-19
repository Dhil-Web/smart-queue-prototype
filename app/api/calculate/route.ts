import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      currentQueue = 0,
      userQueue = 1,
      avgServiceTime = 6,
      travelTimeMinutes = 15,
      lastCalledTimeStr,
    } = body;

    const remainingPeople = Math.max(0, Number(userQueue) - Number(currentQueue));
    const waitTimeMinutes = remainingPeople * Number(avgServiceTime);

    const now = new Date();
    const bufferMinutes = 5;

    // Kalkulasi timestamp penambahan waktu
    const estimatedCallTimestamp = now.getTime() + waitTimeMinutes * 60 * 1000;
    const estimatedCallDate = new Date(estimatedCallTimestamp);

    const departureTimestamp =
      estimatedCallTimestamp - (Number(travelTimeMinutes) + bufferMinutes) * 60 * 1000;
    const departureDate = new Date(departureTimestamp);

    // Format jam wajib mengunci timeZone ke Asia/Jakarta (WIB)
    const formatToWIB = (date: Date) => {
      return (
        date.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).replace('.', ':') + ' WIB'
      );
    };

    return NextResponse.json({
      success: true,
      lastCalledAt: lastCalledTimeStr || formatToWIB(now),
      remainingPeople,
      waitTimeMinutes,
      estimatedCallTime: formatToWIB(estimatedCallDate),
      recommendedDepartureTime: formatToWIB(departureDate),
      bufferMinutes,
      isUrgent: departureTimestamp <= now.getTime(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal kalkulasi waktu' },
      { status: 400 }
    );
  }
}