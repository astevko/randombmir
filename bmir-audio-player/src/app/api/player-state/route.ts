import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    const playerState = await redisService.getPlayerState(sessionId);
    return NextResponse.json({ playerState });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get player state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, playerState } = await request.json();
    if (!sessionId || !playerState) {
      return NextResponse.json({ error: 'sessionId and playerState required' }, { status: 400 });
    }
    await redisService.updatePlayerState(sessionId, playerState);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update player state' }, { status: 500 });
  }
} 