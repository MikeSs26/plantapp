import { useState, type FormEvent } from 'react';
import { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(email, password, displayName);
      navigate('/app');
    } catch (err) {
      // Mostramos el primer error que devuelva el backend (email en uso, password débil, etc.)
      const data = (err as AxiosError).response?.data as Record<string, string[]> | undefined;
      const firstError = data ? Object.values(data)[0]?.[0] : undefined;
      setError(firstError ?? 'No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
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
            className="rounded-lg bg-brand-600 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Creando…' : 'Registrarme'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-300" to="/login">
            Entra aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
