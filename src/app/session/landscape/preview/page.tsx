'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PhotoStripPreview from '@/components/app/PhotoStripPreview';
import { getTemplateImage, setTemplateImage } from '@/lib/template-cache';

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

function PreviewScreen() {
  const router = useRouter();
  const [templateLayout, setTemplateLayout] = useState<Layer[] | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
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
          router.replace('/session/strip/preview');
          return;
        }
      } catch (error) {
        console.error('Error parsing session settings:', error);
        router.replace('/studio/landscape');
        return;
      }
    } else {
      router.replace('/studio/landscape');
      return;
    }

    // Load the layout and template from storage/cache
    const savedLayout = sessionStorage.getItem('snapstrip-layout');
    // Try in-memory cache first, then fall back to sessionStorage (for page refresh)
    let savedTemplateImage = getTemplateImage();
    if (!savedTemplateImage) {
      // Restore from sessionStorage if cache is empty (e.g., after page refresh)
      savedTemplateImage = sessionStorage.getItem('snapstrip-template-url');
      if (savedTemplateImage) {
        // Restore to in-memory cache for future use
        setTemplateImage(savedTemplateImage);
      }
    }
    const savedPhotos = sessionStorage.getItem('captured-photos');

    if (!savedLayout) {
      // If there's no layout, we can't proceed. Go back to the studio.
      router.push('/studio/landscape');
      return;
    }

    let layout = JSON.parse(savedLayout);
    if (savedTemplateImage) {
      const templateLayer = layout.find((l: Layer) => l.type === 'template');
      if (templateLayer) {
        templateLayer.url = savedTemplateImage;
      } else {
        // If no template layer exists, create one
        layout.unshift({
          id: 'template-from-storage',
          type: 'template',
          name: 'Template Image',
          x: 0,
          y: 0,
          width: 600,
          height: 400,
          rotation: 0,
          isVisible: true,
          isLocked: false,
          url: savedTemplateImage,
        });
      }
    }
    setTemplateLayout(layout);

    if (savedPhotos) {
      setCapturedPhotos(JSON.parse(savedPhotos));
    }
  }, [router]);

  const handleRestart = () => {
    // Clear captured photos and go back to welcome
    sessionStorage.removeItem('captured-photos');
    router.push('/session/landscape/welcome');
  };

  const handleExit = () => {
    // Clear captured photos and return to studio
    sessionStorage.removeItem('captured-photos');
    router.push('/studio/landscape');
  };

  if (!templateLayout || capturedPhotos.length === 0 || !sessionSettings) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <div>Loading template...</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 sm:p-8">
      <div className="flex flex-col items-center justify-center w-full space-y-4">
        <PhotoStripPreview
          templateLayout={templateLayout}
          photos={capturedPhotos}
          onRestart={handleRestart}
          onExit={handleExit}
          eventSize={sessionSettings.size}
        />
      </div>
      <footer className="text-center text-sm text-muted-foreground pt-8">
        <p>Powered by <a href="https://alpastechph.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Alpas IT Solutions Inc.</a></p>
      </footer>
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading preview...</div>}>
      <PreviewScreen />
    </Suspense>
  );
}

