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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Welcome to SnapStrip Studio
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose your event setup to get started
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <Link href="/studio?size=2x6">
            <Card className="h-full flex flex-col group hover:ring-2 hover:ring-primary transition-all">
              <CardHeader>
                <CardTitle>Classic Booth</CardTitle>
                <CardDescription>
                  The timeless 2x6 photo strip. Perfect for any occasion.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden bg-muted mb-4">
                  <Image
                    src="https://picsum.photos/seed/photobooth2x6/400/600"
                    alt="2x6 photo strip preview"
                    fill
                    className="object-cover"
                    data-ai-hint="photobooth classic"
                  />
                </div>
                <Button className="w-full mt-auto">
                  Select 2x6 Strips
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/studio?size=4x6">
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
                  Select 4x6 Postcard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by Next.js and Firebase</p>
        </footer>
      </div>
    </main>
  );
}
