import { useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../api/api';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Once registered, we swap the form for a "check your inbox" screen.
  const [registered, setRegistered] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(email, password, username, displayName);
      setRegistered(true);
    } catch (err) {
      // Mostramos el primer error que devuelva el backend (email en uso, password débil, etc.)
      const data = (err as AxiosError).response?.data as Record<string, string[]> | undefined;
      const firstError = data ? Object.values(data)[0]?.[0] : undefined;
      setError(firstError ?? 'No se pudo crear la cuenta.');
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-emerald-100 px-4 py-8 dark:from-slate-950 dark:to-slate-900">
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

        {registered ? (
          /* --- Post-registration: verify your email --- */
          <div className="text-center">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
              <MailCheck size={28} />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Revisa tu correo
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Te enviamos un enlace de verificación a{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>.
              Haz clic en él para activar tu cuenta y poder iniciar sesión.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              ¿No lo ves? Revisa la carpeta de spam.
            </p>

            {resendMsg && (
              <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                {resendMsg}
              </p>
            )}

            <button
              onClick={handleResend}
              disabled={resending}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline disabled:opacity-60 dark:text-brand-300"
            >
              {resending && <Loader2 size={14} className="animate-spin" />}
              Reenviar correo de verificación
            </button>

            <button
              onClick={() => navigate('/login')}
              className="mt-6 w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          /* --- Registration form --- */
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Crear cuenta</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Empieza a registrar tu reforestación.
            </p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
              <input
                className={inputClass}
                type="text"
                placeholder="Nombre público"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <div>
                <input
                  className={`${inputClass} w-full`}
                  type="text"
                  placeholder="Nombre de usuario (ej. maria_verde)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]{3,30}"
                  title="3–30 caracteres: letras, números o guion bajo"
                  required
                />
                <p className="mt-1 text-xs text-slate-400">
                  Tu identificador único para tu perfil público.
                </p>
              </div>
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
              <button
                className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                type="submit"
                disabled={busy}
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                {busy ? 'Creando…' : 'Registrarme'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              ¿Ya tienes cuenta?{' '}
              <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-300" to="/login">
                Entra aquí
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
