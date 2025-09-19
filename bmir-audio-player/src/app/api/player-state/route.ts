import { NextRequest, NextResponse } from 'next/server';

// Note: Since localStorage is client-side only, this API route is no longer needed
// The BrowserAudioPlayer component will handle localStorage directly

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Player state is now managed client-side with localStorage',
    playerState: null 
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Player state is now managed client-side with localStorage',
    success: true 
  });
} 