import { describe, expect, it } from "vitest";
import { getCoverCropSource, getPrintableInches, getStudioCanvasSize } from "@/lib/compose";
import { getVisibleCameraLayers, requiredShotsFromLayout } from "@/lib/session";
import type { Layer } from "@/lib/types";

function camera(name: string, visible = true): Layer {
  return {
    id: name,
    type: "camera",
    name,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    isVisible: visible,
    isLocked: false,
  };
}

describe("getCoverCropSource", () => {
  it("crops the sides of a wider source", () => {
    const crop = getCoverCropSource(2000, 1000, 100, 100);
    expect(crop.sHeight).toBe(1000);
    expect(crop.sWidth).toBe(1000);
    expect(crop.sx).toBe(500);
    expect(crop.sy).toBe(0);
  });

  it("crops the top and bottom of a taller source", () => {
    const crop = getCoverCropSource(1000, 2000, 100, 100);
    expect(crop.sWidth).toBe(1000);
    expect(crop.sHeight).toBe(1000);
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBe(500);
  });

  it("returns empty crop for invalid sizes", () => {
    expect(getCoverCropSource(0, 100, 50, 50)).toEqual({ sx: 0, sy: 0, sWidth: 0, sHeight: 100 });
  });
});

describe("layout shot count", () => {
  it("uses visible camera layers only and sorts Photo 10 after Photo 2", () => {
    const layers: Layer[] = [
      camera("Photo 10"),
      camera("Photo 2"),
      camera("Photo 1", false),
      {
        id: "template",
        type: "template",
        name: "Template",
        x: 0,
        y: 0,
        width: 600,
        height: 400,
        rotation: 0,
        isVisible: true,
        isLocked: false,
      },
    ];

    expect(requiredShotsFromLayout(layers)).toBe(2);
    expect(getVisibleCameraLayers(layers).map((layer) => layer.name)).toEqual(["Photo 2", "Photo 10"]);
  });
});

describe("printable size", () => {
  it("treats 4x6 as landscape 6x4 inches", () => {
    expect(getPrintableInches("4x6")).toEqual({ widthIn: 6, heightIn: 4 });
  });

  it("uses the template layer size when present", () => {
    const size = getStudioCanvasSize(
      [
        {
          id: "template",
          type: "template",
          name: "Template",
          x: 0,
          y: 0,
          width: 600,
          height: 400,
          rotation: 0,
          isVisible: true,
          isLocked: false,
        },
      ],
      "4x6"
    );
    expect(size).toEqual({ width: 600, height: 400 });
  });
});
