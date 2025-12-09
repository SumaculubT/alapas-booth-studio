
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Share2, RefreshCw, X, Expand, Home, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

const DPI = 600; // High quality download (600 DPI for professional prints)
const DOWNLOAD_DPI = 600; // Even higher DPI for downloads

// Standard 4x6 landscape dimensions
const PRINTABLE_4X6_WIDTH = 4;
const PRINTABLE_4X6_HEIGHT = 6;

const generateStrip = async (
    templateLayout: Layer[], 
    photos: string[], 
    eventSize: string,
    targetWidth: number,
    format: 'png' | 'jpeg' = 'png'
): Promise<string> => {
    
    const canvas = document.createElement('canvas');
    // Request high-quality 2D context
    const ctx = canvas.getContext("2d", {
      willReadFrequently: false,
      alpha: format === 'png', // PNG supports transparency, JPEG doesn't
      colorSpace: 'srgb', // Standard RGB color space
      desynchronized: false // Better quality, slightly slower
    });
    if (!ctx) return "";

    // Enable high-quality image smoothing for better template rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const isLandscape = eventSize === '4x6';
    const templateLayerForSize = templateLayout.find(l => l.type === 'template');
    // Use standard 4x6 landscape dimensions
    const studioCanvasWidth = templateLayerForSize?.width || (isLandscape ? PRINTABLE_4X6_WIDTH * 100 : 400);
    const studioCanvasHeight = templateLayerForSize?.height || (isLandscape ? PRINTABLE_4X6_HEIGHT * 100 : 1200);

    const cameraLayers = templateLayout.filter(l => l.type === 'camera' && l.isVisible).sort((a,b) => a.name.localeCompare(b.name));

    const aspectRatio = studioCanvasWidth / studioCanvasHeight;
    const targetHeight = targetWidth / aspectRatio;

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    if (format === 'jpeg') {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
      
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
        // Draw template at full quality - high-quality smoothing is already enabled above
        ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
    }
    
    if (format === 'jpeg') {
        return canvas.toDataURL("image/jpeg", 1.0); // Maximum JPEG quality (100%)
    }
    // PNG for lossless quality
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
    const previewWidth = eventSize === '4x6' ? 800 : 400;
    generateStrip(templateLayout, photos, eventSize, previewWidth, 'png')
        .then(imageUrl => {
            setFinalImage(imageUrl);
            setIsGenerating(false);
        });
        
  }, [templateLayout, photos, eventSize]);

  const handleDownload = async () => {
    setIsGenerating(true);
    
    // Try to use JSZip if available, otherwise download files individually
    let useZip = false;
    let JSZip: any = null;
    
    try {
      // Try to dynamically import JSZip
      const jszipModule = await import('jszip');
      JSZip = jszipModule.default || jszipModule;
      if (JSZip) {
        useZip = true;
      }
    } catch (importError) {
      console.warn('JSZip not available, will download files individually:', importError);
      useZip = false;
    }
    
    if (useZip && JSZip) {
      try {
        const zip = new JSZip();
        
        // Add raw captured photos at original quality
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        // Convert base64 data URL to blob
        const response = await fetch(photo);
        const blob = await response.blob();
        // Extract the image format from the data URL or blob
        const format = photo.includes('image/png') ? 'png' : 'jpeg';
        zip.file(`photo_${i + 1}.${format}`, blob);
      }
      
      // Generate high-quality final templated photo
      const templateLayer = templateLayout.find(l => l.type === 'template');
      let nativeWidth: number;
      
      if (templateLayer && templateLayer.url) {
        // Load template image to get actual dimensions
        const templateImg = new window.Image();
        await new Promise((resolve, reject) => {
          templateImg.onload = resolve;
          templateImg.onerror = reject;
          templateImg.src = templateLayer.url!;
        });
        // Use the actual template image width, or scale up to higher DPI if template is lower res
        const templateDPI = templateImg.naturalWidth / PRINTABLE_4X6_WIDTH;
        if (templateDPI < DOWNLOAD_DPI) {
          // Scale up to higher DPI for better quality
          nativeWidth = PRINTABLE_4X6_WIDTH * DOWNLOAD_DPI;
        } else {
          // Use template's native resolution
          nativeWidth = templateImg.naturalWidth;
        }
      } else {
        // Fallback: use high DPI calculation
        // Use printable area dimensions (3.86x5.83) for 4x6 landscape
        const isLandscape = eventSize === '4x6';
        nativeWidth = isLandscape ? PRINTABLE_4X6_WIDTH * DOWNLOAD_DPI : 2 * DOWNLOAD_DPI;
      }
      
      // Generate final templated photo at high quality (PNG for lossless)
      const highResImage = await generateStrip(templateLayout, photos, eventSize, nativeWidth, 'png');
      
      // Add final templated photo to zip
      const finalResponse = await fetch(highResImage);
      const finalBlob = await finalResponse.blob();
      zip.file('final_photo_strip.png', finalBlob);
      
      // Generate zip file and download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement("a");
      link.download = `snapstrip_photos_${new Date().getTime()}.zip`;
      link.href = zipUrl;
      link.click();
      
        // Clean up the object URL
        setTimeout(() => URL.revokeObjectURL(zipUrl), 100);
        setIsGenerating(false);
        return;
      } catch (zipError) {
        console.error('Error creating zip file:', zipError);
        useZip = false; // Fall through to individual downloads
      }
    }
    
    // Fallback: download files individually if ZIP is not available or failed
    if (!useZip) {
      // Download raw photos first
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const format = photo.includes('image/png') ? 'png' : 'jpeg';
        const link = document.createElement("a");
        link.download = `photo_${i + 1}.${format}`;
        link.href = photo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay between downloads to avoid browser blocking
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Then download final photo
      const templateLayer = templateLayout.find(l => l.type === 'template');
      let nativeWidth: number;
      
      if (templateLayer && templateLayer.url) {
        const templateImg = new window.Image();
        await new Promise((resolve, reject) => {
          templateImg.onload = resolve;
          templateImg.onerror = reject;
          templateImg.src = templateLayer.url!;
        });
        const templateDPI = templateImg.naturalWidth / PRINTABLE_4X6_WIDTH;
        nativeWidth = templateDPI < DOWNLOAD_DPI 
          ? PRINTABLE_4X6_WIDTH * DOWNLOAD_DPI 
          : templateImg.naturalWidth;
      } else {
        const isLandscape = eventSize === '4x6';
        nativeWidth = isLandscape ? PRINTABLE_4X6_WIDTH * DOWNLOAD_DPI : 2 * DOWNLOAD_DPI;
      }
      
      const highResImage = await generateStrip(templateLayout, photos, eventSize, nativeWidth, 'png');
      const link = document.createElement("a");
      link.download = "final_photo_strip.png";
      link.href = highResImage;
      link.click();
    }
    
    setIsGenerating(false);
  };
  
    const handlePrint = () => {
      if (!finalImage) return;
      
      // Create a new window with just the image and open print dialog
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Photo Strip</title>
            <style>
              @media print {
                @page {
                  margin: 0;
                  size: 6in 4in landscape; /* Use 4x6 landscape for borderless support */
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  margin: 0;
                  padding: 0;
                  width: 100%;
                  height: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                img {
                  width: 100%;
                  height: 100%;
                  object-fit: fill; /* Fill entire page for borderless */
                  display: block;
                  transform: scaleX(-1); /* Flip horizontally to correct printer orientation */
                }
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
              }
            </style>
          </head>
          <body>
            <img src="${finalImage}" alt="Photo Strip" />
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
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
    // Don't handle keyboard events if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Don't handle keyboard events if a dialog is open
    const isDialogOpen = document.querySelector('[role="dialog"]') !== null;
    if (isDialogOpen) {
      return;
    }

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
  // Use printable area dimensions for 4x6 landscape (3.86x5.83)
  const studioCanvasWidth = templateLayerForSize?.width || (eventSize === '4x6' ? PRINTABLE_4X6_WIDTH * 100 : 400);
  const studioCanvasHeight = templateLayerForSize?.height || (eventSize === '4x6' ? PRINTABLE_4X6_HEIGHT * 100 : 1200);
  const aspectRatio = studioCanvasWidth / studioCanvasHeight;


  return (
    <>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Thank You!</h1>
        <p className="text-muted-foreground">Save it, share it, or start over.</p>
      </div>

      <div className="relative w-full max-w-lg mx-auto" style={{ aspectRatio: `${studioCanvasWidth} / ${studioCanvasHeight}` }}>
        {isGenerating && <Skeleton className="w-full h-full" />}
        {finalImage && (
          <Image
            src={finalImage}
            alt="Final"
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
           <Button onClick={handlePrint} disabled={isGenerating} className="flex-grow sm:flex-grow-0">
              <Printer className="mr-2 h-4 w-4" /> Print
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
          <DialogTitle className="sr-only">Fullscreen Photo Strip Preview</DialogTitle>
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

    