
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
  eventSize: "2x6" | "4x6" | string;
}

export default function PhotoStripPreview({
  templateUrl,
  photos,
  onRestart,
  eventSize,
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
      const isLandscape = eventSize === '4x6';

      if (isLandscape) {
        canvas.width = 1800; // 6 inches * 300 dpi
        canvas.height = 1200; // 4 inches * 300 dpi
      } else {
        canvas.width = 600; // 2 inches * 300 dpi
        canvas.height = 1800; // 6 inches * 300 dpi
      }
      
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

      // This is a placeholder logic for photo placement. 
      // In a real app, this would come from the layer data from the studio
       const photoPositions = [
        { x: 50, y: 50, width: 500, height: 387 },
        { x: 50, y: 487, width: 500, height: 387 },
        { x: 50, y: 924, width: 500, height: 387 },
        { x: 50, y: 1361, width: 500, height: 387 },
      ];


      photoImages.forEach((photo, index) => {
          const pos = photoPositions[index % photoPositions.length];
          if (pos) {
            const photoAspectRatio = photo.naturalWidth / photo.naturalHeight;
            let sx, sy, sWidth, sHeight;
            
            const placeholderAspectRatio = pos.width / pos.height;

            if (photoAspectRatio > placeholderAspectRatio) { // photo is wider than placeholder
                sHeight = photo.naturalHeight;
                sWidth = sHeight * placeholderAspectRatio;
                sx = (photo.naturalWidth - sWidth) / 2;
                sy = 0;
            } else { // photo is taller than placeholder
                sWidth = photo.naturalWidth;
                sHeight = sWidth / placeholderAspectRatio;
                sx = 0;
                sy = (photo.naturalHeight - sHeight) / 2;
            }
            
            ctx.drawImage(photo, sx, sy, sWidth, sHeight, pos.x, pos.y, pos.width, pos.height);
          }
      });


      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

      setFinalImage(canvas.toDataURL("image/png"));
      setIsGenerating(false);
    };

    generateStrip();
  }, [templateUrl, photos, eventSize]);

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
        // Fallback for browsers that can't share files but can share URLs
         await navigator.share({
          title: 'My SnapStrip!',
          text: 'Check out my photo strip from SnapStrip Studio! (Image attached)',
          url: finalImage,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const aspectRatio = eventSize === "4x6" ? "aspect-video" : "aspect-[2/6]";

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-2xl font-semibold">3. Your Photo Strip!</h2>
      <p className="text-muted-foreground">Save it, share it, or start over.</p>

      <div className={`relative w-full ${aspectRatio} bg-muted rounded-lg overflow-hidden`}>
        {isGenerating && <Skeleton className="w-full h-full" />}
        {finalImage && (
          <Image
            src={finalImage}
            alt="Final photo strip"
            width={eventSize === "4x6" ? 1800 : 600}
            height={eventSize === "4x6" ? 1200 : 1800}
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
