import type { Layer } from "@/lib/types";
import { getVisibleCameraLayers } from "@/lib/session";
import { DOWNLOAD_DPI, PRINTABLE_LANDSCAPE_4X6 } from "@/lib/default-slots";

export interface CoverCropSource {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
}

export function getCoverCropSource(
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number
): CoverCropSource {
  if (sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
    return { sx: 0, sy: 0, sWidth: Math.max(sourceWidth, 0), sHeight: Math.max(sourceHeight, 0) };
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const destRatio = destWidth / destHeight;

  if (sourceRatio > destRatio) {
    const sHeight = sourceHeight;
    const sWidth = sHeight * destRatio;
    return {
      sx: (sourceWidth - sWidth) / 2,
      sy: 0,
      sWidth,
      sHeight,
    };
  }

  const sWidth = sourceWidth;
  const sHeight = sWidth / destRatio;
  return {
    sx: 0,
    sy: (sourceHeight - sHeight) / 2,
    sWidth,
    sHeight,
  };
}

export function getPrintableInches(eventSize: string): { widthIn: number; heightIn: number } {
  if (eventSize === "4x6") {
    return { widthIn: PRINTABLE_LANDSCAPE_4X6.widthIn, heightIn: PRINTABLE_LANDSCAPE_4X6.heightIn };
  }
  return { widthIn: PRINTABLE_LANDSCAPE_4X6.widthIn, heightIn: PRINTABLE_LANDSCAPE_4X6.heightIn };
}

export function getStudioCanvasSize(templateLayout: Layer[], eventSize: string): { width: number; height: number } {
  const templateLayer = templateLayout.find((layer) => layer.type === "template");
  if (templateLayer?.width && templateLayer?.height) {
    return { width: templateLayer.width, height: templateLayer.height };
  }
  const printable = getPrintableInches(eventSize);
  return { width: printable.widthIn * 100, height: printable.heightIn * 100 };
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    if (!src.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }
    const handleLoad = () => resolve(image);
    const handleError = () => reject(new Error("Failed to load image"));
    image.onload = handleLoad;
    image.onerror = handleError;
    image.src = src;
    if (image.complete && image.naturalWidth > 0) {
      resolve(image);
    }
  });
}

export async function generateStrip(
  templateLayout: Layer[],
  photos: string[],
  eventSize: string,
  targetWidth: number,
  format: "png" | "jpeg" = "png"
): Promise<string> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", {
    willReadFrequently: false,
    alpha: format === "png",
    colorSpace: "srgb",
    desynchronized: false,
  });
  if (!ctx) {
    throw new Error("Could not create a drawing surface for the postcard.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const { width: studioCanvasWidth, height: studioCanvasHeight } = getStudioCanvasSize(
    templateLayout,
    eventSize
  );
  const aspectRatio = studioCanvasWidth / studioCanvasHeight;
  canvas.width = targetWidth;
  canvas.height = targetWidth / aspectRatio;

  if (format === "jpeg") {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const scaleX = canvas.width / studioCanvasWidth;
  const scaleY = canvas.height / studioCanvasHeight;
  const cameraLayers = getVisibleCameraLayers(templateLayout);
  const templateLayer = templateLayout.find((layer) => layer.type === "template");

  const templateImage = templateLayer?.url ? await loadHtmlImage(templateLayer.url) : null;
  const photoImages = await Promise.all(photos.map((photo) => loadHtmlImage(photo)));

  photoImages.forEach((photo, index) => {
    const layer = cameraLayers[index];
    if (!layer) return;

    const pos = {
      x: layer.x * scaleX,
      y: layer.y * scaleY,
      width: layer.width * scaleX,
      height: layer.height * scaleY,
    };
    const crop = getCoverCropSource(photo.naturalWidth, photo.naturalHeight, pos.width, pos.height);

    ctx.save();
    ctx.translate(pos.x + pos.width / 2, pos.y + pos.height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.drawImage(
      photo,
      crop.sx,
      crop.sy,
      crop.sWidth,
      crop.sHeight,
      -pos.width / 2,
      -pos.height / 2,
      pos.width,
      pos.height
    );
    ctx.restore();
  });

  if (templateImage && templateLayer) {
    ctx.drawImage(
      templateImage,
      templateLayer.x * scaleX,
      templateLayer.y * scaleY,
      templateLayer.width * scaleX,
      templateLayer.height * scaleY
    );
  }

  if (format === "jpeg") {
    return canvas.toDataURL("image/jpeg", 1.0);
  }
  return canvas.toDataURL("image/png");
}

export async function getDownloadWidth(templateLayout: Layer[], eventSize: string): Promise<number> {
  const templateLayer = templateLayout.find((layer) => layer.type === "template");
  const printable = getPrintableInches(eventSize);
  const targetWidth = printable.widthIn * DOWNLOAD_DPI;

  if (!templateLayer?.url) {
    return targetWidth;
  }

  try {
    const templateImg = await loadHtmlImage(templateLayer.url);
    return Math.max(templateImg.naturalWidth, targetWidth);
  } catch {
    return targetWidth;
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
