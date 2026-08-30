export type LayerType = "image" | "camera" | "template";

export interface Layer {
  id: string;
  type: LayerType;
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

export interface SessionSettings {
  photoCount: number;
  countdown: number;
  filter: string;
  size: string;
}

export type PhotoboothPhase =
  | "camera_initializing"
  | "ready"
  | "countdown"
  | "exposing"
  | "review"
  | "advancing"
  | "complete"
  | "error";

export interface StudioLayoutPersist {
  canvasWidth: number;
  canvasHeight: number;
  cameras: Layer[];
}
