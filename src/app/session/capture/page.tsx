"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoCapture from "@/components/app/PhotoCapture";
import { loadSessionSettings, setCapturedPhotos, type SessionSettings } from "@/lib/session";

function CaptureScreen() {
  const router = useRouter();
  const [sessionSettings, setSessionSettings] = useState<SessionSettings | null>(null);

  useEffect(() => {
    const settings = loadSessionSettings();
    if (!settings) {
      router.replace("/studio");
      return;
    }
    setSessionSettings(settings);
  }, [router]);

  const handleCaptureComplete = (photos: string[]) => {
    setCapturedPhotos(photos);
    router.push("/session/preview");
  };

  const handleExit = () => {
    router.push("/session/welcome");
  };

  if (!sessionSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <div>Loading camera...</div>
      </div>
    );
  }

  return (
    <PhotoCapture
      onCaptureComplete={handleCaptureComplete}
      onExit={handleExit}
      photoCount={sessionSettings.photoCount}
      countdown={sessionSettings.countdown}
    />
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black text-white">Loading camera...</div>}>
      <CaptureScreen />
    </Suspense>
  );
}
