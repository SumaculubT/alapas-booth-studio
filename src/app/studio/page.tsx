
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
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Unlock,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";
import SessionSettingsDialog from "@/components/app/SessionSettingsDialog";
import { setTemplateImage, clearTemplateImage } from "@/lib/template-cache";

interface Layer {
  id: string;
  type: "image" | "camera" | "template";
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

type ResizeDirection = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'right' | 'bottom' | 'left';

const photoBoxColors = [
  "bg-blue-500/30",
  "bg-green-500/30",
  "bg-yellow-500/30",
  "bg-red-500/30",
  "bg-purple-500/30",
  "bg-pink-500/30",
];

const SNAP_THRESHOLD = 5;


function SnapStripStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventSize = searchParams.get("size") || "2x6";
  const isLandscape = eventSize === "4x6";
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  
  const getInitialCanvasSize = () => {
    if (isLandscape) {
      return { width: 600, height: 400 };
    }
    return { width: 400, height: 1200 };
  };

  const [canvasSize, setCanvasSize] = useState(getInitialCanvasSize());
  const [draggingLayer, setDraggingLayer] = useState<{ id: string; initialX: number; initialY: number; } | null>(null);
  const [resizingState, setResizingState] = useState<{ layerId: string, direction: ResizeDirection, initialX: number, initialY: number } | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [zoom, setZoom] = useState(0.5);

  const updateLayer = useCallback((id: string, newProps: Partial<Layer>) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === id ? { ...layer, ...newProps } : layer
      )
    );
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left) / zoom;
    const mouseY = (e.clientY - canvasRect.top) / zoom;

    // Handle Dragging
    if (draggingLayer) {
        const draggedLayer = layers.find(l => l.id === draggingLayer.id);
        if (!draggedLayer) return;

        let newX = mouseX - draggingLayer.initialX;
        let newY = mouseY - draggingLayer.initialY;
        
        // Snapping logic
        const canvasCenterX = canvasSize.width / 2;
        const canvasCenterY = canvasSize.height / 2;
        const layerCenterX = newX + draggedLayer.width / 2;
        const layerCenterY = newY + draggedLayer.height / 2;

        // Snap to canvas center
        if (Math.abs(layerCenterX - canvasCenterX) < SNAP_THRESHOLD) newX = canvasCenterX - draggedLayer.width / 2;
        if (Math.abs(layerCenterY - canvasCenterY) < SNAP_THRESHOLD) newY = canvasCenterY - draggedLayer.height / 2;
        // Snap to canvas edges
        if (Math.abs(newX) < SNAP_THRESHOLD) newX = 0;
        if (Math.abs(newY) < SNAP_THRESHOLD) newY = 0;
        if (Math.abs((newX + draggedLayer.width) - canvasSize.width) < SNAP_THRESHOLD) newX = canvasSize.width - draggedLayer.width;
        if (Math.abs((newY + draggedLayer.height) - canvasSize.height) < SNAP_THRESHOLD) newY = canvasSize.height - draggedLayer.height;

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
            updateLayer(resizingState.layerId, { x: newX, y: newY, width: newWidth, height: newWidth });
            setResizingState(prev => prev ? { ...prev, initialX: mouseX, initialY: mouseY } : null);
        }
    }
  }, [draggingLayer, resizingState, layers, updateLayer, canvasSize, zoom]);
  
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

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.altKey) {
        e.preventDefault();
        const zoomSpeed = 0.005;
        setZoom(prevZoom => {
          const newZoom = prevZoom - e.deltaY * zoomSpeed;
          return Math.max(0.1, Math.min(newZoom, 2)); // Clamp zoom between 0.1 and 2
        });
      }
    };

    const wrapper = canvasWrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (wrapper) {
        wrapper.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);


  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newLayer: Layer = {
          id: `template-${Date.now()}`,
          type: "template",
          name: 'Template Image',
          x: 0,
          y: 0,
          width: canvasSize.width,
          height: canvasSize.height,
          rotation: 0,
          isVisible: true,
          isLocked: false,
          url: reader.result as string,
        };
        // Add template as the first layer (bottom of the stack)
        setLayers(prev => [newLayer, ...prev]);
        setSelectedLayer(newLayer.id);
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
      isVisible: true,
      isLocked: false,
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

  const toggleLayerVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const layer = layers.find(l => l.id === id);
    if(layer) {
      updateLayer(id, { isVisible: !layer.isVisible });
    }
  }
  
  const toggleLayerLock = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const layer = layers.find(l => l.id === id);
    if (layer) {
      updateLayer(id, { isLocked: !layer.isLocked });
    }
  };

  const handleLayerMouseDown = (e: React.MouseEvent<HTMLDivElement>, layerId: string) => {
    e.stopPropagation();
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    setSelectedLayer(layerId);

    if (layer.isLocked) return;

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const initialX = (e.clientX - canvasRect.left) / zoom;
    const initialY = (e.clientY - canvasRect.top) / zoom;

    const offsetX = initialX - layer.x;
    const offsetY = initialY - layer.y;
    setDraggingLayer({ id: layerId, initialX: offsetX, initialY: offsetY });
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent<HTMLDivElement>, layerId: string, direction: ResizeDirection) => {
    e.stopPropagation();
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.isLocked) return;
    
    setSelectedLayer(layerId);
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setResizingState({
        layerId,
        direction,
        initialX: (e.clientX - canvasRect.left) / zoom,
        initialY: (e.clientY - canvasRect.top) / zoom,
    });
  };

  const getCursorForDirection = (direction: ResizeDirection) => {
    switch (direction) {
      case 'top-left':
      case 'bottom-right':
        return 'nwse-resize';
      case 'top-right':
      case 'bottom-left':
        return 'nesw-resize';
      case 'top':
      case 'bottom':
        return 'ns-resize';
      case 'left':
      case 'right':
        return 'ew-resize';
      default:
        return 'auto';
    }
  };


  const selectedLayerData = layers.find((l) => l.id === selectedLayer);
  const resizeHandlePositions: ResizeDirection[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  const handleLayerDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    const layer = layers.find(l => l.id === id);
    if (layer && layer.isLocked) {
      e.preventDefault();
      return;
    }
    setDraggedLayerId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleLayerDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedLayerId) return;

    const draggedIndex = layers.findIndex(l => l.id === draggedLayerId);
    const targetIndex = layers.findIndex(l => l.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const newLayers = [...layers];
    const [draggedLayer] = newLayers.splice(draggedIndex, 1);
    newLayers.splice(targetIndex, 0, draggedLayer);
    
    setLayers(newLayers);
  };

  const handleLayerDragEnd = () => {
    setDraggedLayerId(null);
  };

  const hasTemplate = layers.some(l => l.type === 'template');
  const cameraLayersCount = layers.filter(l => l.type === 'camera').length;

  const handleStartSession = (settings: { countdown: number; filter: string }) => {
    // Separate the template image URL from the rest of the layer data.
    const templateLayer = layers.find(l => l.type === 'template');
    const layoutWithoutTemplateUrl = layers.map(l => {
      if (l.type === 'template') {
        const { url, ...rest } = l;
        return rest;
      }
      return l;
    });

    // Use the in-memory cache for the large image data
    if (templateLayer && templateLayer.url) {
      setTemplateImage(templateLayer.url);
    } else {
      clearTemplateImage();
    }
    sessionStorage.setItem('snapstrip-layout', JSON.stringify(layoutWithoutTemplateUrl));

    const queryParams = new URLSearchParams({
        size: eventSize,
        photoCount: String(cameraLayersCount),
        countdown: String(settings.countdown),
        filter: settings.filter
    });
    
    router.push(`/session?${queryParams.toString()}`);
  };


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
              {[...layers].reverse().map((layer) => (
                <div
                  key={layer.id}
                  draggable={!layer.isLocked}
                  onDragStart={(e) => handleLayerDragStart(e, layer.id)}
                  onDragOver={handleLayerDragOver}
                  onDrop={(e) => handleLayerDrop(e, layer.id)}
                  onDragEnd={handleLayerDragEnd}
                  className={`relative ${layer.isLocked ? 'cursor-not-allowed' : 'cursor-grab'} ${draggedLayerId === layer.id ? 'opacity-50' : ''}`}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={layer.id === selectedLayer}
                      onClick={() => setSelectedLayer(layer.id)}
                      className={!layer.isVisible ? 'text-muted-foreground' : ''}
                    >
                      {layer.type === 'camera' ? <Camera size={16} /> : <ImageIcon size={16} />}
                      {layer.name}
                    </SidebarMenuButton>
                     <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => toggleLayerVisibility(e, layer.id)}>
                            {layer.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => toggleLayerLock(e, layer.id)}>
                            {layer.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                        </Button>
                     </div>
                  </SidebarMenuItem>
                </div>
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
            <div className="flex items-center gap-1 bg-background p-1 rounded-md border">
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => z + 0.1)}><ZoomIn/></Button>
              <Button variant="ghost" size="icon" onClick={() => setZoom(0.5)}><Maximize/></Button>
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => z - 0.1)}><ZoomOut/></Button>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={() => setIsSettingsOpen(true)}>
                    Start Session
                </Button>
                <SidebarTrigger />
            </div>
          </div>
          
          <div 
            ref={canvasWrapperRef} 
            className="flex-1 w-full flex items-center justify-center overflow-auto"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget || e.target === canvasRef.current) {
                setSelectedLayer(null);
              }
            }}
          >
            <div
              ref={canvasRef}
              className="relative bg-card shadow-lg"
              style={{ 
                width: canvasSize.width, 
                height: canvasSize.height,
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              {layers.map((layer, index) => {
                if (!layer.isVisible) return null;

                const isSelected = selectedLayer === layer.id;

                const layerStyle: React.CSSProperties = {
                    left: `${layer.x}px`,
                    top: `${layer.y}px`,
                    width: `${layer.width}px`,
                    height: `${layer.height}px`,
                    transform: `rotate(${layer.rotation}deg)`,
                    zIndex: isSelected ? layers.length + 1 : index,
                    pointerEvents: layer.isLocked ? 'none' : 'auto',
                };
                
                return (
                    <div
                        key={layer.id}
                        onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
                        className={`absolute ${ isSelected && !layer.isLocked ? "border-2 border-dashed border-primary" : "" }`}
                        style={layerStyle}
                    >
                        {layer.type === 'template' && layer.url && (
                            <Image
                                src={layer.url}
                                alt={layer.name}
                                fill
                                style={{objectFit: "contain"}}
                                className="pointer-events-none"
                            />
                        )}

                        {layer.type === 'camera' && (
                            <div className={`w-full h-full ${layer.bgColor || 'bg-muted/30'} flex items-center justify-center`}>
                                <div className="text-center text-muted-foreground">
                                    <Camera className="mx-auto" />
                                    <span className="text-sm font-semibold">{layer.name}</span>
                                </div>
                            </div>
                        )}

                        {isSelected && !layer.isLocked && (
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
                                        cursor: getCursorForDirection(direction),
                                        zIndex: layers.length + 2,
                                        pointerEvents: 'auto', // Ensure handles are always clickable
                                    }}
                                />
                            ))}
                        </>
                        )}
                    </div>
                );
              })}
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
                {!hasTemplate && (
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
                        <fieldset disabled={selectedLayerData.isLocked} className="space-y-4 disabled:opacity-70">
                          <div className="space-y-2">
                              <Label htmlFor="layer-name">Layer Name</Label>
                              <Input id="layer-name" value={selectedLayerData.name} onChange={e => updateLayer(selectedLayerData.id, { name: e.target.value })} />
                          </div>
                          
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
                        </fieldset>
                    </div>
                )}
            </div>
        </SidebarContent>
      </Sidebar>

      <SessionSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onStartSession={handleStartSession}
        photoCount={cameraLayersCount}
        eventSize={eventSize}
      />
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

    

    

    