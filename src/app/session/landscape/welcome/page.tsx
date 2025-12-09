'use client';

import { Suspense, useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import welcomeImage from '@/lib/welcome.webp';

function WelcomeScreen() {
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
          router.replace('/session/strip/welcome');
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

  const handleStart = useCallback(() => {
    if (!sessionSettings) return;
    router.push('/session/landscape/capture');
  }, [sessionSettings, router]);

  const handleExit = useCallback(() => {
    // Clear any captured photos when exiting back to studio
    sessionStorage.removeItem('captured-photos');
    router.push('/studio/landscape');
  }, [router]);

  useEffect(() => {
    if (!sessionSettings) return;

    // Only handle keyboard events (Space to start)
    // Click events are handled by the div's onClick which checks e.target === e.currentTarget
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        handleStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleStart, sessionSettings]);

  if (!sessionSettings) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) handleStart(); }}>
      <Image src={welcomeImage} alt="Welcome to the photo booth" fill objectFit="cover" placeholder="blur" />
      <Button 
        onClick={(e) => {
          e.stopPropagation();
          handleExit();
        }} 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 left-4 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-white z-10"
      >
        <X size={32} />
      </Button>
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-center p-4 bg-black/50 rounded-xl">
        <h1 className="text-2xl font-bold">Touch the screen or press spacebar to start!</h1>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading...</div>}>
      <WelcomeScreen />
    </Suspense>
  );
}

