"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

function FitBounds({ places }: { places: Place[] }) {
  const map = useMap();

  useEffect(() => {
    if (places.length > 0) {
      const bounds = L.latLngBounds(
        places.map((place) => [place.lat, place.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [places, map]);

  return null;
}

export default function PlacesMap({ places }: PlacesMapProps) {
  const validPlaces = places.filter(
    (place) => typeof place.lat === "number" && typeof place.lng === "number"
  );

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
      {validPlaces.map((place, index) => (
        <Marker key={index} position={[place.lat, place.lng]}>
          <Popup>
            <div className="text-sm">
              <strong>{place.name}</strong>
              <br />
              <span className="text-stone-500">{place.years}</span>
            </div>
          </Popup>
        </Marker>
      ))}
      <FitBounds places={validPlaces} />
    </MapContainer>
  );
}
