"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, LayersControl } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LeafletMapProps {
  onCreated: (layer: any) => void;
  onDeleted: () => void;
}

export default function LeafletMap({ onCreated, onDeleted }: LeafletMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-md" />;

  return (
    <MapContainer
      center={[20.5937, 78.9629]} // Center of India
      zoom={5}
      scrollWheelZoom={true}
      className="h-[700px] w-full rounded-md border"
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OSM Humanitarian">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">HOT</a>'
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite (Esri)">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={(e) => {
             const layer = e.layer;
             onCreated(layer.toGeoJSON());
          }}
          onDeleted={onDeleted}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            polygon: {
              allowIntersection: false,
              drawError: {
                color: "#ef4444", // Red-500
                message: "<strong>Error:</strong> Self-intersection not allowed!",
              },
              shapeOptions: {
                color: "#007a3d", // Primary Emerald
                fillColor: "#00a651", // Primary Light
                fillOpacity: 0.2,
                weight: 2,
              },
            },
          }}
        />
      </FeatureGroup>
    </MapContainer>
  );
}
