/**
 * Replay state management using Zustand
 */

import { create } from 'zustand';
import type { 
  ReplayState, 
  GammaSnapshot, 
  PriceSnapshot 
} from '../types/gammaTypes';

interface ReplayStore extends ReplayState {
  // Historical data
  gammaSnapshots: GammaSnapshot[];
  priceSnapshots: PriceSnapshot[];
  
  // Replay controls
  isPlaying: boolean;
  currentTime: Date;
  playbackSpeed: number;
  selectedInterval: number;
  
  // Actions
  setHistoricalData: (data: {
    gammaSnapshots: GammaSnapshot[];
    priceSnapshots: PriceSnapshot[];
  }) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: Date) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedInterval: (interval: number) => void;
  jumpToTime: (time: Date) => void;
  stepForward: () => void;
  stepBackward: () => void;
  resetReplay: () => void;
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
  // Initial state
  gammaSnapshots: [],
  priceSnapshots: [],
  isPlaying: false,
  currentTime: new Date(),
  playbackSpeed: 1,
  selectedInterval: 5,
  
  // Actions
  setHistoricalData: (data) => set({
    gammaSnapshots: data.gammaSnapshots,
    priceSnapshots: data.priceSnapshots,
    currentTime: data.gammaSnapshots[0]?.timestamp || new Date(),
  }),
  
  setPlaying: (playing) => set({ isPlaying: playing }),
  
  setCurrentTime: (time) => set({ currentTime: time }),
  
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  
  setSelectedInterval: (interval) => set({ selectedInterval: interval }),
  
  jumpToTime: (time) => set({ currentTime: time }),
  
  stepForward: () => {
    const { gammaSnapshots, currentTime, playbackSpeed } = get();
    const currentIndex = gammaSnapshots.findIndex(
      s => s.timestamp.getTime() === currentTime.getTime()
    );
    
    if (currentIndex < gammaSnapshots.length - 1) {
      const nextIndex = Math.min(
        currentIndex + Math.floor(playbackSpeed),
        gammaSnapshots.length - 1
      );
      set({ currentTime: gammaSnapshots[nextIndex].timestamp });
    }
  },
  
  stepBackward: () => {
    const { gammaSnapshots, currentTime, playbackSpeed } = get();
    const currentIndex = gammaSnapshots.findIndex(
      s => s.timestamp.getTime() === currentTime.getTime()
    );
    
    if (currentIndex > 0) {
      const prevIndex = Math.max(
        currentIndex - Math.floor(playbackSpeed),
        0
      );
      set({ currentTime: gammaSnapshots[prevIndex].timestamp });
    }
  },
  
  resetReplay: () => set({
    isPlaying: false,
    currentTime: new Date(),
    playbackSpeed: 1,
    selectedInterval: 5,
  }),
}));
