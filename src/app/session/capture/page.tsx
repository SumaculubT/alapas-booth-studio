'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoCapture from '@/components/app/PhotoCapture';

function CaptureScreen() {
  const router = useRouter();
  const [sessionSettings, setSessionSettings] = useState<{
    photoCount: number;
    countdown: number;
    filter: string;
    size: string;
  } | null>(null);

  useEffect(() => {
    const savedSettings = sessionStorage.getItem('session-settings');
    if (savedSettings) {
      try {
        setSessionSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error parsing session settings:', error);
        router.replace('/studio');
      }
    } else {
      router.replace('/studio');
    }
  }, [router]);

  const handleCaptureComplete = (photos: string[]) => {
    sessionStorage.setItem('captured-photos', JSON.stringify(photos));
    router.push('/session/preview');
  };

  const handleExit = () => {
    router.push('/session/welcome');
  };

  if (!sessionSettings) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
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
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading camera...</div>}>
      <CaptureScreen />
    </Suspense>
  );
}
