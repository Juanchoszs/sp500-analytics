/**
 * Hook for managing replay controls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import ReplayEngine from '../history/replayEngine';
import type { GammaSnapshot, PriceSnapshot } from '../types/gammaTypes';

export function useReplayControls() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const replayEngineRef = useRef<ReplayEngine | null>(null);
  const [currentData, setCurrentData] = useState<{
    gamma: GammaSnapshot;
    price: PriceSnapshot | null;
    index: number;
  } | null>(null);
  
  useEffect(() => {
    replayEngineRef.current = new ReplayEngine();
    
    return () => {
      replayEngineRef.current?.destroy();
    };
  }, []);
  
  const loadHistoricalData = useCallback((gammaSnapshots: GammaSnapshot[], priceSnapshots: PriceSnapshot[]) => {
    if (!replayEngineRef.current) return;
    
    replayEngineRef.current.loadData(gammaSnapshots, priceSnapshots);
    setTotalFrames(replayEngineRef.current.getTotalFrames());
    setCurrentFrame(0);
    setProgress(0);
    
    // Register callback for frame updates
    replayEngineRef.current.onTick((data) => {
      setCurrentData(data);
      setCurrentFrame(data.index);
      setProgress(replayEngineRef.current?.getProgress() || 0);
      setCurrentTime(data.gamma.timestamp);
    });
  }, []);
  
  const play = useCallback(() => {
    if (!replayEngineRef.current) return;
    
    replayEngineRef.current.play();
    setIsPlaying(true);
  }, []);
  
  const pause = useCallback(() => {
    if (!replayEngineRef.current) return;
    
    replayEngineRef.current.pause();
    setIsPlaying(false);
  }, []);
  
  const stop = useCallback(() => {
    if (!replayEngineRef.current) return;
    
    replayEngineRef.current.stop();
    setIsPlaying(false);
    setCurrentFrame(0);
    setProgress(0);
  }, []);
  
  const jumpToFrame = useCallback((frame: number) => {
    if (!replayEngineRef.current) return;
    
    replayEngineRef.current.jumpToIndex(frame);
    setCurrentFrame(frame);
    setProgress((frame / totalFrames) * 100);
  }, [totalFrames]);
  
  const jumpToTimestamp = useCallback((timestamp: Date) => {
    if (!replayEngineRef.current) return;
    
    replayEngineRef.current.jumpToTimestamp(timestamp);
  }, []);
  
  const stepForward = useCallback(() => {
    if (!replayEngineRef.current) return;
    
    replayEngineRef.current.stepForward();
    setCurrentFrame(replayEngineRef.current.getCurrentFrame());
    setProgress(replayEngineRef.current.getProgress());
  }, []);
  
  const stepBackward = useCallback(() => {
    if (!replayEngineRef.current) return;
    
    replayEngineRef.current.stepBackward();
    setCurrentFrame(replayEngineRef.current.getCurrentFrame());
    setProgress(replayEngineRef.current.getProgress());
  }, []);
  
  const changeSpeed = useCallback((speed: number) => {
    if (!replayEngineRef.current) return;
    
    replayEngineRef.current.setPlaybackSpeed(speed);
    setPlaybackSpeed(speed);
  }, []);
  
  return {
    isPlaying,
    currentTime,
    playbackSpeed,
    currentFrame,
    totalFrames,
    progress,
    currentData,
    loadHistoricalData,
    play,
    pause,
    stop,
    jumpToFrame,
    jumpToTimestamp,
    stepForward,
    stepBackward,
    changeSpeed,
  };
}
