"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Share2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PhotoStripPreviewProps {
  templateUrl: string;
  photos: string[];
  onRestart: () => void;
}

export default function PhotoStripPreview({
  templateUrl,
  photos,
  onRestart,
}: PhotoStripPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [finalImage, setFinalImage] = useState<string | null>(null);

  useEffect(() => {
    const generateStrip = async () => {
      if (!canvasRef.current || photos.length === 0) return;

      setIsGenerating(true);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const templateImg = new window.Image();
      templateImg.crossOrigin = 'anonymous';
      templateImg.src = templateUrl;

      await new Promise((resolve, reject) => {
        templateImg.onload = resolve;
        templateImg.onerror = reject;
      });
      
      const templateAspectRatio = templateImg.naturalWidth / templateImg.naturalHeight;
      canvas.width = 800;
      canvas.height = canvas.width / templateAspectRatio;
      
      const photoImages = await Promise.all(
          photos.map(p => {
              const img = new window.Image();
              img.src = p;
              return new Promise<HTMLImageElement>(resolve => {
                  img.onload = () => resolve(img);
              });
          })
      );
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const photoHeight = (canvas.height * 0.9) / 4;
      const photoWidth = canvas.width * 0.9;
      const x_offset = canvas.width * 0.05;
      const y_offset_start = canvas.height * 0.05;

      photoImages.forEach((photo, index) => {
          const y_offset = y_offset_start + index * photoHeight;
          const photoAspectRatio = photo.naturalWidth / photo.naturalHeight;
          let sx, sy, sWidth, sHeight;

          if (photoAspectRatio > photoWidth / photoHeight) {
              sHeight = photo.naturalHeight;
              sWidth = sHeight * (photoWidth / photoHeight);
              sx = (photo.naturalWidth - sWidth) / 2;
              sy = 0;
          } else {
              sWidth = photo.naturalWidth;
              sHeight = sWidth / (photoWidth / photoHeight);
              sx = 0;
              sy = (photo.naturalHeight - sHeight) / 2;
          }
          
          ctx.drawImage(photo, sx, sy, sWidth, sHeight, x_offset, y_offset, photoWidth, photoHeight);
      });

      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

      setFinalImage(canvas.toDataURL("image/png"));
      setIsGenerating(false);
    };

    generateStrip();
  }, [templateUrl, photos]);

  const handleDownload = () => {
    if (!finalImage) return;
    const link = document.createElement("a");
    link.download = "snapstrip.png";
    link.href = finalImage;
    link.click();
  };

  const handleShare = async () => {
    if (!finalImage || !navigator.share) return;
    
    try {
      const response = await fetch(finalImage);
      const blob = await response.blob();
      const file = new File([blob], 'snapstrip.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My SnapStrip!',
          text: 'Check out my photo strip from SnapStrip Studio!',
        });
      } else {
        await navigator.share({
          title: 'My SnapStrip!',
          text: 'Check out my photo strip from SnapStrip Studio!',
          url: finalImage,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-2xl font-semibold">3. Your Photo Strip!</h2>
      <p className="text-muted-foreground">Save it, share it, or start over.</p>

      <div className="relative w-full aspect-[2/3] bg-muted rounded-lg overflow-hidden">
        {isGenerating && <Skeleton className="w-full h-full" />}
        {finalImage && (
          <Image
            src={finalImage}
            alt="Final photo strip"
            width={800}
            height={1200}
            className="w-full h-full object-contain"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button onClick={onRestart} variant="outline" className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" /> Start Over
        </Button>
        <Button onClick={handleDownload} disabled={isGenerating} className="w-full">
          <Download className="mr-2 h-4 w-4" /> Download
        </Button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button onClick={handleShare} disabled={isGenerating} className="w-full">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        )}
      </div>
    </div>
  );
}
