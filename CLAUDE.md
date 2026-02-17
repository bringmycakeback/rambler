# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server (Next.js 16 with Turbopack)
- `npm run build` — Production build
- `npm run lint` — ESLint (uses next/core-web-vitals and next/typescript)
- No test framework is configured

## Architecture

Rambler is a Next.js 16 app that visualizes the geographical journey of historical figures on an interactive map using AI-generated data.

**Flow:** User enters a name → POST `/api/places` checks Redis cache → on miss, queries Gemini API → returns chronological places → client animates paths on a Leaflet map, revealing places sequentially.

### Key Files

- `app/page.tsx` — Main orchestrator. Manages state for places, animation sequencing (visibleCount), model selection, status, tagline, and portraitUrl. Coordinates the staggered reveal of places as map path animations complete.
- `app/api/places/route.ts` — Core API route. Calls Gemini with a structured prompt (places + tagline), fetches Wikipedia portrait concurrently, caches in Redis (7-day TTL). Returns `{ places, tagline, portraitUrl, cached?, model }`. Retries with fallback models on transient errors.
- `app/api/models/route.ts` — Fetches available Gemini models from Google's API, filtered to Gemini models supporting `generateContent`.
- `app/api/stats/route.ts` — Returns per-figure request counts and metadata from Redis.
- `app/api/suggest/route.ts` — Autocomplete endpoint returning historical figure names from a ~130K Wikidata dataset.
- `app/api/auth/login/route.ts` — Password auth; creates Redis session + sets cookie.
- `app/api/auth/logout/route.ts` — Destroys session and clears cookie.
- `middleware.ts` — Gates all routes (except `/login`, `/api/auth`) behind password auth via Redis sessions. Skipped if `AUTH_PASSWORD` is not set.
- `lib/redis.ts` — Upstash Redis helpers. Cache keys: `cache:{name}:{model}` (includes tagline + portraitUrl), stats keys: `stats:{name}`, session keys: `session:{uuid}`. Name normalization (lowercase, trimmed). Gracefully degrades if Redis is not configured.
- `components/PlacesMap.tsx` — Most complex component. Leaflet map with animated bezier curve paths between places, marker drop animations, auto-panning camera, and smart label positioning. Dynamically imported with `ssr: false` (Leaflet needs browser APIs).
- `components/PlacesList.tsx` — Sidebar with sticky header (figure name, tagline, Wikipedia portrait) and place cards with staggered fade-in animations. Auto-scrolls to latest revealed place.
- `components/SearchInput.tsx` — Search form with autocomplete suggestions from `/api/suggest`.
- `components/ModelSelector.tsx` — Dropdown fetching available models from `/api/models`.

### Animation Sequencing

The reveal is driven by `visibleCount` in `page.tsx`. First place shows after 500ms, second after 800ms more, then each subsequent place appears when the prior path animation completes (via `onPathAnimationComplete` callback from PlacesMap). Path animation duration scales with geographic distance using the haversine formula.

## Environment Variables

- `GEMINI_API_KEY` (required) — Google Generative AI API key
- `UPSTASH_REDIS_REST_URL` (optional) — Enables caching, stats, and auth sessions
- `UPSTASH_REDIS_REST_TOKEN` (optional) — Redis auth token
- `AUTH_PASSWORD` (optional) — If set, gates access behind a password login

## Styling

- Tailwind CSS v4 with custom theme defined in `app/globals.css` via `@theme` directive
- Design palette: cream backgrounds, charcoal text, terracotta accents, warm gray secondary text
- Fonts: Playfair Display (serif headings), Inter (body) — loaded in `app/layout.tsx`
- Custom animations in globals.css: `fade-in-up`, `dash-animation`, `marker-drop`
- Map uses CARTO `light_nolabels` basemap for a monochrome vintage look

## Path Alias

`@/*` maps to the project root (configured in tsconfig.json).
