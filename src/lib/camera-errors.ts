export interface CameraErrorCopy {
  title: string;
  description: string;
  name: string;
}

export function describeCameraError(error: unknown): CameraErrorCopy {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : "Error";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        name,
        title: "Camera access was denied",
        description: "Allow camera access in your browser settings, then tap Try again.",
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        name,
        title: "No camera was found",
        description: "Connect a camera and tap Try again.",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        name,
        title: "Camera is already in use",
        description: "Close other apps using the camera, then tap Try again.",
      };
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return {
        name,
        title: "This camera cannot be used",
        description: "Try another camera, then tap Try again.",
      };
    case "AbortError":
      return {
        name,
        title: "Camera startup was interrupted",
        description: "Tap Try again to restart the camera.",
      };
    case "SecurityError":
      return {
        name,
        title: "Camera is blocked on this page",
        description: "Open the booth over HTTPS or localhost, then tap Try again.",
      };
    default:
      return {
        name,
        title: "Camera could not start",
        description: "Check the camera connection and tap Try again.",
      };
  }
}
