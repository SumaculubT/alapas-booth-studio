"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, RefreshCw, X, Expand, Home, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Layer } from "@/lib/types";
import { dataUrlToBlob, generateStrip, getDownloadWidth, getStudioCanvasSize } from "@/lib/compose";

interface PhotoStripPreviewProps {
  templateLayout: Layer[];
  photos: string[];
  onRestart: () => void;
  onExit: () => void;
  eventSize: string;
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function canUseWebShareFiles() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
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
  const [composeError, setComposeError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const generateIdRef = useRef(0);

  const composePreview = useCallback(async () => {
    if (photos.length === 0 || !templateLayout) return;
    const requestId = ++generateIdRef.current;
    setIsGenerating(true);
    setComposeError(null);
    try {
      const previewWidth = eventSize === "4x6" ? 800 : 400;
      const imageUrl = await generateStrip(templateLayout, photos, eventSize, previewWidth, "png");
      if (requestId !== generateIdRef.current) return;
      setFinalImage(imageUrl);
    } catch (error) {
      if (requestId !== generateIdRef.current) return;
      console.error(error);
      setComposeError("Could not build the postcard. Tap Retry.");
    } finally {
      if (requestId === generateIdRef.current) {
        setIsGenerating(false);
      }
    }
  }, [eventSize, photos, templateLayout]);

  useEffect(() => {
    void composePreview();
  }, [composePreview]);

  const handleDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const nativeWidth = await getDownloadWidth(templateLayout, eventSize);
      const highResImage = await generateStrip(templateLayout, photos, eventSize, nativeWidth, "png");
      const zipModule = await import("jszip");
      const JSZip = zipModule.default;
      const zip = new JSZip();

      photos.forEach((photo, index) => {
        const format = photo.includes("image/png") ? "png" : "jpeg";
        zip.file(`photo_${index + 1}.${format}`, dataUrlToBlob(photo));
      });
      zip.file("final_photo_strip.png", dataUrlToBlob(highResImage));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const filename = `alapas-studio_photos_${Date.now()}.zip`;

      if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && navigator.canShare) {
        const file = new File([zipBlob], filename, { type: "application/zip" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Alpas Studio" });
          return;
        }
      }

      await downloadBlob(zipBlob, filename);
    } catch (error) {
      console.error("Download failed:", error);
      try {
        const nativeWidth = await getDownloadWidth(templateLayout, eventSize);
        const highResImage = await generateStrip(templateLayout, photos, eventSize, nativeWidth, "png");
        await downloadBlob(dataUrlToBlob(highResImage), "final_photo_strip.png");
      } catch (fallbackError) {
        console.error("Fallback download failed:", fallbackError);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const nativeWidth = await getDownloadWidth(templateLayout, eventSize);
      const printImage = await generateStrip(templateLayout, photos, eventSize, nativeWidth, "png");
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups to print");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Photo Strip</title>
            <style>
              @media print {
                @page { margin: 0; size: 6in 4in landscape; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body, img { width: 100%; height: 100%; }
                img { object-fit: fill; display: block; }
              }
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100dvh; }
              img { max-width: 100%; max-height: 100dvh; }
            </style>
          </head>
          <body>
            <img src="${printImage}" alt="Photo Strip" />
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Print failed:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    if (!finalImage || !canUseWebShareFiles() || isSharing) return;
    setIsSharing(true);
    try {
      const blob = dataUrlToBlob(finalImage);
      const file = new File([blob], "alapas-studio.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Alpas Studio",
          text: "Check out my photo strip from Alpas Studio!",
        });
      } else {
        await navigator.share({
          title: "Alpas Studio",
          text: "Check out my photo strip from Alpas Studio!",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Error sharing:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      if (event.key === "Enter") {
        onRestart();
      } else if (event.key === " ") {
        event.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    },
    [onRestart]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const { width: studioCanvasWidth, height: studioCanvasHeight } = getStudioCanvasSize(templateLayout, eventSize);
  const busy = isGenerating || isPrinting || isSharing;

  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Thank You!</h1>
        <p className="text-muted-foreground">Save it, share it, or start over.</p>
      </div>

      <div
        className="relative mx-auto w-full max-w-lg"
        style={{ aspectRatio: `${studioCanvasWidth} / ${studioCanvasHeight}` }}
      >
        {isGenerating && <Skeleton className="h-full w-full" />}
        {composeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-4 text-center">
            <p>{composeError}</p>
            <Button onClick={() => void composePreview()}>Retry</Button>
          </div>
        )}
        {finalImage && !composeError && (
          <img src={finalImage} alt="Final photo strip" className="absolute inset-0 h-full w-full object-contain" />
        )}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-wrap justify-center gap-2">
        <Button onClick={onRestart} variant="outline" className="flex-grow sm:flex-grow-0">
          <RefreshCw className="mr-2 h-4 w-4" /> Start Over (Enter)
        </Button>
        <Button onClick={() => setIsFullscreen(true)} disabled={busy || !finalImage} className="flex-grow sm:flex-grow-0">
          <Expand className="mr-2 h-4 w-4" /> Fullscreen (Space)
        </Button>
        <Button onClick={() => void handlePrint()} disabled={busy} className="flex-grow sm:flex-grow-0">
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
        <Button onClick={() => void handleDownload()} disabled={busy} className="flex-grow sm:flex-grow-0">
          <Download className="mr-2 h-4 w-4" /> Download
        </Button>
        {canUseWebShareFiles() && (
          <Button onClick={() => void handleShare()} disabled={busy || !finalImage} className="flex-grow sm:flex-grow-0">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        )}
        <Button onClick={onExit} variant="secondary" className="flex-grow sm:flex-grow-0">
          <Home className="mr-2 h-4 w-4" /> Back to Home
        </Button>
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="h-[90dvh] max-w-7xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Fullscreen Photo Strip Preview</DialogTitle>
          <DialogDescription className="sr-only">Enlarged postcard preview</DialogDescription>
          {finalImage && (
            <img src={finalImage} alt="Final photo strip fullscreen" className="absolute inset-0 h-full w-full object-contain" />
          )}
          <Button
            onClick={() => setIsFullscreen(false)}
            variant="ghost"
            size="icon"
            aria-label="Close fullscreen preview"
            className="absolute right-4 top-4 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
          >
            <X size={32} />
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
