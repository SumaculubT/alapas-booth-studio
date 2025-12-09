
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Share2, RefreshCw, X, Expand, Home, Printer, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { loadPrintSettings, type PrintSettings } from "@/components/app/PrintSettingsDialog";
import PrintSettingsDialog from "@/components/app/PrintSettingsDialog";

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
    targetWidth: number,
    format: 'png' | 'jpeg' = 'png'
): Promise<string> => {
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Enable high-quality image smoothing for better template rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const isLandscape = eventSize === '4x6';
    const templateLayerForSize = templateLayout.find(l => l.type === 'template');
    const studioCanvasWidth = templateLayerForSize?.width || (isLandscape ? 600 : 400);
    const studioCanvasHeight = templateLayerForSize?.height || (isLandscape ? 400 : 1200);

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
        return canvas.toDataURL("image/jpeg", 0.95); // 95% quality
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
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewImage, setPrintPreviewImage] = useState<string | null>(null);

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
    
    // Get the actual template image dimensions for full quality output
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
      // Use the actual template image width for full resolution output
      nativeWidth = templateImg.naturalWidth;
    } else {
      // Fallback: use DPI calculation if no template
      const isLandscape = eventSize === '4x6';
      nativeWidth = isLandscape ? 6 * DPI : 2 * DPI; // 6" or 2"
    }
    
    const highResImage = await generateStrip(templateLayout, photos, eventSize, nativeWidth, 'jpeg');

    const link = document.createElement("a");
    link.download = "snapstrip.jpeg";
    link.href = highResImage;
    link.click();
    setIsGenerating(false);
  };
  
    const handlePrint = async () => {
      if (!finalImage) return;
      
      // Show preview dialog first
      setPrintPreviewImage(finalImage);
      setShowPrintPreview(true);
    };

    const handleConfirmPrint = async () => {
      if (!printPreviewImage) return;
      setIsGenerating(true);
      setShowPrintPreview(false);
      
      const printSettings = loadPrintSettings();
      
      // Try API printing first, fallback to browser print dialog
      try {
        const response = await fetch('/api/print', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: printPreviewImage,
            printSettings: printSettings,
            printerName: printSettings.printerName || 'Epson L3210',
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Successfully sent to printer via API
          setIsGenerating(false);
          setPrintPreviewImage(null);
          alert(`Print job submitted successfully to ${result.printer || 'printer'}!`);
          return;
        } else if (result.setupInstructions) {
          // Print service not configured, show setup instructions
          console.log('Print service setup required:', result.setupInstructions);
          setIsGenerating(false);
          handleBrowserPrint();
        } else {
          setIsGenerating(false);
          alert(`Print failed: ${result.error || result.message || 'Unknown error'}`);
          handleBrowserPrint();
        }
      } catch (error: any) {
        console.error('API print failed, falling back to browser print:', error);
        setIsGenerating(false);
        alert(`Print failed: ${error.message}. Falling back to browser print dialog.`);
        handleBrowserPrint();
      }
    };

    const handleBrowserPrint = async () => {
      if (!printPreviewImage) return;
      setIsGenerating(true);
      
      const printSettings = loadPrintSettings();
      
      // Calculate paper dimensions
      const getPaperDimensions = () => {
        switch (printSettings.paperSize) {
          case '4x6':
            return { width: 4, height: 6 };
          case '5x7':
            return { width: 5, height: 7 };
          case '8x10':
            return { width: 8, height: 10 };
          case 'custom':
            return { width: printSettings.customWidth, height: printSettings.customHeight };
        }
      };

      const getMarginInches = () => {
        switch (printSettings.margins) {
          case 'none':
            return 0;
          case 'small':
            return 0.1;
          case 'medium':
            return 0.25;
          case 'large':
            return 0.5;
          case 'custom':
            return printSettings.customMargin;
        }
      };

      const paperDims = getPaperDimensions();
      const marginInches = getMarginInches();
      const printableWidth = paperDims.width - marginInches * 2;
      const printableHeight = paperDims.height - marginInches * 2;
      
      // Calculate print dimensions in pixels based on DPI
      let printWidth = printableWidth * printSettings.dpi;
      let printHeight = printableHeight * printSettings.dpi;

      // Apply orientation
      if (printSettings.orientation === 'portrait') {
        [printWidth, printHeight] = [printHeight, printWidth];
      }
  
      const printCanvas = document.createElement('canvas');
      printCanvas.width = printWidth;
      printCanvas.height = printHeight;
      const ctx = printCanvas.getContext('2d');
  
      if (!ctx) {
        setIsGenerating(false);
        return;
      }

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
  
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, printWidth, printHeight);
  
      // Generate high-resolution image for printing
      const templateLayer = templateLayout.find(l => l.type === 'template');
      let sourceImage: string;
      
      if (templateLayer && templateLayer.url) {
        // Generate at template resolution first
        const templateImg = new window.Image();
        await new Promise((resolve, reject) => {
          templateImg.onload = resolve;
          templateImg.onerror = reject;
          templateImg.src = templateLayer.url!;
        });
        const sourceWidth = templateImg.naturalWidth;
        sourceImage = await generateStrip(templateLayout, photos, eventSize, sourceWidth, 'png');
      } else {
        sourceImage = finalImage;
      }

      const stripImage = new window.Image();
      stripImage.src = sourceImage;
      
      await new Promise(resolve => { stripImage.onload = resolve; });
  
      const stripAspectRatio = stripImage.width / stripImage.height;
      const canvasAspectRatio = printWidth / printHeight;
      
      let drawWidth: number, drawHeight: number, dx: number, dy: number;

      // Apply scale mode
      if (printSettings.scaleMode === 'actual') {
        // Use actual size (scale based on DPI)
        const scale = printSettings.dpi / 96; // 96 is standard screen DPI
        drawWidth = stripImage.width * scale;
        drawHeight = stripImage.height * scale;
      } else if (printSettings.scaleMode === 'custom') {
        // Use custom scale percentage
        const scale = printSettings.customScale / 100;
        drawWidth = stripImage.width * scale;
        drawHeight = stripImage.height * scale;
      } else {
        // Fit to page (default)
        if (stripAspectRatio > canvasAspectRatio) {
          drawWidth = printWidth;
          drawHeight = drawWidth / stripAspectRatio;
        } else {
          drawHeight = printHeight;
          drawWidth = drawHeight * stripAspectRatio;
        }
      }
      
      // Center the image
      dx = (printWidth - drawWidth) / 2;
      dy = (printHeight - drawHeight) / 2;
  
      ctx.drawImage(stripImage, dx, dy, drawWidth, drawHeight);
  
      const printDataUrl = printCanvas.toDataURL('image/png');

      // Format page size for CSS @page rule - use explicit dimensions
      const pageWidth = paperDims.width;
      const pageHeight = paperDims.height;
      const pageSize = printSettings.orientation === 'portrait' 
        ? `${pageHeight}in ${pageWidth}in`
        : `${pageWidth}in ${pageHeight}in`;
  
      // Use hidden iframe approach to avoid popup blocking
      try {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Print Photo Strip</title>
              <style>
                /* @page rule to configure print dialog settings */
                @page {
                  size: ${pageSize};
                  margin: ${marginInches}in;
                }
                
                /* Additional print media queries for better browser support */
                @media print {
                  @page {
                    size: ${pageSize};
                    margin: ${marginInches}in;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                  }
                  img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    display: block;
                  }
                  .print-info {
                    display: none;
                  }
                }
                
                /* Screen preview styles */
                body {
                  margin: 0;
                  padding: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: white;
                  width: 100%;
                  height: 100%;
                }
                img {
                  width: 100%;
                  height: auto;
                  max-width: 100%;
                  max-height: 100vh;
                  object-fit: contain;
                  display: block;
                  margin: 0 auto;
                }
                .print-info {
                  position: fixed;
                  top: 10px;
                  left: 10px;
                  background: rgba(0, 0, 0, 0.8);
                  color: white;
                  padding: 10px 15px;
                  border-radius: 5px;
                  font-size: 12px;
                  font-family: Arial, sans-serif;
                }
              </style>
            </head>
            <body>
              <div class="print-info">
                Paper: ${paperDims.width}" × ${paperDims.height}" ${printSettings.orientation === 'portrait' ? '(Portrait)' : '(Landscape)'} | 
                Quality: ${printSettings.dpi} DPI | 
                Margins: ${marginInches > 0 ? marginInches + '"' : 'None'}
              </div>
              <img src="${printDataUrl}" alt="Photo Strip" style="width: 100%; height: auto; max-width: 100%; display: block;" />
              <script>
                (function() {
                  const img = document.querySelector('img');
                  let printTriggered = false;
                  
                  function triggerPrint() {
                    if (printTriggered) return;
                    printTriggered = true;
                    setTimeout(function() {
                      window.focus();
                      window.print();
                    }, 500);
                  }
                  
                  if (img) {
                    if (img.complete && img.naturalWidth > 0) {
                      // Image already loaded
                      triggerPrint();
                    } else {
                      img.onload = function() {
                        triggerPrint();
                      };
                      img.onerror = function() {
                        console.error('Failed to load image for printing');
                        triggerPrint(); // Still try to print
                      };
                      // Timeout fallback
                      setTimeout(function() {
                        if (!printTriggered) {
                          console.warn('Image load timeout, printing anyway');
                          triggerPrint();
                        }
                      }, 3000);
                    }
                  } else {
                    // No image found, print anyway
                    triggerPrint();
                  }
                })();
              </script>
            </body>
          </html>
        `;

        // Create a hidden iframe to print without popup blockers
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          document.body.removeChild(iframe);
          throw new Error('Failed to create print iframe');
        }

        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Wait for iframe to load, then print
        iframe.onload = () => {
          setTimeout(() => {
            try {
              const iframeWindow = iframe.contentWindow;
              if (iframeWindow) {
                iframeWindow.focus();
                iframeWindow.print();
              }
            } catch (error) {
              console.error('Print error:', error);
              alert('Failed to open print dialog. Please check your browser settings.');
            }
            
            // Clean up iframe after a delay
            setTimeout(() => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
              setIsGenerating(false);
            }, 1000);
          }, 500);
        };

        // Fallback if onload doesn't fire
        setTimeout(() => {
          try {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow) {
              const img = iframeDoc.querySelector('img');
              if (img && (img.complete || img.naturalWidth > 0)) {
                iframeWindow.focus();
                iframeWindow.print();
              }
            }
          } catch (error) {
            console.error('Print fallback error:', error);
          }
          
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
            setIsGenerating(false);
          }, 1000);
        }, 2000);

        setIsGenerating(false);
      } catch (error: any) {
        console.error('Failed to print:', error);
        setIsGenerating(false);
        alert(`Failed to print: ${error.message}. You can use the download button to save the image and print it manually.`);
      }
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
          <Button 
            onClick={() => setIsPrintSettingsOpen(true)} 
            variant="outline" 
            className="flex-grow sm:flex-grow-0"
            title="Configure Print Settings"
          >
            <Settings className="mr-2 h-4 w-4" /> Print Settings
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
      
      <PrintSettingsDialog
        isOpen={isPrintSettingsOpen}
        onOpenChange={setIsPrintSettingsOpen}
      />
      
      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>Print Preview</DialogTitle>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview what will be printed. Click &quot;Confirm Print&quot; to send to your printer.
            </p>
            {printPreviewImage && (
              <div className="relative w-full border rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: '3/2' }}>
                <Image
                  src={printPreviewImage}
                  alt="Print Preview"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowPrintPreview(false);
                setPrintPreviewImage(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleConfirmPrint} disabled={isGenerating}>
                {isGenerating ? 'Printing...' : 'Confirm Print'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

    