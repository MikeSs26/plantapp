import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { authApi } from '../api/api';
import { apiError } from '../lib/format';
import ThemeToggle from '../components/ThemeToggle';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Verificando tu correo…');
  // Guard against React 18 StrictMode double-invoking the effect in dev.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const uid = params.get('uid');
    const token = params.get('token');
    if (!uid || !token) {
      setStatus('error');
      setMessage('El enlace de verificación está incompleto o es inválido.');
      return;
    }
    authApi
      .verifyEmail(uid, token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.detail);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(apiError(err, 'No se pudo verificar tu correo.'));
      });
  }, [params]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-emerald-100 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
        <Link
          to="/"
          className="mb-6 block text-lg font-bold text-brand-700 dark:text-brand-300"
        >
          🌳 PlantApp
        </Link>

        {status === 'loading' && (
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700">
            <Loader2 size={28} className="animate-spin" />
          </span>
        )}
        {status === 'success' && (
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <CheckCircle2 size={28} />
          </span>
        )}
        {status === 'error' && (
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-300">
            <XCircle size={28} />
          </span>
        )}

        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {status === 'success'
            ? '¡Cuenta verificada!'
            : status === 'error'
              ? 'No se pudo verificar'
              : 'Verificando…'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>

        {status !== 'loading' && (
          <Link
            to="/login"
            className="mt-6 inline-block w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Iniciar sesión
          </Link>
        )}
        {status === 'error' && (
          <Link
            to="/register"
            className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"
          >
            Volver a registrarme
          </Link>
        )}
      </div>
    </div>
  );
}
