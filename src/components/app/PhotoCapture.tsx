
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Camera as CameraIcon, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import welcomeImage from "@/lib/welcome.webp";

interface PhotoCaptureProps {
  onCaptureComplete: (photos: string[]) => void;
  onExit: () => void;
  photoCount: number;
  countdown: number;
}

type CaptureState = 'welcome' | 'capturing' | 'finished';

export default function PhotoCapture({ onCaptureComplete, onExit, photoCount, countdown: initialCountdown }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [captureState, setCaptureState] = useState<CaptureState>('welcome');
  const { toast } = useToast();
  
  const startSession = useCallback(() => {
    if(captureState === 'welcome') {
      setPhotos([]);
      setCaptureState('capturing');
    }
  }, [captureState]);

  const handleInterrupt = () => {
    if (captureState === 'capturing') {
      // Stop camera stream
      if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
      }
      setCaptureState('welcome');
    } else {
      onExit();
    }
  }

  useEffect(() => {
    if (captureState === 'welcome') {
      const handleInteraction = (event: MouseEvent | KeyboardEvent) => {
        if (event instanceof KeyboardEvent && event.code !== 'Space') {
          return;
        }
        startSession();
      };

      window.addEventListener('click', handleInteraction);
      window.addEventListener('keydown', handleInteraction);

      return () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
      };
    }
  }, [captureState, startSession]);


  useEffect(() => {
    if (captureState !== 'capturing') return;

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();

    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
        }
    };
  }, [captureState, toast]);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.translate(video.videoWidth, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPhotos((prev) => [...prev, dataUrl]);
      }
    }
    setIsTakingPicture(false);
  };

  const startCaptureSequence = useCallback(() => {
    if (photos.length >= photoCount || isTakingPicture) return;

    setIsTakingPicture(true);
    let count = initialCountdown;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        takePicture();
      }
    }, 1000);
  }, [photos.length, photoCount, isTakingPicture, initialCountdown]);
  
  useEffect(() => {
    if (captureState === 'capturing' && photos.length === 0) {
        const timer = setTimeout(() => {
            startCaptureSequence();
        }, 1000); // Initial delay
        return () => clearTimeout(timer);
    }
  }, [captureState, photos.length, startCaptureSequence]);

  useEffect(() => {
    if (photos.length > 0 && photos.length < photoCount) {
        const timer = setTimeout(() => {
            startCaptureSequence();
        }, 2000); // 2 second delay before next countdown
        return () => clearTimeout(timer);
    }
  }, [photos, photoCount, startCaptureSequence]);

  useEffect(() => {
    if (photos.length === photoCount && photoCount > 0) {
      setCaptureState('finished');
      setTimeout(() => onCaptureComplete(photos), 1000);
    }
  }, [photos, photoCount, onCaptureComplete]);
  
  if (captureState === 'welcome') {
    return (
       <div className="fixed inset-0 bg-black cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) startSession();}}>
          <Image src={welcomeImage} alt="Welcome to the photo booth" fill objectFit="cover" placeholder="blur" />
           <Button onClick={onExit} variant="ghost" size="icon" className="absolute top-4 left-4 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-white z-10">
            <X size={32} />
          </Button>
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-center p-4 bg-black/50 rounded-xl">
             <h1 className="text-2xl font-bold">Touch the screen or press spacebar to start!</h1>
          </div>
       </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black text-white">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
      
      <Button onClick={handleInterrupt} variant="ghost" size="icon" className="absolute top-4 left-4 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-white z-10">
        <X size={32} />
      </Button>

      {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="relative flex items-center justify-center w-64 h-64">
                   <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                        <circle
                            className="text-black/30"
                            strokeWidth="4"
                            stroke="currentColor"
                            fill="transparent"
                            r="48"
                            cx="50"
                            cy="50"
                        />
                        <circle
                            className="text-white"
                            strokeWidth="4"
                            strokeDasharray={2 * Math.PI * 48}
                            strokeDashoffset={((initialCountdown - countdown + 1) / initialCountdown) * (2 * Math.PI * 48)}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="48"
                            cx="50"
                            cy="50"
                            style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                        />
                    </svg>
                  <span className="text-9xl font-bold drop-shadow-lg">{countdown}</span>
              </div>
          </div>
        )}

      {!hasCameraPermission && captureState === 'capturing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-4">
            <Alert variant="destructive" className="max-w-sm">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access to use this feature. You may need to refresh the page and grant permission.
              </AlertDescription>
            </Alert>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
        <div className="grid grid-cols-4 gap-2 bg-black/40 p-2 rounded-lg">
           {Array.from({ length: photoCount > 0 ? photoCount : 4 }).map((_, i) => (
                <div key={i} className="aspect-square bg-black/30 rounded-md flex items-center justify-center overflow-hidden">
                    {photos[i] ? (
                       <Image src={photos[i]} alt={`Captured photo ${i+1}`} width={100} height={100} className="w-full h-full object-cover scale-x-[-1]"/>
                    ) : (
                       <span className="text-4xl font-bold text-white/30">{i+1}</span>
                    )}
                </div>
            ))}
        </div>
      </div>
      
      {captureState === 'finished' && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex items-center justify-center text-white text-lg">
                <CheckCircle className="mr-2 h-5 w-5" />
                <p>All photos captured! Generating your strip...</p>
            </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

    