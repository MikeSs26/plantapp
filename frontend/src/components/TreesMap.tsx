import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Heart, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { treePin } from './mapIcons';
import type { Tree } from '../types';

// El backend serializa lat/long como string (DecimalField), por eso Number().
function toNum(v: number | string | undefined): number {
  return typeof v === 'number' ? v : parseFloat(v ?? '0');
}

// Encuadra el mapa para que se vean todos los árboles.
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), map]);
  return null;
}

export default function TreesMap({ trees }: { trees: Tree[] }) {
  const located = trees.filter((t) => toNum(t.latitude) !== 0 || toNum(t.longitude) !== 0);
  const points: [number, number][] = located.map((t) => [toNum(t.latitude), toNum(t.longitude)]);

  return (
    <MapContainer
      center={[4.60971, -74.08175]}
      zoom={4}
      style={{ height: 380, width: '100%' }}
    >
      <TileLayer
        attribution='&copy; colaboradores de OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {located.map((tree) => (
        <Marker
          key={tree.id}
          position={[toNum(tree.latitude), toNum(tree.longitude)]}
          icon={treePin}
        >
          <Popup maxWidth={220}>
            <div className="w-44">
              {tree.photo_url && (
                <img
                  src={tree.photo_url}
                  alt={tree.species || 'Árbol'}
                  className="mb-2 h-24 w-full rounded-lg object-cover"
                />
              )}
              <p className="font-semibold">{tree.species || 'Árbol'}</p>
              {tree.planted_by && (
                <p className="text-xs opacity-70">por {tree.planted_by}</p>
              )}
              <p className="mt-1 flex items-center gap-2 text-xs opacity-70">
                <span className="inline-flex items-center gap-0.5">
                  <Heart size={11} /> {tree.likes_count ?? 0}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <MapPin size={11} /> {toNum(tree.latitude).toFixed(3)},{' '}
                  {toNum(tree.longitude).toFixed(3)}
                </span>
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
