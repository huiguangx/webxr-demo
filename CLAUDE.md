# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WebXR demo project built with React, TypeScript, Three.js, and three-mesh-ui. It demonstrates VR/AR capabilities with 3D UI panels that can be viewed in both desktop browsers and VR headsets.

## Core Architecture

### ThreeSceneManager
The main engine (`src/components/ThreeSceneManager.ts`) manages:
- Three.js scene, camera, and WebGL renderer with WebXR support
- OrbitControls for desktop navigation
- Panel system using three-mesh-ui for 3D UI components
- VR session lifecycle (sessionstart/sessionend events)

### Panel System
- Panels are stored in a Map with unique keys for management
- Each panel supports mixed content (text + images) with left/right column layout
- Panels automatically follow camera position and orientation
- Content types: `PanelContentText` and `PanelContentImage` with configurable styling

### Asset Pipeline
- MSDF fonts: Uses `Roboto-msdf.json` and `Roboto-msdf.png` for sharp text rendering in 3D
- Path aliases: `@/` maps to `src/`, `#/` maps to `src/assets/`
- Special asset handling: `.json`, `.msdf.json`, `.png`, `.jpg`, `.glb`, `.gltf` files

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview
```

## Key Development Patterns

### Adding New Panels
Use `makeTextPanel()` method with:
- Size object (width/height in 3D units)
- Position (THREE.Vector3)
- Content array (mix of text and image objects)
- Optional padding and configuration

### WebXR Integration
- VR button is automatically created and added to container
- XR session events are logged to console
- Renderer has `xr.enabled = true` for WebXR support

### Type Definitions
- Custom ambient declarations in `src/three-ambient.d.ts` for Three.js examples
- JSON import support configured in both Vite and TypeScript

## Build Configuration

- Vite with React plugin and path aliases
- TypeScript with ESM interop and JSON module resolution
- Special asset inclusion for 3D/font files