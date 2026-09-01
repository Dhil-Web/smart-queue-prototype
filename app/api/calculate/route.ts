import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentQueue = 10, userQueue = 18, avgServiceTime = 5, travelTimeMinutes = 10 } = body;

    const remainingPeople = Math.max(0, Number(userQueue) - Number(currentQueue));
    const waitTimeMinutes = remainingPeople * Number(avgServiceTime);

    const now = new Date();
    const estimatedCallTime = new Date(now.getTime() + waitTimeMinutes * 60000);
    const bufferMinutes = 5;

    const departureTime = new Date(
      estimatedCallTime.getTime() - (Number(travelTimeMinutes) + bufferMinutes) * 60000
    );

    return NextResponse.json({
      remainingPeople,
      waitTimeMinutes,
      estimatedCallTime: estimatedCallTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      departureTime: departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bufferMinutes
    });
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan kalkulasi' }, { status: 400 });
  }
}