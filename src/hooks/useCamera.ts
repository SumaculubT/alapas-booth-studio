"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { describeCameraError, type CameraErrorCopy } from "@/lib/camera-errors";
import { getCoverCropSource } from "@/lib/compose";

export type CameraFacing = "user" | "environment";

interface UseCameraOptions {
  facingMode?: CameraFacing;
}

export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>, options: UseCameraOptions = {}) {
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const [videoReady, setVideoReady] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacing>(options.facingMode ?? "user");
  const [error, setError] = useState<CameraErrorCopy | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoReady(false);
  }, [videoRef]);

  const startStream = useCallback(async (facing: CameraFacing) => {
    const requestId = ++requestIdRef.current;
    setError(null);
    setVideoReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        const handleReady = () => {
          if (video.videoWidth > 0) resolve();
        };
        if (video.readyState >= 1 && video.videoWidth > 0) {
          resolve();
          return;
        }
        video.onloadedmetadata = handleReady;
        video.onerror = () => reject(new Error("Video element failed"));
      });

      try {
        await video.play();
      } catch {
        // Autoplay can still succeed via the muted attribute.
      }

      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      for (let attempt = 0; attempt < 20 && video.videoWidth <= 0; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        if (requestId !== requestIdRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
      }

      if (video.videoWidth <= 0) {
        throw new DOMException("Camera started without a usable video frame", "AbortError");
      }

      setPermissionDenied(false);
      setVideoReady(true);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const copy = describeCameraError(err);
      setError(copy);
      setPermissionDenied(copy.name === "NotAllowedError" || copy.name === "PermissionDeniedError");
      setVideoReady(false);
    }
  }, [videoRef]);

  useEffect(() => {
    void startStream(facingMode);
    return () => {
      requestIdRef.current += 1;
      stopStream();
    };
  }, [facingMode, startStream, stopStream]);

  useEffect(() => {
    const handleVisibility = () => {
      setIsHidden(document.visibilityState === "hidden");
    };
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const retry = useCallback(() => {
    void startStream(facingMode);
  }, [facingMode, startStream]);

  const switchFacing = useCallback(() => {
    setFacingMode((current) => (current === "user" ? "environment" : "user"));
  }, []);

  const captureCoverFrame = useCallback((canvas: HTMLCanvasElement): string | null => {
    const video = videoRef.current;
    if (!video || !videoReady || video.videoWidth <= 0 || video.videoHeight <= 0) {
      return null;
    }

    const destWidth = video.clientWidth || video.videoWidth;
    const destHeight = video.clientHeight || video.videoHeight;
    const crop = getCoverCropSource(video.videoWidth, video.videoHeight, destWidth, destHeight);

    canvas.width = Math.max(1, Math.round(crop.sWidth));
    canvas.height = Math.max(1, Math.round(crop.sHeight));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return null;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    try {
      context.drawImage(
        video,
        crop.sx,
        crop.sy,
        crop.sWidth,
        crop.sHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
      return canvas.toDataURL("image/jpeg", 0.92);
    } catch {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.92);
    }
  }, [videoReady, videoRef]);

  return {
    videoReady,
    isHidden,
    facingMode,
    error,
    permissionDenied,
    retry,
    switchFacing,
    captureCoverFrame,
    stopStream,
  };
}
