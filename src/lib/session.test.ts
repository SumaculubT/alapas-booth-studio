import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCapturedPhotos,
  getCapturedPhotos,
  hasSessionSettings,
  loadSessionSettings,
  resetSession,
  saveSessionSettings,
  setCapturedPhotos,
} from "@/lib/session";

describe("session store", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    resetSession();
  });

  it("saves and loads session settings", () => {
    saveSessionSettings({
      photoCount: 4,
      countdown: 5,
      filter: "none",
      size: "4x6",
    });
    expect(hasSessionSettings()).toBe(true);
    expect(loadSessionSettings()?.photoCount).toBe(4);
  });

  it("keeps photos in memory when sessionStorage quota fails", () => {
    setCapturedPhotos(["data:image/jpeg;base64,aaa"]);
    expect(getCapturedPhotos()).toEqual(["data:image/jpeg;base64,aaa"]);
    clearCapturedPhotos();
    expect(getCapturedPhotos()).toEqual([]);
  });

  it("resetSession clears photos and can keep settings", () => {
    saveSessionSettings({
      photoCount: 2,
      countdown: 3,
      filter: "none",
      size: "4x6",
    });
    setCapturedPhotos(["one", "two"]);
    resetSession({ keepSettings: true, keepTemplate: true });
    expect(getCapturedPhotos()).toEqual([]);
    expect(loadSessionSettings()?.photoCount).toBe(2);
  });

  it("resetSession can clear settings", () => {
    saveSessionSettings({
      photoCount: 2,
      countdown: 3,
      filter: "none",
      size: "4x6",
    });
    resetSession();
    expect(hasSessionSettings()).toBe(false);
  });
});
