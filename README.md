# Alpas Studio

Event photo booth studio: design 4x6 postcard layouts, capture photos in-browser, then print, download, or share the finished composite.

Built by [Alpas IT Solutions Inc.](https://alpastechph.com/).

## Features

- Layer editor for PNG overlays and camera frames (drag, resize, rotate, lock)
- Default landscape template plus custom PNG/JPEG upload
- Guest session with countdown capture (3 / 5 / 10 seconds)
- High-resolution composite (up to 600 DPI)
- ZIP download of the final postcard and individual photos
- Web Share support
- Local printing with paper size, orientation, DPI, margins, and scale

## Flow

`/` → `/studio` → `/session/welcome` → `/session/capture` → `/session/preview`

## Stack

Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI.

## Print setup

See [docs/PRINT_SETUP.md](docs/PRINT_SETUP.md) for Epson L3210 and PrintNode configuration.
