# ADR-002: Leaflet Mapping Integration & SSR Hydration Boundary

## Status
Accepted

## Context
Leaflet directly accesses DOM globals (`window`, `document`, `navigator`) during module evaluation. Importing Leaflet in Next.js Server Components or during SSR pre-rendering causes fatal `window is not defined` exceptions and hydration mismatches. Additionally, Leaflet 2.0-alpha transitions to ESM-only and drops the global `L` namespace, breaking `react-leaflet` and cluster plugins.

## Decision
1. Pin Leaflet to stable `1.9.4` with `react-leaflet` and `react-leaflet-cluster`.
2. Encapsulate all Leaflet imports inside a browser-only component (`CivicMapCanvas.tsx`).
3. Export an SSR-safe dynamic wrapper (`DynamicCivicMap.tsx`) using `next/dynamic` with `{ ssr: false }`.
4. Replace default Leaflet PNG marker assets with dynamic SVG `divIcon` elements to avoid Webpack/Next.js asset bundler path resolution bugs.

## Consequences
- **Positive**: Zero SSR hydration errors, crisp high-DPI custom category/status markers, reliable marker clustering.
- **Negative**: Initial map canvas requires client-side JavaScript execution, displayed with an accessible skeleton loading state.
