import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentQueue, userQueue, avgServiceTime = 5, travelTimeMinutes = 10 } = body;

    const remainingPeople = Math.max(0, userQueue - currentQueue);
    const waitTimeMinutes = remainingPeople * avgServiceTime;

    const now = new Date();
    const estimatedCallTime = new Date(now.getTime() + waitTimeMinutes * 60000);
    const bufferMinutes = 5;
    
    const departureTime = new Date(
      estimatedCallTime.getTime() - (travelTimeMinutes + bufferMinutes) * 60000
    );

    return NextResponse.json({
      remainingPeople,
      waitTimeMinutes,
      estimatedCallTime: estimatedCallTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      departureTime: departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bufferMinutes
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate' }, { status: 400 });
  }
}