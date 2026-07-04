import { AxiosError } from 'axios';

// "hace 5 min", "hace 2 h", "ayer"…
export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];
  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return rtf.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return 'ahora mismo';
}

export function formatDate(iso?: string): string {
  return iso
    ? new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
}

// Extrae el primer mensaje de error que devuelva DRF (o un fallback).
export function apiError(err: unknown, fallback: string): string {
  const data = (err as AxiosError).response?.data;
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (typeof first === 'string') return first;
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }
  return fallback;
}
