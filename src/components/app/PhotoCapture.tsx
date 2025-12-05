
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Camera as CameraIcon, CheckCircle, CircleDot } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PhotoCaptureProps {
  onCaptureComplete: (photos: string[]) => void;
  photoCount: number;
}

export default function PhotoCapture({ onCaptureComplete, photoCount }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 1280, height: 720 } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };

    getCameraPermission();
    
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
        }
    }
  }, []);

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
  };

  const startCaptureSequence = () => {
    if (photos.length >= photoCount) return;

    let count = 3;
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

  useEffect(() => {
    if (photos.length === photoCount) {
      setTimeout(() => onCaptureComplete(photos), 1000);
    }
  }, [photos, photoCount, onCaptureComplete]);
  
  const progress = (photos.length / photoCount) * 100;

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-2xl font-semibold">2. Strike a Pose!</h2>
      <p className="text-muted-foreground">
        Capture {photoCount} photos. We'll count you down.
      </p>

      <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        
        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-9xl font-bold text-white drop-shadow-lg animate-ping-once">{countdown}</span>
          </div>
        )}
      </div>

       {!hasCameraPermission && (
          <Alert variant="destructive">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access to use this feature. Refresh the page after enabling permissions.
              </AlertDescription>
          </Alert>
       )}


      <div className="space-y-2">
        <Progress value={progress} />
        <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: photoCount }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
                    {photos[i] ? (
                       <Image src={photos[i]} alt={`Captured photo ${i+1}`} width={100} height={100} className="w-full h-full object-cover"/>
                    ) : (
                        <CircleDot className="w-6 h-6 text-muted-foreground/50" />
                    )}
                </div>
            ))}
        </div>
      </div>

      {photos.length < photoCount ? (
        <Button onClick={startCaptureSequence} size="lg" className="w-full" disabled={countdown !== null || !hasCameraPermission}>
          <CameraIcon className="mr-2 h-5 w-5" />
          Take Photo {photos.length + 1}
        </Button>
      ) : (
        <div className="flex items-center justify-center text-primary pt-4">
          <CheckCircle className="mr-2 h-5 w-5" />
          <p>All photos captured! Generating your strip...</p>
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
