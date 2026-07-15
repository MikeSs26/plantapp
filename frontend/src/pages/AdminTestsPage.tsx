import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  Gauge,
  Loader2,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { adminApi } from '../api/api';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useToast } from '../components/ToastProvider';
import { apiError } from '../lib/format';
import type { DiagnosticResult, DiagnosticsReport } from '../types';

function ResultRow({ r }: { r: DiagnosticResult }) {
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
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
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
  results: DiagnosticResult[];
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
  const toast = useToast();
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      setReport(await adminApi.runTests());
    } catch (err) {
      toast(apiError(err, 'No se pudieron ejecutar las pruebas.'), 'error');
    } finally {
      setRunning(false);
    }
  };

  // Run once on open so the panel isn't empty.
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const functional = report?.results.filter((r) => r.category === 'functional') ?? [];
  const nonFunctional = report?.results.filter((r) => r.category === 'non_functional') ?? [];

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
          Pruebas funcionales y no funcionales ejecutadas en vivo contra el sistema.
        </p>

        {/* Summary */}
        {report && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {report.summary.total}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {report.summary.passed}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pasaron</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <p
                className={`text-2xl font-bold ${
                  report.summary.failed > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {report.summary.failed}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fallaron</p>
            </div>
          </div>
        )}

        {running && !report ? (
          <p className="mt-10 flex items-center gap-2 text-slate-400">
            <Loader2 className="animate-spin" size={18} /> Ejecutando pruebas…
          </p>
        ) : (
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

        {report && (
          <p className="mt-8 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck size={12} />
            Radio máximo: {report.config.user_radius_km} km · Límite diario:{' '}
            {report.config.daily_tree_limit} árboles · Última ejecución:{' '}
            {new Date(report.ran_at).toLocaleTimeString('es')}
          </p>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
