
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Camera as CameraIcon, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PhotoCaptureProps {
  onCaptureComplete: (photos: string[]) => void;
  onExit: () => void;
  photoCount: number;
  countdown: number;
}

export default function PhotoCapture({ onCaptureComplete, onExit, photoCount, countdown: initialCountdown }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
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
  }, [toast]);

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
    setIsCapturing(false);
  };

  const startCaptureSequence = () => {
    if (photos.length >= photoCount || isCapturing) return;

    setIsCapturing(true);
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
  };
  
  // This effect will trigger the sequence for subsequent photos after a delay
  useEffect(() => {
    if (photos.length > 0 && photos.length < photoCount) {
        const timer = setTimeout(() => {
            startCaptureSequence();
        }, 2000); // 2 second delay before next countdown
        return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, photoCount]); // We only want to run this when photos state changes.

  useEffect(() => {
    if (photos.length === photoCount && photoCount > 0) {
      setTimeout(() => onCaptureComplete(photos), 1000);
    }
  }, [photos, photoCount, onCaptureComplete]);
  
  const showStartButton = photos.length === 0 && !isCapturing;

  return (
    <div className="fixed inset-0 bg-black text-white">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
      
      <Button onClick={onExit} variant="ghost" size="icon" className="absolute top-4 left-4 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-white">
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

      {!hasCameraPermission && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-4">
            <Alert variant="destructive" className="max-w-sm">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access to use this feature. You may need to refresh the page and grant permission.
              </AlertDescription>
            </Alert>
        </div>
      )}

      {showStartButton && (
         <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <Button onClick={startCaptureSequence} size="lg" className="h-16 rounded-full px-8 text-lg" disabled={!hasCameraPermission}>
            <CameraIcon className="mr-2 h-6 w-6" />
            Start Session
          </Button>
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
      
      {photos.length === photoCount && photoCount > 0 && (
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
