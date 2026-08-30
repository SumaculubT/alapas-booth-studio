import type { Layer } from "@/lib/types";

export const EDITOR_WIDTH = 600;
export const DEFAULT_TEMPLATE_PATH = "/templates/landscape/century_layout.png";
export const DEFAULT_EVENT_SIZE = "4x6";

export const PRINTABLE_LANDSCAPE_4X6 = { widthIn: 6, heightIn: 4 } as const;
export const DOWNLOAD_DPI = 600;

const photoBoxColors = [
  "bg-blue-500/30",
  "bg-green-500/30",
  "bg-yellow-500/30",
  "bg-red-500/30",
  "bg-purple-500/30",
  "bg-pink-500/30",
];

export function editorSizeFromAspect(aspectRatio: number): { width: number; height: number } {
  return {
    width: EDITOR_WIDTH,
    height: EDITOR_WIDTH / aspectRatio,
  };
}

/**
 * Photo windows measured from century_layout.png (4000x2667) and
 * scaled into the 600-wide editor space.
 */
export const CENTURY_DEFAULT_SLOTS: Array<Pick<Layer, "name" | "x" | "y" | "width" | "height">> = [
  { name: "Photo 1", x: 53, y: 47, width: 145, height: 83 },
  { name: "Photo 2", x: 221, y: 47, width: 145, height: 83 },
  { name: "Photo 3", x: 388, y: 47, width: 145, height: 83 },
  { name: "Photo 4", x: 215, y: 163, width: 321, height: 190 },
];

export function createCameraLayer(
  slot: Pick<Layer, "name" | "x" | "y" | "width" | "height">,
  index: number
): Layer {
  return {
    id: `camera-${index}-${slot.name.replace(/\s+/g, "-").toLowerCase()}`,
    type: "camera",
    name: slot.name,
    x: slot.x,
    y: slot.y,
    width: slot.width,
    height: slot.height,
    rotation: 0,
    isVisible: true,
    isLocked: false,
    bgColor: photoBoxColors[index % photoBoxColors.length],
  };
}

export function createCenturyCameraLayers(): Layer[] {
  return CENTURY_DEFAULT_SLOTS.map((slot, index) => createCameraLayer(slot, index));
}

export function nextPhotoBoxColor(existingCount: number): string {
  return photoBoxColors[existingCount % photoBoxColors.length];
}
