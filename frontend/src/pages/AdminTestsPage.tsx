import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  Gauge,
  Loader2,
  Play,
  Terminal,
  XCircle,
} from 'lucide-react';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../auth/AuthContext';
import { runQaTests, type QaResult } from '../lib/qaTests';

function ResultRow({ r }: { r: QaResult }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">{r.name}</p>
          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            {r.subtype}
          </span>
        </div>
        {r.passed ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle2 size={13} /> PASÓ
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <XCircle size={13} /> FALLÓ
          </span>
        )}
      </div>
      {/* The real HTTP request the professor can see in the Network tab */}
      <p className="mt-2 rounded-md bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300">
        {r.request}
      </p>
      <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
          <dt className="font-medium text-slate-400">Esperado</dt>
          <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{r.expected}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
          <dt className="font-medium text-slate-400">Obtenido</dt>
          <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{r.actual}</dd>
        </div>
      </dl>
      <p className="mt-2 text-right text-[11px] text-slate-400">{r.duration_ms} ms</p>
    </div>
  );
}

function Section({
  title,
  icon,
  results,
}: {
  title: string;
  icon: React.ReactNode;
  results: QaResult[];
}) {
  if (results.length === 0) return null;
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {icon} {title} ({results.length})
      </h2>
      <div className="mt-3 space-y-3">
        {results.map((r) => (
          <ResultRow key={r.name} r={r} />
        ))}
      </div>
    </div>
  );
}

export default function AdminTestsPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<QaResult[] | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!user) return;
    setRunning(true);
    try {
      setResults(await runQaTests({ email: user.email }));
    } finally {
      setRunning(false);
    }
  };

  const functional = results?.filter((r) => r.category === 'functional') ?? [];
  const nonFunctional = results?.filter((r) => r.category === 'non_functional') ?? [];
  const passed = results?.filter((r) => r.passed).length ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link
          to="/app/admin"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-brand-600 dark:text-slate-400"
        >
          <ArrowLeft size={16} /> Volver al panel
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="text-brand-600 dark:text-brand-400" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pruebas de QA</h1>
          </div>
          <button
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            {running ? 'Ejecutando…' : 'Ejecutar pruebas'}
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cada prueba hace una petición HTTP real al servidor y verifica su respuesta.
        </p>

        {/* How to corroborate the requests */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-800 dark:bg-sky-900/20 dark:text-sky-200">
          <Terminal size={16} className="mt-0.5 shrink-0" />
          <p>
            <strong>Para verificar que son reales:</strong> abre las herramientas de desarrollador
            (F12) → pestaña <strong>Red / Network</strong> (y <strong>Consola</strong>) antes de
            pulsar “Ejecutar pruebas”. Verás salir cada petición hacia el servidor con su respuesta
            y código de estado (400, 401, 200…).
          </p>
        </div>

        {/* Summary */}
        {results && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{results.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{passed}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pasaron</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <p
                className={`text-2xl font-bold ${
                  results.length - passed > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
                }`}
              >
                {results.length - passed}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fallaron</p>
            </div>
          </div>
        )}

        {!results && !running && (
          <p className="mt-10 text-sm text-slate-400">
            Pulsa “Ejecutar pruebas” para correr la batería completa.
          </p>
        )}
        {running && (
          <p className="mt-10 flex items-center gap-2 text-slate-400">
            <Loader2 className="animate-spin" size={18} /> Ejecutando peticiones…
          </p>
        )}

        {results && (
          <div className="mt-8 space-y-8">
            <Section
              title="Pruebas funcionales"
              icon={<CheckCircle2 size={16} />}
              results={functional}
            />
            <Section
              title="Pruebas no funcionales"
              icon={<Gauge size={16} />}
              results={nonFunctional}
            />
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
