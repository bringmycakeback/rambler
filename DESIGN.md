# Historical Places App - Design Document

A web application that visualizes the journey of historical figures through the places they lived, featuring animated travel paths on an interactive map.

## Architecture Overview

```
app/
├── api/
│   ├── models/route.ts    # Fetch available Gemini models
│   ├── places/route.ts    # Gemini AI endpoint with caching
│   └── stats/route.ts     # Usage statistics endpoint
├── stats/page.tsx         # Stats page
├── page.tsx               # Main orchestrator component
├── layout.tsx             # Root layout with fonts
└── globals.css            # Tailwind + custom animations

components/
├── PlacesMap.tsx          # Interactive map with animated paths
├── PlacesList.tsx         # Sidebar showing place details
├── SearchInput.tsx        # Search form
└── ModelSelector.tsx      # Gemini model dropdown

lib/
└── redis.ts               # Upstash Redis client and helpers

public/
└── old-map-bg.jpg         # Vintage map background image
```

## Technology Choices

| Technology | Choice | Rationale |
|------------|--------|-----------|
| Framework | Next.js 16 | Server-side API routes, React 19 support |
| Map | Leaflet + react-leaflet | Lightweight, customizable, good React integration |
| AI | Gemini (user-selectable model) | Fast responses, good at structured JSON output |
| Styling | Tailwind CSS 4 | Rapid prototyping, consistent design tokens |
| Fonts | Playfair Display + Inter | Historical serif feel with readable body text |
| Caching | Upstash Redis | Serverless-friendly, REST API, persistent storage |

## Key Design Decisions

### 1. Sequential Place Reveal

Rather than showing all places at once, the app reveals them one at a time with animated paths connecting them. This creates a narrative feel - you're following the historical figure's journey through their life.

**Implementation**: A `visibleCount` state controls how many places are shown. The first place appears after 500ms, the second after 800ms, then each subsequent place appears when the previous path animation completes.

### 2. Animated Travel Paths

Paths between places are drawn as curved lines that animate across the map, inspired by the travel montages in Indiana Jones films.

**How it works**:
- `generateCurvedPath()` creates a quadratic bezier curve between two points
- `AnimatedPathWithPan` uses `requestAnimationFrame` to progressively reveal the path
- Animation duration scales with distance (haversine formula): longer journeys take longer
- The map camera pans to follow the animated path in real-time

**Duration formula**:
```
duration = min(max(800 + distance_km * 1.5, 800), 4000) ms
```

### 3. Monochrome Map Style

The map uses CARTO's `light_nolabels` basemap - a minimal, monochrome style without place labels. This keeps focus on the animated paths and markers, and avoids visual clutter.

The app adds its own labels via Leaflet tooltips with smart positioning to avoid overlaps.

### 4. Client-Side Map Rendering

The PlacesMap component is dynamically imported with `ssr: false`:
```typescript
const PlacesMap = dynamic(() => import("@/components/PlacesMap"), {
  ssr: false,
});
```

Leaflet requires browser APIs (window, document) that don't exist during server-side rendering. Dynamic import with SSR disabled prevents hydration mismatches.

### 5. AI-Powered Place Data

Instead of a static database, the app uses Gemini AI to generate place data on demand. The prompt asks for:
- Places where the figure lived, in chronological order
- Years they lived there
- Brief description
- Latitude/longitude coordinates
- Death and burial information for the final place

**Tradeoffs**:
- Pro: Works for any historical figure without pre-populating data
- Pro: AI provides contextual descriptions
- Con: Subject to API rate limits
- Con: Occasional inaccuracies in coordinates or facts

### 6. User-Selectable AI Model

Users can choose which Gemini model to use via a dropdown in the top-right corner. The app fetches available models from the Gemini API at runtime, filtering to only those that support content generation.

### 7. Redis Caching

Results are cached in Upstash Redis to reduce API calls and improve response times:
- Cache key: `cache:{normalized_name}:{model}`
- TTL: 7 days
- Cache hits still increment request counts for stats

The app gracefully handles missing Redis configuration - caching is simply skipped if environment variables aren't set.

### 8. Usage Statistics

A `/stats` page shows all historical figures that have been searched:
- Request count per figure
- Model used for the most recent request
- Last requested timestamp

Stats are stored in Redis with a separate key pattern (`stats:{normalized_name}`) and a set (`stats:all_figures`) for listing.

### 9. Visual Design Language (Faherty-Inspired)

The design draws inspiration from the Faherty clothing brand's website aesthetic:

- **Color palette**:
  - Warm cream background (#fcfaf6)
  - Deep charcoal text (#1e2020)
  - Terracotta accents (#ba5b3f) for buttons and highlights
  - Warm gray for secondary text
- **Typography**:
  - Light-weight serif headers (Playfair Display) for elegance
  - Clean sans-serif body text (Inter)
  - Generous letter-spacing on labels
- **Spacing**: Generous padding and margins throughout
- **Buttons**: Flat, no border-radius, uppercase tracking
- **Background**: Vintage map image with fade-out gradient overlay

### 10. Vintage Map Background

Both the main page and stats page feature a vintage map image as a background that:
- Covers the top 70% of the viewport
- Has low opacity (12%) for subtlety
- Fades out smoothly toward the bottom using CSS mask gradients
- Is stored locally (`public/old-map-bg.jpg`) to avoid external dependencies

## Data Flow

```
User enters name → SearchInput
                        ↓
              page.tsx handleSearch()
                        ↓
              POST /api/places { name, model }
                        ↓
              Check Redis cache
                   ↓         ↓
              [Cache hit]  [Cache miss]
                   ↓              ↓
              Return cached   Gemini AI generates places JSON
                   ↓              ↓
              Update stats    Cache result + Update stats
                   ↓              ↓
              ←←←←←←←←←←←←←←←←←←←←
                        ↓
              page.tsx receives places array
                        ↓
              useEffect sets visibleCount = 1 (after 500ms)
                        ↓
              PlacesMap shows first marker
                        ↓
              visibleCount = 2 (after 800ms)
                        ↓
              AnimatedPathWithPan draws path to second place
                        ↓
              Animation completes → callback increments visibleCount
                        ↓
              Repeat until all places revealed
                        ↓
              Map fits bounds to show entire journey
```

## Component Responsibilities

### page.tsx
- Owns all state (places, visibleCount, loading, error, selectedModel)
- Coordinates timing between components
- Handles API calls
- Renders vintage map background

### PlacesMap.tsx
- Renders Leaflet map with markers and paths
- Manages path animations via internal components
- Notifies parent when animations complete

### PlacesList.tsx
- Displays place cards with staggered reveal
- Shows loading/error states
- Pure presentational component

### SearchInput.tsx
- Controlled form input
- Prevents submission while loading

### ModelSelector.tsx
- Fetches available models from `/api/models`
- Dropdown for model selection
- Passes selected model to parent

### stats/page.tsx
- Fetches and displays usage statistics
- Table with figure name, request count, model, last requested
- Same vintage map background as main page

## API Endpoints

### POST /api/places
Request body: `{ name: string, model?: string }`
Response: `{ places: Place[], cached?: boolean }`

### GET /api/models
Response: `{ models: { id: string, name: string }[] }`

### GET /api/stats
Response: `{ stats: FigureStats[] }`

## Animation Details

### Path Animation (AnimatedPathWithPan)
```typescript
// Generate 50-60 points along a curved path
const points = generateCurvedPath(from, to);

// Animate using requestAnimationFrame
useEffect(() => {
  const animate = (timestamp) => {
    const progress = elapsed / duration;
    const index = Math.floor(progress * (points.length - 1));
    setVisiblePoints(points.slice(0, index + 1));
    map.panTo(points[index]); // Camera follows
  };
  requestAnimationFrame(animate);
}, []);
```

### Marker Drop Animation
```css
@keyframes marker-drop {
  0% { transform: translateY(-30px); opacity: 0; }
  60% { transform: translateY(5px); }
  100% { transform: translateY(0); opacity: 1; }
}
```

### Place Card Fade-In
```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token |

The app works without Redis configured - caching and stats are simply disabled.

## Known Limitations

1. **Rate limits**: Gemini free tier has low request limits
2. **Coordinate accuracy**: AI-generated coordinates may be approximate
3. **No offline support**: Requires internet for both map tiles and AI
4. **Single user**: No concept of user sessions or saved searches
5. **No authentication**: Anyone can use your API quota

## Future Improvements

- Add user authentication to protect API usage
- Implement request debouncing
- Add error retry with exponential backoff
- Save favorite historical figures
- Share journey URLs
- Add timeline visualization alongside map
