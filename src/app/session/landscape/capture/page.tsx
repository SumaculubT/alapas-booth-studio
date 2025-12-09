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
    // Load session settings from sessionStorage
    const savedSettings = sessionStorage.getItem('session-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        // Verify it's for landscape layout (4x6)
        if (settings.size === '4x6') {
          setSessionSettings(settings);
        } else {
          // Wrong layout type, redirect to correct one
          router.replace('/session/strip/capture');
        }
      } catch (error) {
        console.error('Error parsing session settings:', error);
        router.replace('/studio/landscape');
      }
    } else {
      // No settings found, redirect to studio
      router.replace('/studio/landscape');
    }
  }, [router]);

  const handleCaptureComplete = (photos: string[]) => {
    // Store photos in sessionStorage temporarily to pass to preview
    sessionStorage.setItem('captured-photos', JSON.stringify(photos));
    router.push('/session/landscape/preview');
  };

  const handleExit = () => {
    router.push('/session/landscape/welcome');
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

