import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { pickPin } from './mapIcons';
import { useToast } from './ToastProvider';

export interface Coords {
  lat: number;
  lng: number;
}

interface Props {
  value: Coords | null;
  onChange: (coords: Coords) => void;
}

// Captura el click en el mapa y reporta las coordenadas al padre.
function ClickHandler({ onChange }: { onChange: (c: Coords) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Vuela a un punto cuando cambia el target (usado por "Mi ubicación").
function FlyTo({ target }: { target: (Coords & { key: number }) | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 15);
  }, [target, map]);
  return null;
}

// Centro por defecto: Bogotá, Colombia. Zoom amplio hasta que el usuario elija.
const DEFAULT_CENTER: [number, number] = [4.60971, -74.08175];

export default function MapPicker({ value, onChange }: Props) {
  const toast = useToast();
  const [flyTarget, setFlyTarget] = useState<(Coords & { key: number }) | null>(null);
  const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;

  const locateMe = () => {
    if (!navigator.geolocation) {
      toast('Tu navegador no soporta geolocalización.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(c);
        setFlyTarget({ ...c, key: Date.now() });
      },
      () => toast('No se pudo obtener tu ubicación. Revisa los permisos.', 'error')
    );
  };

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={value ? 13 : 5}
        style={{ height: 300, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; colaboradores de OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <FlyTo target={flyTarget} />
        {value && <Marker position={[value.lat, value.lng]} icon={pickPin} />}
      </MapContainer>

      {/* Botón flotante: usar mi ubicación actual. type=button para no enviar el form. */}
      <button
        type="button"
        onClick={locateMe}
        className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md ring-1 ring-black/10 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-700"
      >
        <LocateFixed size={14} />
        Mi ubicación
      </button>
    </div>
  );
}
