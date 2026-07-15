import { AxiosError } from 'axios';
import api, { BASE_URL } from '../api/api';

// Client-side QA suite: each test performs a REAL HTTP request against the
// live API, so every check is visible in the browser's Network tab. The
// functional tests exploit server-side validation rejections (HTTP 400/401)
// that happen BEFORE anything is written, so running them creates no data.

export interface QaResult {
  name: string;
  category: 'functional' | 'non_functional';
  subtype: string;
  request: string; // the HTTP call the professor will see in the Network tab
  expected: string;
  actual: string;
  passed: boolean;
  duration_ms: number;
}

export interface QaContext {
  email: string; // the logged-in admin's email, for the duplicate-email test
}

const since = (start: number) => Math.round(performance.now() - start);
const statusOf = (err: unknown) => (err as AxiosError).response?.status;
const dataOf = (err: unknown) => (err as AxiosError).response?.data as Record<string, unknown> | undefined;

// --- Functional: real requests that must be rejected ---

async function photoRequired(): Promise<QaResult> {
  const start = performance.now();
  const base = {
    name: 'Foto obligatoria al registrar un árbol',
    category: 'functional' as const,
    subtype: 'Validación de entrada',
    request: 'POST /api/trees/  (sin foto)',
    expected: 'HTTP 400 · rechazado',
  };
  try {
    await api.post('trees/', {
      species: 'QA',
      photo_url: '',
      latitude: 4.6,
      longitude: -74.08,
      reporter_latitude: 4.6,
      reporter_longitude: -74.08,
    });
    return { ...base, actual: 'Fue aceptado (falla)', passed: false, duration_ms: since(start) };
  } catch (err) {
    const passed = statusOf(err) === 400 && Boolean(dataOf(err)?.photo_url);
    return { ...base, actual: `HTTP ${statusOf(err)} · rechazado`, passed, duration_ms: since(start) };
  }
}

async function duplicateEmail(ctx: QaContext): Promise<QaResult> {
  const start = performance.now();
  const base = {
    name: 'Registro rechaza correo duplicado',
    category: 'functional' as const,
    subtype: 'Validación de entrada',
    request: 'POST /api/auth/register/  (correo ya usado)',
    expected: 'HTTP 400 · rechazado',
  };
  try {
    await api.post('auth/register/', {
      email: ctx.email,
      password: 'Zx9!kLmn2026',
      username: `qa_probe_${Date.now()}`,
      display_name: 'QA Probe',
    });
    return { ...base, actual: 'Fue aceptado (falla)', passed: false, duration_ms: since(start) };
  } catch (err) {
    const passed = statusOf(err) === 400 && Boolean(dataOf(err)?.email);
    return { ...base, actual: `HTTP ${statusOf(err)} · rechazado`, passed, duration_ms: since(start) };
  }
}

async function outOfRadius(): Promise<QaResult> {
  const start = performance.now();
  const base = {
    name: 'Rechazo de árbol fuera del radio permitido',
    category: 'functional' as const,
    subtype: 'Regla de negocio',
    request: 'POST /api/trees/  (árbol en Tokio, tú en Bogotá)',
    expected: 'HTTP 400 · rechazado',
  };
  try {
    await api.post('trees/', {
      species: 'QA',
      photo_url: 'https://example.com/x.jpg',
      latitude: 35.68, // Tokio
      longitude: 139.65,
      reporter_latitude: 4.6, // Bogotá
      reporter_longitude: -74.08,
    });
    return { ...base, actual: 'Fue aceptado (falla)', passed: false, duration_ms: since(start) };
  } catch (err) {
    const passed = statusOf(err) === 400;
    return { ...base, actual: `HTTP ${statusOf(err)} · rechazado`, passed, duration_ms: since(start) };
  }
}

// --- Non-functional ---

async function authRequired(): Promise<QaResult> {
  const start = performance.now();
  const base = {
    name: 'Endpoints protegidos exigen autenticación',
    category: 'non_functional' as const,
    subtype: 'Seguridad',
    request: 'GET /api/auth/me/  (sin token)',
    expected: 'HTTP 401 · no autorizado',
  };
  try {
    // Raw fetch on purpose: no Authorization header attached.
    const response = await fetch(`${BASE_URL}auth/me/`);
    return {
      ...base,
      actual: `HTTP ${response.status}`,
      passed: response.status === 401,
      duration_ms: since(start),
    };
  } catch {
    return { ...base, actual: 'error de red', passed: false, duration_ms: since(start) };
  }
}

async function paginationEnabled(): Promise<QaResult> {
  const start = performance.now();
  const base = {
    name: 'El feed pagina (no devuelve todo de golpe)',
    category: 'non_functional' as const,
    subtype: 'Escalabilidad',
    request: 'GET /api/trees/?page=1',
    expected: 'HTTP 200 con { count, results }',
  };
  try {
    const { data } = await api.get('trees/', { params: { page: 1 } });
    const passed = typeof data.count === 'number' && Array.isArray(data.results);
    return {
      ...base,
      actual: passed ? `count=${data.count}, results[] presente` : 'sin paginación',
      passed,
      duration_ms: since(start),
    };
  } catch (err) {
    return { ...base, actual: `HTTP ${statusOf(err)}`, passed: false, duration_ms: since(start) };
  }
}

async function responseTime(): Promise<QaResult> {
  const start = performance.now();
  const base = {
    name: 'Tiempo de respuesta de la API',
    category: 'non_functional' as const,
    subtype: 'Rendimiento',
    request: 'GET /api/stats/',
    expected: 'Menos de 2000 ms',
  };
  try {
    await api.get('stats/');
    const elapsed = since(start);
    return { ...base, actual: `${elapsed} ms`, passed: elapsed < 2000, duration_ms: elapsed };
  } catch (err) {
    return { ...base, actual: `HTTP ${statusOf(err)}`, passed: false, duration_ms: since(start) };
  }
}

/** Runs the whole suite sequentially so each request is easy to follow in the
 *  Network tab, logging every result to the console for extra evidence. */
export async function runQaTests(ctx: QaContext): Promise<QaResult[]> {
  const steps: Array<() => Promise<QaResult>> = [
    photoRequired,
    () => duplicateEmail(ctx),
    outOfRadius,
    authRequired,
    paginationEnabled,
    responseTime,
  ];

  console.groupCollapsed('%c[QA] Ejecutando pruebas funcionales y no funcionales', 'color:#059669;font-weight:bold');
  const results: QaResult[] = [];
  for (const step of steps) {
    const result = await step();
    results.push(result);
    console.log(
      `%c${result.passed ? 'PASÓ ' : 'FALLÓ'}%c  ${result.name}  →  ${result.request}  →  ${result.actual}`,
      `color:${result.passed ? '#059669' : '#dc2626'};font-weight:bold`,
      'color:inherit'
    );
  }
  console.groupEnd();
  return results;
}
