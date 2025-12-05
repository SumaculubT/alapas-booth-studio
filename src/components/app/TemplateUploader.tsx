"use client";

import { ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useToast } from "@/hooks/use-toast";

interface TemplateUploaderProps {
  onTemplateSelect: (url: string) => void;
  eventSize: "2x6" | "4x6" | string;
}

const defaultTemplates2x6 = PlaceHolderImages.filter(img => img.imageHint.includes("template") && !img.imageHint.includes("landscape"));
const defaultTemplates4x6 = PlaceHolderImages.filter(img => img.imageHint.includes("template") && img.imageHint.includes("landscape"));


export default function TemplateUploader({ onTemplateSelect, eventSize }: TemplateUploaderProps) {
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "image/png") {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onTemplateSelect(result);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid PNG file.",
      });
    }
  };

  const defaultTemplates = eventSize === "4x6" ? defaultTemplates4x6 : defaultTemplates2x6;
  const aspectRatio = eventSize === "4x6" ? "aspect-video" : "aspect-[2/3]";
  const uploadHint = eventSize === "4x6" ? "PNG file (e.g. 1200x800px)" : "PNG file (e.g. 800x1200px)";

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">1. Choose Your Template</h2>
        <p className="text-muted-foreground">Upload your own or select one of ours for your {eventSize} strip.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Custom Template</CardTitle>
          <CardDescription>Upload a PNG file as an overlay.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label
            htmlFor="template-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">{uploadHint}</p>
            </div>
            <Input id="template-upload" type="file" className="hidden" accept="image/png" onChange={handleFileChange} />
          </Label>
        </CardContent>
      </Card>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or select a default</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {defaultTemplates.map((template) => (
          <div
            key={template.id}
            className="cursor-pointer group"
            onClick={() => onTemplateSelect(template.imageUrl)}
          >
            <Card className="overflow-hidden transition-all group-hover:ring-2 group-hover:ring-primary">
              <CardContent className="p-0">
                <Image
                  src={template.imageUrl}
                  alt={template.description}
                  width={eventSize === "4x6" ? 600 : 400}
                  height={eventSize === "4x6" ? 400 : 600}
                  className={`object-cover w-full h-auto ${aspectRatio}`}
                  data-ai-hint={template.imageHint}
                />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
