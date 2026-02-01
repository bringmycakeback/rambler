"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Place {
  name: string;
  years: string;
  description: string;
  lat: number;
  lng: number;
}

interface PlacesMapProps {
  places: Place[];
  visibleCount: number;
  onPathAnimationComplete: () => void;
}

// Fix for default marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

// Calculate distance between two points in km (haversine formula)
function calculateDistance(from: [number, number], to: [number, number]): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((to[0] - from[0]) * Math.PI) / 180;
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from[0] * Math.PI) / 180) *
      Math.cos((to[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate animation duration based on distance (longer distances = longer animation)
function calculateDuration(from: [number, number], to: [number, number]): number {
  const distance = calculateDistance(from, to);
  // Base: 800ms minimum, plus 1.5ms per km, max 4000ms
  const duration = Math.min(Math.max(800 + distance * 1.5, 800), 4000);
  return duration;
}

// Generate curved path points between two locations
function generateCurvedPath(
  from: [number, number],
  to: [number, number],
  numPoints: number = 50
): [number, number][] {
  const points: [number, number][] = [];

  const [lat1, lng1] = from;
  const [lat2, lng2] = to;

  // Calculate distance to determine curve intensity
  const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));

  // Create a curved path using a quadratic bezier-like approach
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  // Perpendicular offset for the curve (scales with distance)
  const curveIntensity = Math.min(distance * 0.2, 10);
  const angle = Math.atan2(lat2 - lat1, lng2 - lng1);
  const perpAngle = angle + Math.PI / 2;

  // Offset the control point perpendicular to the line
  const controlLat = midLat + Math.sin(perpAngle) * curveIntensity;
  const controlLng = midLng + Math.cos(perpAngle) * curveIntensity;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Quadratic bezier formula
    const lat = Math.pow(1 - t, 2) * lat1 + 2 * (1 - t) * t * controlLat + Math.pow(t, 2) * lat2;
    const lng = Math.pow(1 - t, 2) * lng1 + 2 * (1 - t) * t * controlLng + Math.pow(t, 2) * lng2;

    points.push([lat, lng]);
  }

  return points;
}

interface AnimatedPathProps {
  from: [number, number];
  to: [number, number];
  onComplete: () => void;
  isActive: boolean;
}

function AnimatedPathWithPan({ from, to, onComplete, isActive }: AnimatedPathProps) {
  const map = useMap();
  const [visiblePoints, setVisiblePoints] = useState<[number, number][]>([]);
  const curvedPath = useRef<[number, number][]>([]);
  const animationRef = useRef<number | null>(null);
  const hasCompleted = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setVisiblePoints([]);
      hasCompleted.current = false;
      return;
    }

    // Reset completion flag
    hasCompleted.current = false;

    // Calculate duration based on distance
    const duration = calculateDuration(from, to);

    // Generate the curved path
    curvedPath.current = generateCurvedPath(from, to, 60);
    const totalPoints = curvedPath.current.length;
    const startTime = Date.now();

    // Start with first point visible
    setVisiblePoints([curvedPath.current[0]]);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Calculate how many points should be visible
      const pointIndex = Math.floor(progress * (totalPoints - 1));
      const newVisiblePoints = curvedPath.current.slice(0, pointIndex + 1);

      setVisiblePoints(newVisiblePoints);

      // Pan map to follow the current point
      if (newVisiblePoints.length > 0) {
        const currentPoint = newVisiblePoints[newVisiblePoints.length - 1];
        map.panTo(currentPoint, { animate: true, duration: 0.1 });
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (!hasCompleted.current) {
        hasCompleted.current = true;
        // Ensure we show all points
        setVisiblePoints(curvedPath.current);
        onComplete();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, from, to, onComplete, map]);

  if (visiblePoints.length < 2) return null;

  return (
    <Polyline
      positions={visiblePoints}
      pathOptions={{
        color: "#b45309",
        weight: 4,
        opacity: 0.9,
      }}
    />
  );
}

interface CompletedPathProps {
  from: [number, number];
  to: [number, number];
}

function CompletedPath({ from, to }: CompletedPathProps) {
  const curvedPath = generateCurvedPath(from, to, 30);

  return (
    <Polyline
      positions={curvedPath}
      pathOptions={{
        color: "#b45309",
        weight: 3,
        opacity: 0.6,
        dashArray: "8, 8",
      }}
    />
  );
}

function MapController({
  places,
  visibleCount,
  allAnimationsComplete
}: {
  places: Place[];
  visibleCount: number;
  allAnimationsComplete: boolean;
}) {
  const map = useMap();
  const hasZoomedOut = useRef(false);

  useEffect(() => {
    if (places.length > 0 && visibleCount === 1) {
      // When first place appears, center on it
      map.setView([places[0].lat, places[0].lng], 5, { animate: true });
      hasZoomedOut.current = false;
    }
  }, [map, places, visibleCount]);

  // Zoom out to show all places when animations complete
  useEffect(() => {
    if (allAnimationsComplete && places.length > 1 && !hasZoomedOut.current) {
      hasZoomedOut.current = true;

      // Small delay before zooming out for effect
      setTimeout(() => {
        const bounds = L.latLngBounds(
          places.map((place) => [place.lat, place.lng])
        );
        map.fitBounds(bounds, {
          padding: [40, 40],
          animate: true,
          duration: 1
        });
      }, 500);
    }
  }, [allAnimationsComplete, places, map]);

  // Reset when places change
  useEffect(() => {
    hasZoomedOut.current = false;
  }, [places]);

  return null;
}

function AnimatedMarker({ place, isVisible }: { place: Place; isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <Marker position={[place.lat, place.lng]}>
      <Popup>
        <div className="text-sm">
          <strong>{place.name}</strong>
          <br />
          <span className="text-stone-500">{place.years}</span>
        </div>
      </Popup>
    </Marker>
  );
}

export default function PlacesMap({ places, visibleCount, onPathAnimationComplete }: PlacesMapProps) {
  const [completedPaths, setCompletedPaths] = useState<number[]>([]);
  const [animatingPath, setAnimatingPath] = useState<number | null>(null);
  const prevVisibleCount = useRef(0);

  const validPlaces = places.filter(
    (place) => typeof place.lat === "number" && typeof place.lng === "number"
  );

  const totalPaths = validPlaces.length - 1;
  const allAnimationsComplete = completedPaths.length === totalPaths && totalPaths > 0;

  // Handle new places becoming visible - start path animation
  useEffect(() => {
    if (visibleCount > prevVisibleCount.current && visibleCount >= 2) {
      // A new place just became visible, start animating the path to it
      const pathIndex = visibleCount - 2;
      if (!completedPaths.includes(pathIndex) && animatingPath !== pathIndex) {
        setAnimatingPath(pathIndex);
      }
    }
    prevVisibleCount.current = visibleCount;
  }, [visibleCount, completedPaths, animatingPath]);

  // Reset when places change
  useEffect(() => {
    setCompletedPaths([]);
    setAnimatingPath(null);
    prevVisibleCount.current = 0;
  }, [places]);

  const handlePathComplete = useCallback((pathIndex: number) => {
    setCompletedPaths(prev => [...prev, pathIndex]);
    setAnimatingPath(null);

    // Notify parent that animation is complete so it can show the next place
    // Add a small delay for the marker to appear before starting next animation
    setTimeout(() => {
      onPathAnimationComplete();
    }, 300);
  }, [onPathAnimationComplete]);

  if (validPlaces.length === 0) {
    return (
      <div className="w-full h-full bg-stone-100 flex items-center justify-center rounded-lg">
        <p className="text-stone-400 italic">Map will appear here</p>
      </div>
    );
  }

  const center: [number, number] = [validPlaces[0].lat, validPlaces[0].lng];

  return (
    <MapContainer
      center={center}
      zoom={4}
      className="w-full h-full rounded-lg"
      style={{ minHeight: "400px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController
        places={validPlaces}
        visibleCount={visibleCount}
        allAnimationsComplete={allAnimationsComplete}
      />

      {/* Draw completed paths */}
      {completedPaths.map((pathIndex) => (
        <CompletedPath
          key={`completed-${pathIndex}`}
          from={[validPlaces[pathIndex].lat, validPlaces[pathIndex].lng]}
          to={[validPlaces[pathIndex + 1].lat, validPlaces[pathIndex + 1].lng]}
        />
      ))}

      {/* Animate current path */}
      {animatingPath !== null && validPlaces[animatingPath + 1] && (
        <AnimatedPathWithPan
          from={[validPlaces[animatingPath].lat, validPlaces[animatingPath].lng]}
          to={[validPlaces[animatingPath + 1].lat, validPlaces[animatingPath + 1].lng]}
          onComplete={() => handlePathComplete(animatingPath)}
          isActive={true}
        />
      )}

      {/* Show markers for visible places */}
      {validPlaces.map((place, index) => (
        <AnimatedMarker
          key={index}
          place={place}
          isVisible={index < visibleCount}
        />
      ))}
    </MapContainer>
  );
}
