
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
    // Load the layout and template from session storage
    const savedLayout = sessionStorage.getItem('snapstrip-layout');
    const savedTemplateImage = sessionStorage.getItem('snapstrip-template-image');

    if (savedLayout) {
      let layout = JSON.parse(savedLayout);
      if (savedTemplateImage) {
        const templateLayer = layout.find((l: Layer) => l.type === 'template');
        if (templateLayer) {
          templateLayer.url = savedTemplateImage;
        } else {
          // If no template layer exists, create one
          const isLandscape = eventSize === '4x6';
          layout.unshift({
            id: 'template-from-storage',
            type: 'template',
            name: 'Template Image',
            x: 0,
            y: 0,
            width: isLandscape ? 600 : 400,
            height: isLandscape ? 400 : 1200,
            rotation: 0,
            isVisible: true,
            isLocked: false,
            url: savedTemplateImage,
          });
        }
      }
      setTemplateLayout(layout);
    }
    
    // Directly go to capture step
    setStep('capture');
  }, [eventSize]);


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
