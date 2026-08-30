"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import welcomeImage from "@/lib/welcome.webp";
import { clearCapturedPhotos, loadSessionSettings, resetSession, type SessionSettings } from "@/lib/session";

function WelcomeScreen() {
  const router = useRouter();
  const startingRef = useRef(false);
  const [sessionSettings, setSessionSettings] = useState<SessionSettings | null>(null);

  useEffect(() => {
    const settings = loadSessionSettings();
    if (!settings) {
      router.replace("/studio");
      return;
    }
    setSessionSettings(settings);
  }, [router]);

  const handleStart = useCallback(() => {
    if (!sessionSettings || startingRef.current) return;
    startingRef.current = true;
    clearCapturedPhotos();
    router.push("/session/capture");
  }, [sessionSettings, router]);

  const handleExit = useCallback(() => {
    resetSession({ keepTemplate: true, keepSettings: true });
    router.push("/studio");
  }, [router]);

  useEffect(() => {
    if (!sessionSettings) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        handleStart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleStart, sessionSettings]);

  if (!sessionSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 cursor-pointer bg-black" onClick={handleStart}>
      <Image
        src={welcomeImage}
        alt="Welcome to the photo booth"
        fill
        className="object-cover"
        placeholder="blur"
      />
      <Button
        onClick={(event) => {
          event.stopPropagation();
          handleExit();
        }}
        variant="ghost"
        size="icon"
        aria-label="Back to studio"
        className="absolute z-10 h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white [top:max(1rem,env(safe-area-inset-top))] [left:max(1rem,env(safe-area-inset-left))]"
      >
        <X size={32} />
      </Button>
      <div className="absolute left-1/2 -translate-x-1/2 rounded-xl bg-black/50 p-4 text-center text-white [bottom:max(4rem,env(safe-area-inset-bottom))]">
        <h1 className="text-2xl font-bold">Touch the screen or press spacebar to start!</h1>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black text-white">Loading...</div>}>
      <WelcomeScreen />
    </Suspense>
  );
}
