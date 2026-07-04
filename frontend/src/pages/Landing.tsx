import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Globe, Heart, Leaf, MapPin, TreePine, Trophy, Users } from 'lucide-react';
import { getStats } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import hero from '../assets/hero.png';
import type { Stats } from '../types';

// Número que cuenta de 0 al valor real al montarse (da vida a la landing).
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easing suave (easeOutCubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return <>{display.toLocaleString('es')}</>;
}

const features = [
  {
    icon: <MapPin size={22} />,
    title: 'Geolocalización precisa',
    text: 'Marca en un mapa interactivo el punto exacto donde plantaste cada árbol.',
  },
  {
    icon: <Camera size={22} />,
    title: 'Fotos reales',
    text: 'Sube una foto de tu árbol y guárdala en la nube junto a su ubicación.',
  },
  {
    icon: <Globe size={22} />,
    title: 'Mapa comunitario',
    text: 'Visualiza todos los árboles plantados por la comunidad en un solo mapa.',
  },
  {
    icon: <Trophy size={22} />,
    title: 'Ranking de impacto',
    text: 'Compite en el leaderboard y mira quién lidera la reforestación.',
  },
];

export default function Landing() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => setStats(null)); // si el backend no responde, ocultamos la franja
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      {/* Blobs decorativos de fondo */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-600/20" />
      <div className="pointer-events-none absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-800/20" />

      {/* Navbar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-xl font-bold text-brand-700 dark:text-brand-300">
          <TreePine size={24} /> PlantApp
        </span>
        <nav className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <Link
              to="/app"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Ir a la app
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
            🌱 Reforestación colaborativa
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-6xl dark:text-white">
            Cada árbol cuenta.{' '}
            <span className="bg-gradient-to-r from-brand-500 to-emerald-400 bg-clip-text text-transparent">
              Registra tu impacto.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-slate-600 dark:text-slate-400">
            Cada árbol tiene una historia, y nosotros le damos un lugar en el mapa. Sube una foto de tu brote, marca sus coordenadas y ayúdanos a pintar el planeta de verde, un píxel (y un árbol) a la vez. ¡Deja tu huella digital en la tierra!
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={user ? '/app' : '/register'}
              className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:bg-brand-700"
            >
              {user ? 'Ir a la app' : 'Empieza a plantar 🌱'}
            </Link>
            {!user && (
              <Link
                to="/login"
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-300"
              >
                Ya tengo cuenta
              </Link>
            )}
          </div>
        </div>
        <div className="relative flex justify-center">
          <div className="absolute inset-0 rotate-6 rounded-3xl bg-gradient-to-br from-brand-400 to-emerald-300 opacity-20 blur-xl" />
          <img
            src={hero}
            alt="Reforestación"
            className="relative w-full max-w-md rounded-3xl object-cover shadow-2xl ring-1 ring-black/5"
          />
        </div>
      </section>

      {/* Franja de impacto en vivo */}
      {stats && (
        <section className="relative z-10 mx-auto max-w-6xl px-6 pb-4">
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-slate-100 backdrop-blur sm:grid-cols-4 dark:bg-slate-900/70 dark:ring-slate-800">
            {[
              { icon: <TreePine size={20} />, value: stats.trees, label: 'Árboles plantados' },
              { icon: <Users size={20} />, value: stats.users, label: 'Reforestadores' },
              { icon: <Leaf size={20} />, value: stats.species, label: 'Especies distintas' },
              { icon: <Heart size={20} />, value: stats.likes, label: 'Likes dados' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  {s.icon}
                </span>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                  <CountUp value={s.value} />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="relative z-10 bg-brand-50/70 py-16 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">
            Todo lo que necesitas para reforestar
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600 dark:text-slate-400">
            Herramientas simples y potentes para que cada plantación quede registrada.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg dark:bg-slate-800 dark:ring-slate-700"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-100 text-brand-700 transition group-hover:scale-110 dark:bg-brand-900/40 dark:text-brand-300">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-500 px-8 py-14 text-center shadow-xl">
          <h2 className="text-3xl font-bold text-white">¿Listo para dejar tu huella verde?</h2>
          <p className="mx-auto mt-4 max-w-lg text-brand-50">
            Únete a la comunidad de reforestadores y empieza a registrar tu impacto hoy.
          </p>
          <Link
            to={user ? '/app' : '/register'}
            className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-brand-700 shadow-lg transition hover:-translate-y-0.5"
          >
            {user ? 'Ir a la app' : 'Crear mi cuenta gratis'}
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-100 dark:border-slate-800">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-3">
          <div>
            <span className="flex items-center gap-2 font-bold text-brand-700 dark:text-brand-300">
              <TreePine size={18} /> PlantApp
            </span>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Un mapa vivo de la reforestación, construido por su comunidad.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Explora</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <Link to="/register" className="hover:text-brand-600 dark:hover:text-brand-300">
                  Crear cuenta
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-brand-600 dark:hover:text-brand-300">
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <Link to="/app" className="hover:text-brand-600 dark:hover:text-brand-300">
                  La app
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">El proyecto</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Datos de mapa por OpenStreetMap. Hecho con 💚 para el planeta.
            </p>
          </div>
        </div>
        <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
          © {new Date().getFullYear()} PlantApp — Reforestación colaborativa
        </p>
      </footer>
    </div>
  );
}
