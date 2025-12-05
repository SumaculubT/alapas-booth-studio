
"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Layers,
  UploadCloud,
  Camera,
  Trash2,
  ArrowLeft,
  Settings,
} from "lucide-react";

interface Layer {
  id: string;
  type: "image" | "camera";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  url?: string;
  bgColor?: string;
}

const photoBoxColors = [
  "bg-blue-500/30",
  "bg-green-500/30",
  "bg-yellow-500/30",
  "bg-red-500/30",
  "bg-purple-500/30",
  "bg-pink-500/30",
];


function SnapStripStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventSize = searchParams.get("size") || "2x6";
  const isLandscape = eventSize === "4x6";
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 750 });
  const [draggingLayer, setDraggingLayer] = useState<{ id: string; initialX: number; initialY: number; } | null>(null);

  const updateLayer = useCallback((id: string, newProps: Partial<Layer>) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === id ? { ...layer, ...newProps } : layer
      )
    );
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (canvasWrapperRef.current) {
        const parentWidth = canvasWrapperRef.current.offsetWidth;
        // Keep a bit of padding
        const newWidth = parentWidth * 0.9;
        const newHeight = newWidth / (isLandscape ? 6 / 4 : 2 / 6);
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };
    window.addEventListener("resize", handleResize);
    // Initial size calculation
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [isLandscape]);

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingLayer || !canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate new position relative to the canvas
    const newX = e.clientX - canvasRect.left - draggingLayer.initialX;
    const newY = e.clientY - canvasRect.top - draggingLayer.initialY;

    updateLayer(draggingLayer.id, { x: newX, y: newY });
  };
  
  const handleMouseUp = () => {
    setDraggingLayer(null);
  };

  useEffect(() => {
    if (draggingLayer) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingLayer]);


  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTemplateUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addCameraLayer = () => {
    const cameraLayers = layers.filter((l) => l.type === "camera");
    const colorIndex = cameraLayers.length % photoBoxColors.length;

    const newLayer: Layer = {
      id: `camera-${Date.now()}`,
      type: "camera",
      name: `Photo ${cameraLayers.length + 1}`,
      x: 10,
      y: 10,
      width: 150,
      height: 150,
      rotation: 0,
      bgColor: photoBoxColors[colorIndex],
    };
    setLayers([...layers, newLayer]);
    setSelectedLayer(newLayer.id);
  };
  
  const removeLayer = (id: string) => {
    setLayers(layers.filter(layer => layer.id !== id));
    if (selectedLayer === id) {
        setSelectedLayer(null);
    }
  }

  const handleLayerMouseDown = (e: React.MouseEvent<HTMLDivElement>, layer: Layer) => {
    setSelectedLayer(layer.id);
    const initialX = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const initialY = e.clientY - e.currentTarget.getBoundingClientRect().top;
    setDraggingLayer({ id: layer.id, initialX, initialY });
    e.stopPropagation(); // Prevent canvas click
  };

  const selectedLayerData = layers.find((l) => l.id === selectedLayer);

  return (
    <SidebarProvider>
      <Sidebar side="right" variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Layers className="text-primary" />
            <h2 className="text-lg font-semibold">Layers</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {templateUrl && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={selectedLayer === "template"}
                    onClick={() => setSelectedLayer("template")}
                  >
                    Template Image
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {layers.map((layer) => (
                <SidebarMenuItem key={layer.id}>
                  <SidebarMenuButton
                    isActive={layer.id === selectedLayer}
                    onClick={() => setSelectedLayer(layer.id)}
                  >
                    <Camera size={16} />
                    {layer.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Button onClick={addCameraLayer} className="w-full">
            <Camera className="mr-2" /> Add Photo Box
          </Button>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        <main className="flex flex-1 flex-col p-4 md:p-6 bg-muted/40">
           <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => router.push("/")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
            <h1 className="text-2xl font-bold">Studio Editor</h1>
            <div className="flex items-center gap-2">
                <Button>
                    Start Session
                </Button>
                <SidebarTrigger />
            </div>
          </div>
          
          <div ref={canvasWrapperRef} className="flex-1 w-full flex items-center justify-center">
            <div
              ref={canvasRef}
              className="relative bg-card shadow-lg"
              style={{ width: canvasSize.width, height: canvasSize.height }}
              onClick={() => setSelectedLayer(null)}
            >
              {templateUrl && (
                <Image
                  src={templateUrl}
                  alt="Template"
                  fill
                  style={{objectFit: "contain"}}
                  className="pointer-events-none"
                />
              )}
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  className={`absolute flex items-center justify-center border-2 border-dashed cursor-move ${
                    selectedLayer === layer.id
                      ? "border-primary"
                      : "border-muted-foreground"
                  } ${layer.bgColor || 'bg-muted/30'}`}
                  style={{
                    left: `${layer.x}px`,
                    top: `${layer.y}px`,
                    width: `${layer.width}px`,
                    height: `${layer.height}px`,
                    transform: `rotate(${layer.rotation}deg)`,
                  }}
                  onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                >
                  <div className="text-center text-muted-foreground">
                    <Camera className="mx-auto" />
                    <span className="text-sm font-semibold">Photo {index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </SidebarInset>

       <Sidebar side="left" variant="sidebar" collapsible="offcanvas" className="w-80">
        <SidebarHeader>
            <div className="flex items-center gap-2">
                <Settings className="text-primary"/>
                <h2 className="text-lg font-semibold">Properties</h2>
            </div>
        </SidebarHeader>
        <SidebarContent>
            <div className="p-4 space-y-6">
                {!selectedLayerData && !templateUrl && (
                    <Label
                        htmlFor="template-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold text-primary">Upload Template</span>
                        </p>
                        <p className="text-xs text-muted-foreground">PNG recommended</p>
                        </div>
                        <Input id="template-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleTemplateUpload} />
                    </Label>
                )}

                {selectedLayerData && (
                    <div className="space-y-4">
                        <h3 className="font-medium">{selectedLayerData.name}</h3>
                        <div className="space-y-2">
                            <Label>Position (X, Y)</Label>
                            <div className="grid grid-cols-2 gap-2">
                            <Input type="number" value={Math.round(selectedLayerData.x)} onChange={e => updateLayer(selectedLayerData.id, { x: parseInt(e.target.value) })} />
                            <Input type="number" value={Math.round(selectedLayerData.y)} onChange={e => updateLayer(selectedLayerData.id, { y: parseInt(e.target.value) })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Size (W, H)</Label>
                            <div className="grid grid-cols-2 gap-2">
                            <Input type="number" value={selectedLayerData.width} onChange={e => updateLayer(selectedLayerData.id, { width: parseInt(e.target.value) })} />
                            <Input type="number" value={Math.round(selectedLayerData.height)} onChange={e => updateLayer(selectedLayerData.id, { height: parseInt(e.target.value) })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Rotation</Label>
                            <Slider value={[selectedLayerData.rotation]} max={360} step={1} onValueChange={([val]) => updateLayer(selectedLayerData.id, { rotation: val })} />
                        </div>
                        <Button variant="destructive" onClick={() => removeLayer(selectedLayerData.id)} className="w-full">
                            <Trash2 className="mr-2"/>
                            Delete Layer
                        </Button>
                    </div>
                )}
            </div>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SnapStripStudio />
    </Suspense>
  );
}
