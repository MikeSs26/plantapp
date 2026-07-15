import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownCircle,
  FlaskConical,
  Heart,
  Leaf,
  Loader2,
  MessageSquare,
  Shield,
  ShieldCheck,
  Trash2,
  TreePine,
  UserRound,
  Users,
} from 'lucide-react';
import { adminApi } from '../api/api';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import { apiError } from '../lib/format';
import type { AdminStats, AdminUser } from '../types';

function StatCard({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        {hint && <p className="text-[11px] text-brand-600 dark:text-brand-400">{hint}</p>}
      </div>
    </div>
  );
}

function Avatar({ u }: { u: AdminUser }) {
  const initial = (u.display_name || u.email || '?').charAt(0).toUpperCase();
  if (u.avatar_url) {
    return (
      <img
        src={u.avatar_url}
        alt={u.display_name || u.email}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
      {initial}
    </span>
  );
}

export default function AdminPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  // Ids con una acción en curso (deshabilita sus botones).
  const [busy, setBusy] = useState<Set<number>>(new Set());
  // Id en confirmación de borrado (segundo click confirma).
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([adminApi.getStats(), adminApi.getUsers()]);
      setStats(s);
      setUsers(u);
    } catch (err) {
      toast(apiError(err, 'No se pudo cargar el panel.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setBusyFor = (id: number, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleRole = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    setBusyFor(u.id, true);
    try {
      const updated = await adminApi.updateUser(u.id, { role: newRole });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      toast(
        newRole === 'admin'
          ? `${u.display_name || u.email} ahora es administrador.`
          : `${u.display_name || u.email} vuelve a ser reforestador.`
      );
    } catch (err) {
      toast(apiError(err, 'No se pudo cambiar el rol.'), 'error');
    } finally {
      setBusyFor(u.id, false);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    setBusyFor(u.id, true);
    try {
      const updated = await adminApi.updateUser(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      toast(updated.is_active ? 'Usuario reactivado.' : 'Usuario desactivado.');
    } catch (err) {
      toast(apiError(err, 'No se pudo cambiar el estado.'), 'error');
    } finally {
      setBusyFor(u.id, false);
    }
  };

  const removeUser = async (u: AdminUser) => {
    if (confirmDelete !== u.id) {
      setConfirmDelete(u.id);
      return;
    }
    setBusyFor(u.id, true);
    try {
      await adminApi.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setConfirmDelete(null);
      toast('Usuario eliminado.');
      // Refresca contadores del dashboard.
      adminApi.getStats().then(setStats).catch(() => {});
    } catch (err) {
      toast(apiError(err, 'No se pudo eliminar el usuario.'), 'error');
    } finally {
      setBusyFor(u.id, false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="text-brand-600 dark:text-brand-400" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Panel de administración
            </h1>
          </div>
          <Link
            to="/app/admin/tests"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50 dark:text-brand-300 dark:ring-brand-800 dark:hover:bg-brand-900/20"
          >
            <FlaskConical size={15} /> Pruebas de QA
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Métricas de la plataforma y gestión de la comunidad.
        </p>

        {loading ? (
          <p className="mt-10 flex items-center gap-2 text-slate-400">
            <Loader2 className="animate-spin" size={18} /> Cargando panel…
          </p>
        ) : (
          <>
            {/* Dashboard de métricas */}
            {stats && (
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  icon={<Users size={20} />}
                  label="Usuarios"
                  value={stats.users}
                  hint={stats.new_users_week > 0 ? `+${stats.new_users_week} esta semana` : undefined}
                  color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                />
                <StatCard
                  icon={<TreePine size={20} />}
                  label="Árboles"
                  value={stats.trees}
                  hint={stats.new_trees_week > 0 ? `+${stats.new_trees_week} esta semana` : undefined}
                  color="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                />
                <StatCard
                  icon={<MessageSquare size={20} />}
                  label="Comentarios"
                  value={stats.comments}
                  color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
                />
                <StatCard
                  icon={<Heart size={20} />}
                  label="Likes"
                  value={stats.likes}
                  color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300"
                />
              </div>
            )}

            {/* Gestión de usuarios */}
            <div className="mt-8">
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                <Users size={16} /> Usuarios ({users.length})
              </h2>

              <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                {/* Vista de tabla en pantallas medianas+ */}
                <table className="hidden w-full text-left text-sm md:table">
                  <thead className="border-b border-slate-100 text-xs text-slate-400 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-medium">Usuario</th>
                      <th className="px-4 py-3 font-medium">Rol</th>
                      <th className="px-4 py-3 text-center font-medium">Árboles</th>
                      <th className="px-4 py-3 text-center font-medium">Estado</th>
                      <th className="px-4 py-3 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/60">
                    {users.map((u) => {
                      const isMe = u.id === me?.id;
                      const isBusy = busy.has(u.id);
                      return (
                        <tr key={u.id} className={isMe ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar u={u} />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900 dark:text-white">
                                  {u.display_name || '—'}
                                  {isMe && (
                                    <span className="ml-1.5 text-[11px] font-normal text-brand-600 dark:text-brand-400">
                                      (tú)
                                    </span>
                                  )}
                                </p>
                                <p className="truncate text-xs text-slate-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                                <ShieldCheck size={12} /> Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                <UserRound size={12} /> Reforestador
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">
                            {u.trees_count}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {u.is_active ? (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                Activo
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">Inactivo</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {isMe ? (
                                <span className="text-xs text-slate-300 dark:text-slate-600">
                                  Tu cuenta
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => toggleRole(u)}
                                    disabled={isBusy}
                                    title={u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-40 dark:hover:bg-brand-900/20"
                                  >
                                    {u.role === 'admin' ? (
                                      <ArrowDownCircle size={16} />
                                    ) : (
                                      <ShieldCheck size={16} />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => toggleActive(u)}
                                    disabled={isBusy}
                                    title={u.is_active ? 'Desactivar' : 'Reactivar'}
                                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40 dark:hover:bg-amber-900/20"
                                  >
                                    <Leaf size={16} className={u.is_active ? '' : 'opacity-40'} />
                                  </button>
                                  <button
                                    onClick={() => removeUser(u)}
                                    disabled={isBusy}
                                    title="Eliminar usuario"
                                    className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition disabled:opacity-40 ${
                                      confirmDelete === u.id
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
                                    }`}
                                  >
                                    {isBusy ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                    {confirmDelete === u.id && '¿Seguro?'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Vista de tarjetas en móvil */}
                <ul className="divide-y divide-slate-50 md:hidden dark:divide-slate-700/60">
                  {users.map((u) => {
                    const isMe = u.id === me?.id;
                    const isBusy = busy.has(u.id);
                    return (
                      <li key={u.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar u={u} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900 dark:text-white">
                              {u.display_name || '—'}
                              {isMe && (
                                <span className="ml-1 text-[11px] font-normal text-brand-600 dark:text-brand-400">
                                  (tú)
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-slate-400">{u.email}</p>
                          </div>
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                              <ShieldCheck size={11} /> Admin
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              Reforestador
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            🌳 {u.trees_count} · {u.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                          {isMe ? (
                            <span className="text-xs text-slate-300 dark:text-slate-600">
                              Tu cuenta
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => toggleRole(u)}
                                disabled={isBusy}
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-brand-600 disabled:opacity-40"
                              >
                                {u.role === 'admin' ? (
                                  <ArrowDownCircle size={16} />
                                ) : (
                                  <ShieldCheck size={16} />
                                )}
                              </button>
                              <button
                                onClick={() => toggleActive(u)}
                                disabled={isBusy}
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-amber-600 disabled:opacity-40"
                              >
                                <Leaf size={16} className={u.is_active ? '' : 'opacity-40'} />
                              </button>
                              <button
                                onClick={() => removeUser(u)}
                                disabled={isBusy}
                                className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold disabled:opacity-40 ${
                                  confirmDelete === u.id
                                    ? 'bg-red-500 text-white'
                                    : 'text-slate-400 hover:text-red-600'
                                }`}
                              >
                                {isBusy ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                {confirmDelete === u.id && '¿Seguro?'}
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                <ShieldCheck size={12} className="mr-1 inline" /> Hacer admin ·{' '}
                <ArrowDownCircle size={12} className="mr-1 inline" /> Quitar admin ·{' '}
                <Leaf size={12} className="mr-1 inline" /> Activar/desactivar ·{' '}
                <Trash2 size={12} className="mr-1 inline" /> Eliminar. Los admins también pueden
                borrar cualquier árbol o comentario desde el feed.
              </p>
            </div>
          </>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
