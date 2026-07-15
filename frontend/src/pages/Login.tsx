import { useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../api/api';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // When the backend reports the account isn't verified, offer a resend action.
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMsg('');
    setNeedsVerification(false);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      const data = (err as AxiosError).response?.data as
        | { code?: string[]; detail?: string[] }
        | undefined;
      if (data?.code?.includes('email_not_verified')) {
        setNeedsVerification(true);
        setError(data.detail?.[0] ?? 'Tu correo aún no está verificado.');
      } else {
        setError('Email o contraseña incorrectos.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      const res = await authApi.resendVerification(email);
      setResendMsg(res.data.detail);
    } catch {
      setResendMsg('No se pudo reenviar el correo. Intenta más tarde.');
    } finally {
      setResending(false);
    }
  };

  const inputClass =
    'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-emerald-100 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
        <Link
          to="/"
          className="mb-6 block text-center text-lg font-bold text-brand-700 dark:text-brand-300"
        >
          🌳 PlantApp
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Entrar</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Bienvenido de vuelta, reforestador.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}

          {needsVerification && (
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              {resendMsg ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">{resendMsg}</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:underline disabled:opacity-60 dark:text-amber-300"
                >
                  {resending && <Loader2 size={14} className="animate-spin" />}
                  Reenviar correo de verificación
                </button>
              )}
            </div>
          )}

          <button
            className="rounded-lg bg-brand-600 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          ¿No tienes cuenta?{' '}
          <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-300" to="/register">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
