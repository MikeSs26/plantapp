import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Shield, Sprout, TreePine, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from './ThemeToggle';

function Avatar({ size = 32 }: { size?: number }) {
  const { user } = useAuth();
  const initial = (user?.display_name || user?.email || '?').charAt(0).toUpperCase();

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.display_name || 'Avatar'}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-brand-500/40"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-full bg-brand-600 text-sm font-bold text-white"
    >
      {initial}
    </span>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-[1100] border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/app"
          className="flex items-center gap-2 text-lg font-bold text-brand-700 dark:text-brand-300"
        >
          <TreePine size={22} />
          <span className="hidden sm:inline">PlantApp</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/app" end className={navLinkClass}>
            <Sprout size={16} />
            <span className="hidden sm:inline">Feed</span>
          </NavLink>
          <NavLink to="/app/profile" className={navLinkClass}>
            <UserRound size={16} />
            <span className="hidden sm:inline">Perfil</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/app/admin" className={navLinkClass}>
              <Shield size={16} />
              <span className="hidden sm:inline">Admin</span>
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/app/profile" title="Mi perfil">
            <Avatar />
          </Link>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-300 hover:text-red-500 dark:border-slate-700 dark:text-slate-400"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
