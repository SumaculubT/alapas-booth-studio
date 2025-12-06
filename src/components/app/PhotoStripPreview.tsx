
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Share2, RefreshCw, X, Expand, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  onExit: () => void;
  eventSize: "2x6" | "4x6" | string;
}

const DPI = 300; // for high quality download

const generateStrip = async (
    templateLayout: Layer[], 
    photos: string[], 
    eventSize: string,
    targetWidth: number
): Promise<string> => {
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const isLandscape = eventSize === '4x6';
    // The canvas size from the studio editor
    const templateLayerForSize = templateLayout.find(l => l.type === 'template');
    const studioCanvasWidth = templateLayerForSize?.width || (isLandscape ? 600 : 400);
    const studioCanvasHeight = templateLayerForSize?.height || (isLandscape ? 400 : 1200);

    const cameraLayers = templateLayout.filter(l => l.type === 'camera' && l.isVisible).sort((a,b) => a.name.localeCompare(b.name));

    // Determine target dimensions while maintaining aspect ratio
    const aspectRatio = studioCanvasWidth / studioCanvasHeight;
    const targetHeight = targetWidth / aspectRatio;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
      
    const scaleX = canvas.width / studioCanvasWidth;
    const scaleY = canvas.height / studioCanvasHeight;

    const imagePromises: Promise<HTMLImageElement>[] = [];
      
    const templateLayer = templateLayout.find(l => l.type === 'template');
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

    if (templateImage) {
        ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
    }
    
    return canvas.toDataURL("image/png");
}

export default function PhotoStripPreview({
  templateLayout,
  photos,
  onRestart,
  onExit,
  eventSize,
}: PhotoStripPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (photos.length === 0 || !templateLayout) return;

    setIsGenerating(true);
    // Generate a smaller preview quickly for display
    const previewWidth = eventSize === '4x6' ? 800 : 600;
    generateStrip(templateLayout, photos, eventSize, previewWidth)
        .then(imageUrl => {
            setFinalImage(imageUrl);
            setIsGenerating(false);
        });
        
  }, [templateLayout, photos, eventSize]);

  const handleDownload = async () => {
    setIsGenerating(true);
    const isLandscape = eventSize === '4x6';
    const nativeWidth = isLandscape ? 6 * DPI : 2 * DPI; // 6" or 2"
    
    const highResImage = await generateStrip(templateLayout, photos, eventSize, nativeWidth);

    const link = document.createElement("a");
    link.download = "snapstrip.png";
    link.href = highResImage;
    link.click();
    setIsGenerating(false);
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
          text: 'Check out my photo strip from Alpas Studio!',
        });
      } else {
         await navigator.share({
          title: 'My SnapStrip!',
          text: 'Check out my photo strip from Alpas Studio! (Image attached)',
          url: finalImage,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      onRestart();
    } else if (event.key === ' ') {
      event.preventDefault();
      setIsFullscreen(prev => !prev);
    }
  }, [onRestart]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const templateLayerForSize = templateLayout.find(l => l.type === 'template');
  const studioCanvasWidth = templateLayerForSize?.width || (eventSize === '4x6' ? 600 : 400);
  const studioCanvasHeight = templateLayerForSize?.height || (eventSize === '4x6' ? 400 : 1200);
  const aspectRatio = `aspect-[${studioCanvasWidth}/${studioCanvasHeight}]`;


  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Thank You!</h1>
        <p className="text-muted-foreground">Save it, share it, or start over.</p>
      </div>

      <div className={`relative w-full max-w-sm mx-auto ${aspectRatio} bg-muted rounded-lg overflow-hidden shadow-lg`}>
          {isGenerating && <Skeleton className="w-full h-full" />}
          {finalImage && (
          <Image
              src={finalImage}
              alt="Final photo strip"
              fill
              className="object-contain"
          />
          )}
      </div>

      <div className="w-full max-w-md mx-auto flex flex-wrap justify-center gap-2">
          <Button onClick={onRestart} variant="outline" className="flex-grow sm:flex-grow-0">
          <RefreshCw className="mr-2 h-4 w-4" /> Start Over (Enter)
          </Button>
          <Button onClick={() => setIsFullscreen(true)} disabled={isGenerating} className="flex-grow sm:flex-grow-0">
          <Expand className="mr-2 h-4 w-4" /> Fullscreen (Space)
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating} className="flex-grow sm:flex-grow-0">
          <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          {typeof navigator !== 'undefined' && navigator.share && (
          <Button onClick={handleShare} disabled={isGenerating} className="flex-grow sm:flex-grow-0">
              <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          )}
          <Button onClick={onExit} variant="secondary" className="flex-grow sm:flex-grow-0">
          <Home className="mr-2 h-4 w-4" /> Back to Home
          </Button>
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="max-w-7xl h-[90vh] bg-transparent border-none shadow-none p-0">
          {finalImage && (
              <Image
              src={finalImage}
              alt="Final photo strip fullscreen"
              fill
              className="object-contain"
              />
          )}
          <Button onClick={() => setIsFullscreen(false)} variant="ghost" size="icon" className="absolute top-4 right-4 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 text-white hover:text-white z-10">
              <X size={32} />
          </Button>
          </DialogContent>
      </Dialog>
    </>
  );
}
