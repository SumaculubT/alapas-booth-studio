
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PhotoCapture from '@/components/app/PhotoCapture';
import PhotoStripPreview from '@/components/app/PhotoStripPreview';
import { getTemplateImage } from '@/lib/template-cache';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<SessionStep>('capture');
  const [templateLayout, setTemplateLayout] = useState<Layer[] | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  
  const eventSize = searchParams.get('size') || '2x6';
  const photoCount = Number(searchParams.get('photoCount')) || 4;
  const countdown = Number(searchParams.get('countdown')) || 5;

  useEffect(() => {
    // Load the layout and template from storage/cache
    const savedLayout = sessionStorage.getItem('snapstrip-layout');
    const savedTemplateImage = getTemplateImage();

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
    } else {
      // If there's no layout, we can't proceed. Go back to the studio.
      router.push(`/studio?size=${eventSize}`);
      return;
    }
    
    // Directly go to capture step
    setStep('capture');
  }, [eventSize, router]);


  const handleCaptureComplete = (photos: string[]) => {
    setCapturedPhotos(photos);
    setStep('preview');
  };

  const handleRestart = () => {
    setCapturedPhotos([]);
    setStep('capture');
  };
  
  const handleExit = () => {
    router.push('/');
  };

  const renderStep = () => {
    switch (step) {
      case 'capture':
        return (
          <PhotoCapture
            onCaptureComplete={handleCaptureComplete}
            onExit={handleExit}
            photoCount={photoCount}
            countdown={countdown}
          />
        );
      case 'preview':
        if (templateLayout) {
          return (
            <main className="flex min-h-screen flex-col items-center justify-start bg-background text-foreground p-4 sm:p-8 pt-16">
              <div className="w-full max-w-md mx-auto">
                <PhotoStripPreview
                  templateLayout={templateLayout}
                  photos={capturedPhotos}
                  onRestart={handleRestart}
                  onExit={handleExit}
                  eventSize={eventSize}
                />
                 <footer className="text-center mt-8 text-sm text-muted-foreground">
                  <p>Powered by Next.js and Firebase</p>
                </footer>
              </div>
            </main>
          );
        }
        return <div>Loading template...</div>;
      default:
        return null;
    }
  };

  return (
    <>
      {renderStep()}
    </>
  );
}


export default function SessionPage() {
    return (
        <Suspense fallback={<div>Loading session...</div>}>
            <PhotoBoothSession />
        </Suspense>
    )
}
