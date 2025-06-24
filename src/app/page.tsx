import React from 'react';
import { useFireproof } from 'use-fireproof';
// 🔥 FIREPROOF IMPORTS FOR MAXIMUM PERSISTENCE 🔥
import { useLiveQuery, useDocument } from 'use-fireproof';

import NewFireproofPlayer from '../components/NewFireproofPlayer'; 

export default function Home() {
  // 🔥 FIREPROOF HOOKS FOR ULTIMATE DATA PERSISTENCE 🔥
  const { useLiveQuery: useFireproofQuery } = useFireproof("bmir-audio-player");
  
  return (
    <div>
      {/* 🔥 FIREPROOF AUDIO PLAYER - DATA NEVER DIES 🔥 */}
      <NewFireproofPlayer />
    </div>
  );
} 