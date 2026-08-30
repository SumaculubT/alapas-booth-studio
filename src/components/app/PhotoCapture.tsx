"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, X, RefreshCw, Check, SwitchCamera } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCamera } from "@/hooks/useCamera";
import { useCountdown } from "@/hooks/useCountdown";
import type { PhotoboothPhase } from "@/lib/types";

interface PhotoCaptureProps {
  onCaptureComplete: (photos: string[]) => void;
  onExit: () => void;
  photoCount: number;
  countdown: number;
}

const INPUT_LOCKED: PhotoboothPhase[] = [
  "camera_initializing",
  "countdown",
  "exposing",
  "advancing",
  "complete",
];

export default function PhotoCapture({
  onCaptureComplete,
  onExit,
  photoCount,
  countdown: initialCountdown,
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<PhotoboothPhase>("camera_initializing");

  const [phase, setPhase] = useState<PhotoboothPhase>("camera_initializing");
  const [confirmedPhotos, setConfirmedPhotos] = useState<string[]>([]);
  const [currentDraft, setCurrentDraft] = useState<string | null>(null);

  const camera = useCamera(videoRef);
  const countdown = useCountdown();

  const setPhaseSafe = useCallback((next: PhotoboothPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const expose = useCallback(() => {
    if (phaseRef.current === "exposing") return;
    if (!camera.videoReady || camera.isHidden || !canvasRef.current) {
      setPhaseSafe("ready");
      return;
    }
    setPhaseSafe("exposing");
    const dataUrl = camera.captureCoverFrame(canvasRef.current);
    if (!dataUrl) {
      setPhaseSafe("ready");
      return;
    }
    setCurrentDraft(dataUrl);
    setPhaseSafe("review");
  }, [camera, setPhaseSafe]);

  const armCountdown = useCallback(() => {
    if (
      !camera.videoReady ||
      camera.isHidden ||
      camera.error ||
      confirmedPhotos.length >= photoCount
    ) {
      return;
    }
    if (["countdown", "exposing", "review", "complete", "advancing"].includes(phaseRef.current)) {
      return;
    }
    setPhaseSafe("countdown");
    countdown.start(initialCountdown, expose);
  }, [camera.error, camera.isHidden, camera.videoReady, confirmedPhotos.length, countdown.start, expose, initialCountdown, photoCount, setPhaseSafe]);

  useEffect(() => {
    if (camera.error) {
      countdown.clear();
      setPhaseSafe("error");
      return;
    }
    if (!camera.videoReady) {
      if (phaseRef.current !== "review" && phaseRef.current !== "complete") {
        setPhaseSafe("camera_initializing");
      }
      return;
    }
    if (camera.isHidden) {
      countdown.clear();
      if (phaseRef.current === "countdown" || phaseRef.current === "exposing") {
        setPhaseSafe("ready");
      }
      return;
    }
    if (phaseRef.current === "camera_initializing" || phaseRef.current === "error") {
      setPhaseSafe("ready");
    }
  }, [camera.error, camera.isHidden, camera.videoReady, countdown.clear, setPhaseSafe]);

  useEffect(() => {
    if (phase !== "ready" || !camera.videoReady || camera.isHidden || camera.error) return;
    if (confirmedPhotos.length >= photoCount) return;
    const timer = setTimeout(() => {
      armCountdown();
    }, 800);
    return () => clearTimeout(timer);
  }, [armCountdown, camera.error, camera.isHidden, camera.videoReady, confirmedPhotos.length, phase, photoCount]);

  useEffect(() => {
    return () => {
      countdown.clear();
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
    };
  }, [countdown]);

  const handleInterrupt = useCallback(() => {
    countdown.clear();
    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
    camera.stopStream();
    onExit();
  }, [camera, countdown, onExit]);

  const handleRetake = useCallback(() => {
    if (phaseRef.current !== "review") return;
    setCurrentDraft(null);
    setPhaseSafe("ready");
  }, [setPhaseSafe]);

  const handleConfirm = useCallback(() => {
    if (phaseRef.current !== "review" || !currentDraft) return;
    setPhaseSafe("advancing");
    const nextPhotos = [...confirmedPhotos, currentDraft];
    setConfirmedPhotos(nextPhotos);
    setCurrentDraft(null);

    if (nextPhotos.length >= photoCount) {
      setPhaseSafe("complete");
      completeTimeoutRef.current = setTimeout(() => {
        completeTimeoutRef.current = null;
        onCaptureComplete(nextPhotos);
      }, 600);
      return;
    }
    setPhaseSafe("ready");
  }, [confirmedPhotos, currentDraft, onCaptureComplete, photoCount, setPhaseSafe]);

  useEffect(() => {
    if (phase !== "review") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleConfirm();
      } else if (event.code === "Space") {
        event.preventDefault();
        handleRetake();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleConfirm, handleRetake, phase]);

  const reviewLocked = INPUT_LOCKED.includes(phase);
  const showLive = phase !== "review" && phase !== "complete";
  const thumbCount = photoCount > 0 ? photoCount : 4;

  return (
    <div className="fixed inset-0 bg-black text-white">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        aria-label="Live camera preview"
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          camera.facingMode === "user" ? "-scale-x-100" : ""
        } ${showLive ? "opacity-100" : "opacity-0"}`}
      />
      {currentDraft && phase === "review" && (
        <img
          src={currentDraft}
          alt="Review captured photo"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <Button
        onClick={handleInterrupt}
        variant="ghost"
        size="icon"
        aria-label="Exit photo session"
        className="absolute left-4 top-4 z-10 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white [top:max(1rem,env(safe-area-inset-top))] [left:max(1rem,env(safe-area-inset-left))]"
      >
        <X size={32} />
      </Button>

      {camera.videoReady && !camera.error && (
        <Button
          onClick={camera.switchFacing}
          variant="ghost"
          size="icon"
          aria-label="Switch camera"
          disabled={reviewLocked}
          className="absolute right-4 top-4 z-10 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white [top:max(1rem,env(safe-area-inset-top))] [right:max(1rem,env(safe-area-inset-right))]"
        >
          <SwitchCamera size={28} />
        </Button>
      )}

      {phase === "countdown" && countdown.secondsLeft !== null && countdown.secondsLeft > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="relative flex h-64 w-64 items-center justify-center">
            <svg className="absolute h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
              <circle
                className="text-black/30"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="48"
                cx="50"
                cy="50"
              />
              <circle
                className="text-white"
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={((initialCountdown - countdown.secondsLeft + 1) / initialCountdown) * (2 * Math.PI * 48)}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="48"
                cx="50"
                cy="50"
                style={{ transition: "stroke-dashoffset 1s linear", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            </svg>
            <span className="text-9xl font-bold drop-shadow-lg" aria-live="assertive" aria-atomic="true">
              {countdown.secondsLeft}
            </span>
          </div>
        </div>
      )}

      {camera.isHidden && phase !== "complete" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-6 text-center">
          <p>Camera paused. Return to this tab to continue.</p>
        </div>
      )}

      {phase === "review" && (
        <div className="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center space-x-4 [bottom:max(4rem,env(safe-area-inset-bottom))]">
          <Button onClick={handleRetake} size="lg" variant="outline" className="px-8 py-6 text-lg" disabled={reviewLocked}>
            <RefreshCw className="mr-2" />
            Retake (Space)
          </Button>
          <Button onClick={handleConfirm} size="lg" className="px-8 py-6 text-lg" disabled={reviewLocked}>
            <Check className="mr-2" />
            Continue (Enter)
          </Button>
        </div>
      )}

      {phase === "error" && camera.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-4">
          <Alert variant="destructive" className="max-w-sm">
            <AlertTitle>{camera.error.title}</AlertTitle>
            <AlertDescription>{camera.error.description}</AlertDescription>
          </Alert>
          <Button className="mt-4" onClick={camera.retry}>
            Try again
          </Button>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 w-full max-w-lg -translate-x-1/2 px-4 [bottom:max(1rem,env(safe-area-inset-bottom))]">
        <div
          className="grid gap-2 rounded-lg bg-black/40 p-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(thumbCount, 4)}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: thumbCount }).map((_, i) => (
            <div key={i} className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-black/30">
              {confirmedPhotos[i] ? (
                <img src={confirmedPhotos[i]} alt={`Captured photo ${i + 1}`} className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-white/30">{i + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {phase === "complete" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex items-center justify-center text-lg text-white">
            <CheckCircle className="mr-2 h-5 w-5" />
            <p>All photos captured! Generating your strip...</p>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
