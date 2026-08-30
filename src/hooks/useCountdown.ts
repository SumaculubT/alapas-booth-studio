"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCountdown() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onCompleteRef.current = null;
    setSecondsLeft(null);
  }, []);

  const start = useCallback((seconds: number, onComplete: () => void) => {
    clear();
    const duration = Math.max(1, seconds);
    let remaining = duration;
    onCompleteRef.current = onComplete;
    setSecondsLeft(remaining);

    intervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setSecondsLeft(null);
        const complete = onCompleteRef.current;
        onCompleteRef.current = null;
        complete?.();
        return;
      }
      setSecondsLeft(remaining);
    }, 1000);
  }, [clear]);

  const startAfter = useCallback((delayMs: number, seconds: number, onComplete: () => void) => {
    clear();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      start(seconds, onComplete);
    }, delayMs);
  }, [clear, start]);

  useEffect(() => clear, [clear]);

  return {
    secondsLeft,
    isActive: secondsLeft !== null,
    start,
    startAfter,
    clear,
  } as const;
