
"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SessionSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStartSession: (settings: { countdown: number; filter: string }) => void;
  photoCount: number;
  eventSize: string;
}

export default function SessionSettingsDialog({
  isOpen,
  onOpenChange,
  onStartSession,
  photoCount,
  eventSize,
}: SessionSettingsDialogProps) {
  const [countdown, setCountdown] = useState(5);
  const [filter, setFilter] = useState("none");

  const handleStartClick = () => {
    onStartSession({ countdown, filter });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Session Settings</DialogTitle>
          <DialogDescription>
            Configure your photo booth session before you start.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="countdown" className="text-right">
              Countdown
            </Label>
            <Select
              value={String(countdown)}
              onValueChange={(val) => setCountdown(Number(val))}
            >
              <SelectTrigger id="countdown" className="col-span-3">
                <SelectValue placeholder="Select countdown time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 seconds</SelectItem>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="filter" className="text-right">
              Filter
            </Label>
            <div className="col-span-3">
              <Select
                value={filter}
                onValueChange={setFilter}
                disabled
              >
                <SelectTrigger id="filter">
                  <SelectValue placeholder="Select a filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="b&w">Black & White</SelectItem>
                  <SelectItem value="sepia">Sepia</SelectItem>
                </SelectContent>
              </Select>
               <Badge variant="outline" className="mt-2">Coming Soon</Badge>
            </div>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Photos</Label>
              <p className="col-span-3 text-sm font-medium">{photoCount}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Size</Label>
              <p className="col-span-3 text-sm font-medium">{eventSize}</p>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleStartClick} disabled={photoCount === 0}>
            {photoCount === 0 ? "Add a Photo Box to Start" : "Let's Go!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

