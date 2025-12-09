"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRINT_SETTINGS_KEY = 'snapstrip-print-settings';

export interface PrintSettings {
  paperSize: '4x6' | '5x7' | '8x10' | 'custom';
  customWidth: number;
  customHeight: number;
  dpi: 150 | 300 | 600;
  scaleMode: 'fit' | 'actual' | 'custom';
  customScale: number;
  margins: 'none' | 'small' | 'medium' | 'large' | 'custom';
  customMargin: number;
  orientation: 'portrait' | 'landscape';
  printerName: string;
}

const defaultPrintSettings: PrintSettings = {
  paperSize: '4x6',
  customWidth: 6,
  customHeight: 4,
  dpi: 300,
  scaleMode: 'fit',
  customScale: 100,
  margins: 'small',
  customMargin: 0.1,
  orientation: 'landscape',
  printerName: 'Epson L3210',
};

interface PrintSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function loadPrintSettings(): PrintSettings {
  if (typeof window === 'undefined') return defaultPrintSettings;
  
  const saved = localStorage.getItem(PRINT_SETTINGS_KEY);
  if (saved) {
    try {
      return { ...defaultPrintSettings, ...JSON.parse(saved) };
    } catch (error) {
      console.error('Error loading print settings:', error);
    }
  }
  return defaultPrintSettings;
}

export function savePrintSettings(settings: PrintSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify(settings));
}

export default function PrintSettingsDialog({
  isOpen,
  onOpenChange,
}: PrintSettingsDialogProps) {
  const [settings, setSettings] = useState<PrintSettings>(defaultPrintSettings);

  useEffect(() => {
    // Load saved settings when dialog opens
    if (isOpen) {
      setSettings(loadPrintSettings());
    }
  }, [isOpen]);

  // Prevent spacebar from triggering other handlers when typing in inputs
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // If user is typing in an input/textarea, stop spacebar from bubbling
    if (event.key === ' ' || event.key === 'Space') {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow spacebar to work normally in input fields
        return;
      }
      // Prevent spacebar from triggering other handlers when dialog is open
      event.stopPropagation();
    }
  }, []);

  // Stop global keyboard handlers when dialog is open
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // If user is typing in an input field, don't interfere
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Prevent spacebar from triggering other handlers when dialog is open
      if (event.key === ' ' || event.key === 'Space') {
        event.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true); // Use capture phase
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [isOpen]);

  const handleSave = () => {
    savePrintSettings(settings);
    onOpenChange(false);
  };

  const updateSetting = <K extends keyof PrintSettings>(
    key: K,
    value: PrintSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getPaperDimensions = () => {
    switch (settings.paperSize) {
      case '4x6':
        return { width: 4, height: 6 };
      case '5x7':
        return { width: 5, height: 7 };
      case '8x10':
        return { width: 8, height: 10 };
      case 'custom':
        return { width: settings.customWidth, height: settings.customHeight };
    }
  };

  const getMarginInches = () => {
    switch (settings.margins) {
      case 'none':
        return 0;
      case 'small':
        return 0.1;
      case 'medium':
        return 0.25;
      case 'large':
        return 0.5;
      case 'custom':
        return settings.customMargin;
    }
  };

  const paperDims = getPaperDimensions();
  const marginInches = getMarginInches();
  let printWidth = (paperDims.width - marginInches * 2) * settings.dpi;
  let printHeight = (paperDims.height - marginInches * 2) * settings.dpi;

  if (settings.orientation === 'portrait') {
    [printWidth, printHeight] = [printHeight, printWidth];
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Print Settings</DialogTitle>
          <DialogDescription>
            Configure print settings for your photo strips.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Paper Size */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paperSize" className="text-right">
              Paper Size
            </Label>
            <Select
              value={settings.paperSize}
              onValueChange={(val) => updateSetting('paperSize', val as PrintSettings['paperSize'])}
            >
              <SelectTrigger id="paperSize" className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4x6">4×6 inches</SelectItem>
                <SelectItem value="5x7">5×7 inches</SelectItem>
                <SelectItem value="8x10">8×10 inches</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Paper Size */}
          {settings.paperSize === 'custom' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customWidth" className="text-right">
                  Width (inches)
                </Label>
                <Input
                  id="customWidth"
                  type="number"
                  min="1"
                  step="0.1"
                  value={settings.customWidth}
                  onChange={(e) => updateSetting('customWidth', parseFloat(e.target.value) || 4)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customHeight" className="text-right">
                  Height (inches)
                </Label>
                <Input
                  id="customHeight"
                  type="number"
                  min="1"
                  step="0.1"
                  value={settings.customHeight}
                  onChange={(e) => updateSetting('customHeight', parseFloat(e.target.value) || 6)}
                  className="col-span-3"
                />
              </div>
            </>
          )}

          {/* Orientation */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="orientation" className="text-right">
              Orientation
            </Label>
            <Select
              value={settings.orientation}
              onValueChange={(val) => updateSetting('orientation', val as PrintSettings['orientation'])}
            >
              <SelectTrigger id="orientation" className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">Landscape</SelectItem>
                <SelectItem value="portrait">Portrait</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DPI */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dpi" className="text-right">
              Quality (DPI)
            </Label>
            <Select
              value={String(settings.dpi)}
              onValueChange={(val) => updateSetting('dpi', Number(val) as PrintSettings['dpi'])}
            >
              <SelectTrigger id="dpi" className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="150">150 DPI (Fast)</SelectItem>
                <SelectItem value="300">300 DPI (Standard)</SelectItem>
                <SelectItem value="600">600 DPI (High Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scale Mode */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scaleMode" className="text-right">
              Scale Mode
            </Label>
            <Select
              value={settings.scaleMode}
              onValueChange={(val) => updateSetting('scaleMode', val as PrintSettings['scaleMode'])}
            >
              <SelectTrigger id="scaleMode" className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fit">Fit to Page</SelectItem>
                <SelectItem value="actual">Actual Size</SelectItem>
                <SelectItem value="custom">Custom Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Scale */}
          {settings.scaleMode === 'custom' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customScale" className="text-right">
                Scale (%)
              </Label>
              <Input
                id="customScale"
                type="number"
                min="1"
                max="200"
                value={settings.customScale}
                onChange={(e) => updateSetting('customScale', parseFloat(e.target.value) || 100)}
                className="col-span-3"
              />
            </div>
          )}

          {/* Margins */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="margins" className="text-right">
              Margins
            </Label>
            <Select
              value={settings.margins}
              onValueChange={(val) => updateSetting('margins', val as PrintSettings['margins'])}
            >
              <SelectTrigger id="margins" className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="small">Small (0.1")</SelectItem>
                <SelectItem value="medium">Medium (0.25")</SelectItem>
                <SelectItem value="large">Large (0.5")</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Margin */}
          {settings.margins === 'custom' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customMargin" className="text-right">
                Margin (inches)
              </Label>
              <Input
                id="customMargin"
                type="number"
                min="0"
                step="0.01"
                value={settings.customMargin}
                onChange={(e) => updateSetting('customMargin', parseFloat(e.target.value) || 0.1)}
                className="col-span-3"
              />
            </div>
          )}

          {/* Printer Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="printerName" className="text-right">
              Printer Name
            </Label>
            <Input
              id="printerName"
              type="text"
              value={settings.printerName || 'Epson L3210'}
              onChange={(e) => updateSetting('printerName', e.target.value)}
              placeholder="Epson L3210"
              className="col-span-3"
            />
          </div>

          {/* Preview Info */}
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Print Preview</p>
            <p className="text-xs text-muted-foreground">
              Output: {Math.round(printWidth)} × {Math.round(printHeight)} pixels
              <br />
              Paper: {paperDims.width}" × {paperDims.height}" 
              {settings.orientation === 'portrait' && ' (rotated)'}
              <br />
              Quality: {settings.dpi} DPI
              <br />
              Printer: {settings.printerName || 'Epson L3210'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

