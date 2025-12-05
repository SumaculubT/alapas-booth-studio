"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TemplateUploader from "@/components/app/TemplateUploader";
import PhotoCapture from "@/components/app/PhotoCapture";
import PhotoStripPreview from "@/components/app/PhotoStripPreview";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

type Step = "template" | "capture" | "preview";

function SnapStripStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventSize = searchParams.get("size") || "2x6";

  const [step, setStep] = useState<Step>("template");
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const PHOTO_COUNT = 4;

  const handleTemplateSelect = (url: string) => {
    setTemplateUrl(url);
    setStep("capture");
  };

  const handlePhotosCapture = (photos: string[]) => {
    setCapturedPhotos(photos);
    setStep("preview");
  };

  const handleRestart = () => {
    router.push("/");
  };

  const handleBack = () => {
    if (step === "template") {
      router.push("/");
    } else if (step === "capture") {
      setStep("template");
      setTemplateUrl(null);
    } else if (step === "preview") {
      setStep("capture");
      setCapturedPhotos([]);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "template":
        return <TemplateUploader onTemplateSelect={handleTemplateSelect} eventSize={eventSize} />;
      case "capture":
        return (
          <PhotoCapture
            onCaptureComplete={handlePhotosCapture}
            photoCount={PHOTO_COUNT}
          />
        );
      case "preview":
        if (!templateUrl) return null;
        return (
          <PhotoStripPreview
            templateUrl={templateUrl}
            photos={capturedPhotos}
            onRestart={handleRestart}
            eventSize={eventSize}
          />
        );
      default:
        return <TemplateUploader onTemplateSelect={handleTemplateSelect} eventSize={eventSize}/>;
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 sm:p-8">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-8 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="absolute left-0 top-1/2 -translate-y-1/2"
            aria-label="Go back"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-4xl font-bold font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            SnapStrip Studio
          </h1>
          <p className="text-muted-foreground mt-2">
            Create your custom {eventSize} photo strip
          </p>
        </header>
        <div className="w-full bg-card p-4 sm:p-6 rounded-lg shadow-lg">
          {renderStep()}
        </div>
        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by Next.js and Firebase</p>
        </footer>
      </div>
    </main>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SnapStripStudio />
    </Suspense>
  );
}
