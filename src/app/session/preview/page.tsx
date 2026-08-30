"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoStripPreview from "@/components/app/PhotoStripPreview";
import {
  getCapturedPhotos,
  loadSessionLayout,
  loadSessionSettings,
  resetSession,
  type SessionSettings,
} from "@/lib/session";
import type { Layer } from "@/lib/types";

function PreviewScreen() {
  const router = useRouter();
  const [templateLayout, setTemplateLayout] = useState<Layer[] | null>(null);
  const [capturedPhotos, setCapturedPhotosState] = useState<string[] | null>(null);
  const [sessionSettings, setSessionSettings] = useState<SessionSettings | null>(null);

  useEffect(() => {
    const settings = loadSessionSettings();
    if (!settings) {
      router.replace("/studio");
      return;
    }
    setSessionSettings(settings);

    const layout = loadSessionLayout();
    if (!layout) {
      router.replace("/studio");
      return;
    }
    setTemplateLayout(layout);

    const photos = getCapturedPhotos();
    if (photos.length === 0) {
      router.replace("/session/welcome");
      return;
    }
    setCapturedPhotosState(photos);
  }, [router]);

  const handleRestart = () => {
    resetSession({ keepTemplate: true, keepSettings: true });
    router.push("/session/welcome");
  };

  const handleExit = () => {
    resetSession({ keepTemplate: true, keepSettings: true });
    router.push("/studio");
  };

  if (!templateLayout || !capturedPhotos || capturedPhotos.length === 0 || !sessionSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <div>Loading template...</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 text-foreground sm:p-8">
      <div className="flex w-full flex-col items-center justify-center space-y-4">
        <PhotoStripPreview
          templateLayout={templateLayout}
          photos={capturedPhotos}
          onRestart={handleRestart}
          onExit={handleExit}
          eventSize={sessionSettings.size}
        />
      </div>
      <footer className="pt-8 text-center text-sm text-muted-foreground">
        <p>
          Powered by{" "}
          <a
            href="https://alpastechph.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-primary"
          >
            Alpas IT Solutions Inc.
          </a>
        </p>
      </footer>
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black text-white">Loading preview...</div>}>
      <PreviewScreen />
    </Suspense>
  );
}
