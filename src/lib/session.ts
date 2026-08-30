import type { Layer, SessionSettings, StudioLayoutPersist } from "@/lib/types";
import { STORAGE_KEYS, getStorageItem, removeStorageItem, setStorageItem } from "@/lib/storage";
import { clearTemplateImage, getTemplateImage, setTemplateImage } from "@/lib/template-cache";

const LEGACY_PHOTOS_KEY = "captured-photos";

let photoCache: string[] = [];

export function getVisibleCameraLayers(layers: Layer[]): Layer[] {
  return layers
    .filter((layer) => layer.type === "camera" && layer.isVisible)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
}

export function requiredShotsFromLayout(layers: Layer[]): number {
  return getVisibleCameraLayers(layers).length;
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function saveSessionSettings(settings: SessionSettings) {
  if (!canUseSessionStorage()) return;
  setStorageItem(sessionStorage, STORAGE_KEYS.sessionSettings, JSON.stringify(settings));
}

export function loadSessionSettings(): SessionSettings | null {
  if (!canUseSessionStorage()) return null;
  const raw = getStorageItem(sessionStorage, STORAGE_KEYS.sessionSettings);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionSettings;
    if (typeof parsed.photoCount !== "number" || typeof parsed.countdown !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasSessionSettings(): boolean {
  return loadSessionSettings() !== null;
}

export function setCapturedPhotos(photos: string[]) {
  photoCache = [...photos];
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(LEGACY_PHOTOS_KEY, JSON.stringify(photos));
  } catch (error) {
    console.warn("Could not persist captured photos to sessionStorage:", error);
  }
}

export function getCapturedPhotos(): string[] {
  if (photoCache.length > 0) return [...photoCache];
  if (!canUseSessionStorage()) return [];
  const raw = sessionStorage.getItem(LEGACY_PHOTOS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    photoCache = parsed.filter((item): item is string => typeof item === "string");
    return [...photoCache];
  } catch {
    return [];
  }
}

export function clearCapturedPhotos() {
  photoCache = [];
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(LEGACY_PHOTOS_KEY);
}

export function saveSessionLayout(layers: Layer[]) {
  if (!canUseSessionStorage()) return;
  const templateLayer = layers.find((layer) => layer.type === "template");
  const layoutWithoutTemplateUrl = layers.map((layer) => {
    if (layer.type === "template") {
      const rest = { ...layer };
      delete rest.url;
      return rest;
    }
    return layer;
  });

  if (templateLayer?.url) {
    setTemplateImage(templateLayer.url);
    try {
      setStorageItem(sessionStorage, STORAGE_KEYS.templateUrl, templateLayer.url);
    } catch (error) {
      console.warn("Could not persist template URL:", error);
    }
  } else {
    clearTemplateImage();
    removeStorageItem(sessionStorage, STORAGE_KEYS.templateUrl);
  }

  setStorageItem(sessionStorage, STORAGE_KEYS.layout, JSON.stringify(layoutWithoutTemplateUrl));
}

export function loadSessionLayout(): Layer[] | null {
  if (!canUseSessionStorage()) return null;
  const raw = getStorageItem(sessionStorage, STORAGE_KEYS.layout);
  if (!raw) return null;
  try {
    const layout = JSON.parse(raw) as Layer[];
    if (!Array.isArray(layout)) return null;
    let templateUrl = getTemplateImage();
    if (!templateUrl) {
      templateUrl = getStorageItem(sessionStorage, STORAGE_KEYS.templateUrl);
      if (templateUrl) setTemplateImage(templateUrl);
    }
    if (templateUrl) {
      const templateLayer = layout.find((layer) => layer.type === "template");
      if (templateLayer) {
        templateLayer.url = templateUrl;
      } else {
        layout.unshift({
          id: "template-from-storage",
          type: "template",
          name: "Template Image",
          x: 0,
          y: 0,
          width: 600,
          height: 400,
          rotation: 0,
          isVisible: true,
          isLocked: false,
          url: templateUrl,
        });
      }
    }
    return layout;
  } catch {
    return null;
  }
}

export function saveStudioLayout(persist: StudioLayoutPersist) {
  if (!canUseLocalStorage()) return;
  setStorageItem(localStorage, STORAGE_KEYS.studioLayout, JSON.stringify(persist));
}

export function loadStudioLayout(): StudioLayoutPersist | null {
  if (!canUseLocalStorage()) return null;
  const raw = getStorageItem(localStorage, STORAGE_KEYS.studioLayout);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StudioLayoutPersist;
    if (!parsed || !Array.isArray(parsed.cameras)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resetSession(options: { keepTemplate?: boolean; keepSettings?: boolean } = {}) {
  clearCapturedPhotos();
  if (!options.keepSettings && canUseSessionStorage()) {
    removeStorageItem(sessionStorage, STORAGE_KEYS.sessionSettings);
  }
  if (!options.keepTemplate && canUseSessionStorage()) {
    clearTemplateImage();
    removeStorageItem(sessionStorage, STORAGE_KEYS.templateUrl);
    removeStorageItem(sessionStorage, STORAGE_KEYS.layout);
  }
}

export type { SessionSettings };
