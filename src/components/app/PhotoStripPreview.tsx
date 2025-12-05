
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Share2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Layer {
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
}

interface PhotoStripPreviewProps {
  templateLayout: Layer[];
  photos: string[];
  onRestart: () => void;
  eventSize: "2x6" | "4x6" | string;
}

export default function PhotoStripPreview({
  templateLayout,
  photos,
  onRestart,
  eventSize,
}: PhotoStripPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [finalImage, setFinalImage] = useState<string | null>(null);

  const templateLayer = templateLayout.find(l => l.type === 'template');
  const cameraLayers = templateLayout.filter(l => l.type === 'camera' && l.isVisible).sort((a,b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const generateStrip = async () => {
      if (!canvasRef.current || photos.length === 0 || !templateLayout) return;

      setIsGenerating(true);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const isLandscape = eventSize === '4x6';

      // Define native resolution based on 300 DPI
      const nativeWidth = isLandscape ? 1800 : 600; // 6" or 2"
      const nativeHeight = isLandscape ? 1200 : 1800; // 4" or 6"
      
      canvas.width = nativeWidth;
      canvas.height = nativeHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const studioCanvasWidth = isLandscape ? 600 : 400;
      const studioCanvasHeight = isLandscape ? 400 : 1200;
      const scaleX = canvas.width / studioCanvasWidth;
      const scaleY = canvas.height / studioCanvasHeight;

      // Load all images (template and photos)
      const imagePromises: Promise<HTMLImageElement>[] = [];
      
      if (templateLayer && templateLayer.url) {
        const templateImg = new window.Image();
        templateImg.crossOrigin = 'anonymous';
        templateImg.src = templateLayer.url;
        imagePromises.push(new Promise((resolve, reject) => {
          templateImg.onload = () => resolve(templateImg);
          templateImg.onerror = reject;
        }));
      }

      photos.forEach(p => {
        const img = new window.Image();
        img.src = p;
        imagePromises.push(new Promise<HTMLImageElement>(resolve => {
            img.onload = () => resolve(img);
        }));
      });

      const loadedImages = await Promise.all(imagePromises);
      const templateImage = (templateLayer && templateLayer.url) ? loadedImages.shift() : null;
      const photoImages = loadedImages;

      // Draw photos first
      photoImages.forEach((photo, index) => {
          const layer = cameraLayers[index];
          if (layer) {
            const pos = {
                x: layer.x * scaleX,
                y: layer.y * scaleY,
                width: layer.width * scaleX,
                height: layer.height * scaleY,
            };

            const photoAspectRatio = photo.naturalWidth / photo.naturalHeight;
            let sx, sy, sWidth, sHeight;
            
            const placeholderAspectRatio = pos.width / pos.height;

            if (photoAspectRatio > placeholderAspectRatio) { // photo is wider
                sHeight = photo.naturalHeight;
                sWidth = sHeight * placeholderAspectRatio;
                sx = (photo.naturalWidth - sWidth) / 2;
                sy = 0;
            } else { // photo is taller
                sWidth = photo.naturalWidth;
                sHeight = sWidth / placeholderAspectRatio;
                sx = 0;
                sy = (photo.naturalHeight - sHeight) / 2;
            }
            
            ctx.save();
            ctx.translate(pos.x + pos.width / 2, pos.y + pos.height / 2);
            ctx.rotate(layer.rotation * Math.PI / 180);
            ctx.drawImage(photo, sx, sy, sWidth, sHeight, -pos.width/2, -pos.height/2, pos.width, pos.height);
            ctx.restore();
          }
      });

      // Draw template on top
      if (templateImage) {
        ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
      }

      setFinalImage(canvas.toDataURL("image/png"));
      setIsGenerating(false);
    };

    generateStrip();
  }, [templateLayout, photos, eventSize, cameraLayers, templateLayer]);

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
      <h2 className="text-2xl font-semibold">Your Photo Strip!</h2>
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
