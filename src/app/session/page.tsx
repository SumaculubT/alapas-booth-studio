
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PhotoCapture from '@/components/app/PhotoCapture';
import PhotoStripPreview from '@/components/app/PhotoStripPreview';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Layer = {
  id: string;
  type: 'image' | 'camera' | 'template';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isVisible: boolean;
  isLocked: boolean;
  url?: string;
  bgColor?: string;
};

type SessionStep = 'capture' | 'preview';

function PhotoBoothSession() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<SessionStep>('capture');
  const [templateLayout, setTemplateLayout] = useState<Layer[] | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  
  const eventSize = searchParams.get('size') || '2x6';
  const photoCount = Number(searchParams.get('photoCount')) || 4;
  const countdown = Number(searchParams.get('countdown')) || 5;

  useEffect(() => {
    // Load the template from session storage
    const savedTemplate = sessionStorage.getItem('snapstrip-template');
    if (savedTemplate) {
      setTemplateLayout(JSON.parse(savedTemplate));
    }
    // Directly go to capture step, skipping template selection
    setStep('capture');
  }, []);


  const handleCaptureComplete = (photos: string[]) => {
    setCapturedPhotos(photos);
    setStep('preview');
  };

  const handleRestart = () => {
    setCapturedPhotos([]);
    setStep('capture');
  };

  const renderStep = () => {
    switch (step) {
      case 'capture':
        return (
          <PhotoCapture
            onCaptureComplete={handleCaptureComplete}
            photoCount={photoCount}
            countdown={countdown}
          />
        );
      case 'preview':
        if (templateLayout) {
          return (
            <PhotoStripPreview
              templateLayout={templateLayout}
              photos={capturedPhotos}
              onRestart={handleRestart}
              eventSize={eventSize}
            />
          );
        }
        return <div>Loading template...</div>;
      default:
        return null;
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background text-foreground p-4 sm:p-8">
      <div className="w-full max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8">
           <Link href="/studio">
             <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Studio
            </Button>
           </Link>
           <h1 className="text-2xl font-bold font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            SnapStrip Session
          </h1>
        </header>

        <div className="w-full">
            {renderStep()}
        </div>

        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by Next.js and Firebase</p>
        </footer>
      </div>
    </main>
  );
}


export default function SessionPage() {
    return (
        <Suspense fallback={<div>Loading session...</div>}>
            <PhotoBoothSession />
        </Suspense>
    )
}
