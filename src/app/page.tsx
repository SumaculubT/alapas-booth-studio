
"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  return (
    <main className="flex h-screen flex-col items-center justify-start bg-background text-foreground p-4 sm:p-8 pt-16">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Welcome to Alpas Studio
          </h1>
          <p className="text-muted-foreground mt-2">
            Create your photo booth template
          </p>
        </header>

        <div className="flex justify-center">
          <Link href="/studio/landscape" className="w-full max-w-md">
            <Card className="h-full flex flex-col group hover:ring-2 hover:ring-primary transition-all">
              <CardHeader>
                <CardTitle>Landscape Postcard</CardTitle>
                <CardDescription>
                  A modern 4x6 layout. More space for creativity.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted mb-4">
                  <Image
                    src="https://picsum.photos/seed/photobooth4x6/600/400"
                    alt="4x6 photo strip preview"
                    fill
                    className="object-cover"
                    data-ai-hint="photobooth landscape"
                  />
                </div>
                <Button className="w-full mt-auto">
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by <a href="https://alpastechph.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Alpas IT Solutions Inc.</a></p>
        </footer>
      </div>
    </main>
  );
}
