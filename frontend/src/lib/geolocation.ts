export interface GeoCoords {
  lat: number;
  lng: number;
}

// Specific messages per GeolocationPositionError.code, instead of one
// generic "couldn't get your location" that hides what actually went wrong.
function messageForCode(code: number): string {
  const messages: Record<number, string> = {
    1: 'Permiso de ubicación denegado. Actívalo para este sitio en los ajustes del navegador.',
    2: 'No se pudo obtener tu ubicación. ¿Está el GPS encendido?',
    3: 'La ubicación tardó demasiado. Intenta de nuevo.',
  };
  return messages[code] ?? 'No se pudo obtener tu ubicación.';
}

// Wraps the browser Geolocation API in a promise. Always requests a fresh
// reading (maximumAge: 0) — a stale cached position could otherwise be
// reused to fake presence somewhere the user no longer is.
export function getCurrentPosition(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu navegador no soporta geolocalización.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(messageForCode(err.code))),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
