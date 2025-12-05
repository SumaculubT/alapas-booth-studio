
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

type ResizeDirection = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'right' | 'bottom' | 'left';

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
  const [resizingState, setResizingState] = useState<{ layerId: string, direction: ResizeDirection, initialX: number, initialY: number } | null>(null);


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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    // Handle Dragging
    if (draggingLayer) {
      const newX = mouseX - draggingLayer.initialX;
      const newY = mouseY - draggingLayer.initialY;
      updateLayer(draggingLayer.id, { x: newX, y: newY });
    }

    // Handle Resizing
    if (resizingState) {
        const layer = layers.find(l => l.id === resizingState.layerId);
        if (!layer) return;

        let newX = layer.x;
        let newY = layer.y;
        let newWidth = layer.width;
        let newHeight = layer.height;

        const dx = mouseX - resizingState.initialX;
        const dy = mouseY - resizingState.initialY;

        if (resizingState.direction.includes('right')) {
            newWidth += dx;
        }
        if (resizingState.direction.includes('left')) {
            newWidth -= dx;
            newX += dx;
        }
        if (resizingState.direction.includes('bottom')) {
            newHeight += dy;
        }
        if (resizingState.direction.includes('top')) {
            newHeight -= dy;
            newY += dy;
        }

        if (newWidth > 10 && newHeight > 10) {
            updateLayer(resizingState.layerId, { x: newX, y: newY, width: newWidth, height: newHeight });
            setResizingState(prev => prev ? { ...prev, initialX: mouseX, initialY: mouseY } : null);
        }
    }
  }, [draggingLayer, resizingState, layers, updateLayer]);
  
  const handleMouseUp = useCallback(() => {
    setDraggingLayer(null);
    setResizingState(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


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

  const handleLayerMouseDown = (e: React.MouseEvent<HTMLDivElement>, layerId: string) => {
    setSelectedLayer(layerId);
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const initialX = e.clientX - canvasRect.left;
    const initialY = e.clientY - canvasRect.top;

    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      const offsetX = initialX - layer.x;
      const offsetY = initialY - layer.y;
      setDraggingLayer({ id: layerId, initialX: offsetX, initialY: offsetY });
    }
    e.stopPropagation();
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent<HTMLDivElement>, layerId: string, direction: ResizeDirection) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setResizingState({
        layerId,
        direction,
        initialX: e.clientX - canvasRect.left,
        initialY: e.clientY - canvasRect.top,
    });
  };

  const selectedLayerData = layers.find((l) => l.id === selectedLayer);
  const resizeHandlePositions: ResizeDirection[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];


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
                  className={`absolute flex items-center justify-center border-2 border-dashed
                    ${ selectedLayer === layer.id ? "border-primary" : "border-transparent" }
                  `}
                  style={{
                    left: `${layer.x}px`,
                    top: `${layer.y}px`,
                    width: `${layer.width}px`,
                    height: `${layer.height}px`,
                    transform: `rotate(${layer.rotation}deg)`,
                  }}
                  onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
                >
                    <div className={`w-full h-full cursor-move ${layer.bgColor || 'bg-muted/30'}`}>
                        <div className="text-center text-muted-foreground relative top-1/2 -translate-y-1/2">
                            <Camera className="mx-auto" />
                            <span className="text-sm font-semibold">Photo {index + 1}</span>
                        </div>
                    </div>
                  
                  {selectedLayer === layer.id && (
                     <>
                        {resizeHandlePositions.map(direction => (
                            <div
                                key={direction}
                                onMouseDown={(e) => handleResizeHandleMouseDown(e, layer.id, direction)}
                                className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full"
                                style={{
                                    top: direction.includes('top') ? '-6px' : 'auto',
                                    bottom: direction.includes('bottom') ? '-6px' : 'auto',
                                    left: direction.includes('left') ? '-6px' : 'auto',
                                    right: direction.includes('right') ? '-6px' : 'auto',
                                    cursor: `${direction.startsWith('top') || direction.startsWith('bottom') ? 'ns' : ''}-${direction.endsWith('left') || direction.endsWith('right') ? 'ew' : ''}-resize`
                                }}
                            />
                        ))}
                    </>
                  )}
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
                            <Input type="number" value={Math.round(selectedLayerData.width)} onChange={e => updateLayer(selectedLayerData.id, { width: parseInt(e.target.value) })} />
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
