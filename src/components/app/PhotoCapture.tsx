
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Camera as CameraIcon, CheckCircle, X, RefreshCw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PhotoCaptureProps {
  onCaptureComplete: (photos: string[]) => void;
  onExit: () => void;
  photoCount: number;
  countdown: number;
}

type CaptureState = 'capturing' | 'review' | 'finished';

export default function PhotoCapture({ onCaptureComplete, onExit, photoCount, countdown: initialCountdown }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [captureState, setCaptureState] = useState<CaptureState>('capturing');
  const { toast } = useToast();

  const handleInterrupt = () => {
    // Clear any countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    // Stop camera stream before exiting
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    // Clear state
    setCountdown(null);
    setIsTakingPicture(false);
    // Exit the session
    onExit();
  }

  // Initialize capture on mount
  useEffect(() => {
    setPhotos([]);
    setCurrentPhoto(null);
    setCaptureState('capturing');
  }, []);


  useEffect(() => {
    if (captureState !== 'capturing' && captureState !== 'review') {
      return;
    }

    const getCameraPermission = async () => {
      // Don't re-request if we already have the stream
      if(videoRef.current?.srcObject) {
        setHasCameraPermission(true);
        return;
      }

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

    // Cleanup camera stream only on unmount or when leaving capture/review states
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [captureState, toast]);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d", { 
        willReadFrequently: false,
        alpha: true 
      });
      if (context) {
        // Enable high-quality image smoothing
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        
        // Draw video without mirroring - save photos in correct orientation
        // (Preview is mirrored via CSS for better UX, but saved photos should not be)
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        // Use maximum JPEG quality (1.0 = 100%) for better photo quality
        const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
        setCurrentPhoto(dataUrl);
        setCaptureState('review');
      }
    }
    setIsTakingPicture(false);
  };

  const startCaptureSequence = useCallback(() => {
    if (photos.length >= photoCount || isTakingPicture) return;

    setCaptureState('capturing');
    setIsTakingPicture(true);
    let count = initialCountdown;
    setCountdown(count);
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        countdownIntervalRef.current = null;
        setCountdown(null);
        takePicture();
      }
    }, 1000);
    countdownIntervalRef.current = interval;
  }, [photos.length, photoCount, isTakingPicture, initialCountdown]);
  
  useEffect(() => {
    if (captureState === 'capturing' && !isTakingPicture) {
        const timer = setTimeout(() => {
            startCaptureSequence();
        }, 1000); // Initial delay
        return () => clearTimeout(timer);
    }
  }, [captureState, isTakingPicture, startCaptureSequence]);

  const handleRetake = useCallback(() => {
    setCurrentPhoto(null);
    startCaptureSequence();
  }, [startCaptureSequence]);

  const handleConfirm = useCallback(() => {
    if (currentPhoto) {
      const newPhotos = [...photos, currentPhoto];
      setPhotos(newPhotos);
      setCurrentPhoto(null);
      
      if (newPhotos.length === photoCount) {
        setCaptureState('finished');
        setTimeout(() => onCaptureComplete(newPhotos), 1000);
      } else {
        startCaptureSequence();
      }
    }
  }, [currentPhoto, photos, photoCount, onCaptureComplete, startCaptureSequence]);
  
  useEffect(() => {
    if (captureState !== 'review') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleConfirm();
      } else if (event.code === 'Space') {
        event.preventDefault(); // Prevent space from scrolling or clicking buttons
        handleRetake();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [captureState, handleConfirm, handleRetake]);
  
  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black text-white">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full object-cover transition-opacity duration-300 ${captureState === 'review' ? 'opacity-0' : 'opacity-100'}`} 
      />
      {currentPhoto && captureState === 'review' && (
         <Image src={currentPhoto} alt="Review photo" fill className="object-contain"/>
      )}
      
      <Button onClick={handleInterrupt} variant="ghost" size="icon" className="absolute top-4 left-4 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-white z-10">
        <X size={32} />
      </Button>

      {countdown !== null && countdown > 0 && captureState === 'capturing' && (
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
      
      {captureState === 'review' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center space-x-4 z-20">
            <Button onClick={handleRetake} size="lg" variant="outline" className="text-lg px-8 py-6">
                <RefreshCw className="mr-2"/>
                Retake (Space)
            </Button>
            <Button onClick={handleConfirm} size="lg" className="text-lg px-8 py-6">
                <Check className="mr-2"/>
                Continue (Enter)
            </Button>
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
                       <Image src={photos[i]} alt={`Captured photo ${i+1}`} width={100} height={100} className="w-full h-full object-cover"/>
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

    