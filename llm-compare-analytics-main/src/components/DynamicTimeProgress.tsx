import React, { useEffect, useState } from 'react';
import { Progress } from './ui/progress';

interface DynamicTimeProgressProps {
  startTime: number;
  isComplete?: boolean;
  progress?: number;
  className?: string;
}

export function DynamicTimeProgress({
  startTime,
  isComplete = false,
  progress,
  className = '',
}: DynamicTimeProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (isComplete) {
      const endTime = performance.now();
      const elapsed = Math.max(0, (endTime - startTime) / 1000); // Convert to seconds
      setElapsedSeconds(elapsed);
      setDisplayProgress(100);
      return;
    }

    const interval = setInterval(() => {
      const now = performance.now();
      if (now >= startTime) {
        const elapsed = Math.max(0, (now - startTime) / 1000); // Convert to seconds
        setElapsedSeconds(elapsed);
      }
      
      if (typeof progress === 'number') {
        setDisplayProgress(progress);
      } else {
        setDisplayProgress(prev => (prev + 1) % 100);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [startTime, isComplete, progress]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span>Elapsed Time: {elapsedSeconds.toFixed(2)}s</span>
        {typeof progress === 'number' && (
          <span>{Math.round(progress)}%</span>
        )}
      </div>
      <Progress 
        value={displayProgress} 
        className={`transition-all ${typeof progress !== 'number' ? 'animate-pulse' : ''}`}
      />
    </div>
  );
} 