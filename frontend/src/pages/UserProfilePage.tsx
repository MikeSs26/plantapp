import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Heart,
  Loader2,
  MapPin,
  Pencil,
  ShieldCheck,
  TreePine,
} from 'lucide-react';
import { getTrees, getUserProfile, toggleLike } from '../api/api';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import TreeCard from '../components/TreeCard';
import TreeDetailModal from '../components/TreeDetailModal';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../lib/format';
import type { PublicProfile, Tree } from '../types';

function ProfileAvatar({ profile }: { profile: PublicProfile }) {
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase();
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.display_name || profile.username}
        className="h-20 w-20 rounded-full object-cover ring-4 ring-brand-500/30"
      />
    );
  }
  return (
    <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-2xl font-bold text-white ring-4 ring-brand-500/30">
      {initial}
    </span>
  );
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    try {
      const p = await getUserProfile(username);
      setProfile(p);
      const treeData = await getTrees({ user: p.id });
      setTrees(treeData.results);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLike = async (tree: Tree) => {
    if (!tree.id) return;
    try {
      const res = await toggleLike(tree.id);
      setTrees((prev) =>
        prev.map((t) =>
          t.id === tree.id ? { ...t, liked_by_me: res.liked, likes_count: res.likes_count } : t
        )
      );
    } catch {
      toast('No se pudo registrar el like.', 'error');
    }
  };

  const handleCommentDelta = (treeId: number, delta: number) => {
    setTrees((prev) =>
      prev.map((t) =>
        t.id === treeId ? { ...t, comments_count: (t.comments_count ?? 0) + delta } : t
      )
    );
  };

  const handleTreeDeleted = (tree: Tree) => {
    setSelectedId(null);
    setTrees((prev) => prev.filter((t) => t.id !== tree.id));
  };

  const selectedTree = useMemo(
    () => trees.find((t) => t.id === selectedId) ?? null,
    [trees, selectedId]
  );

  const isMe = me?.username === profile?.username;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <AppHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <Link
          to="/app"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-brand-600 dark:text-slate-400"
        >
          <ArrowLeft size={16} /> Volver al feed
        </Link>

        {loading ? (
          <p className="mt-10 flex items-center gap-2 text-slate-400">
            <Loader2 className="animate-spin" size={18} /> Cargando perfil…
          </p>
        ) : notFound || !profile ? (
          <div className="mt-10 rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
            <TreePine size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              No encontramos a <span className="font-semibold">@{username}</span>.
            </p>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <ProfileAvatar profile={profile} />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {profile.display_name || profile.username}
                    </h1>
                    {profile.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        <ShieldCheck size={12} /> Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">@{profile.username}</p>
                  {profile.bio && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{profile.bio}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 sm:justify-start dark:text-slate-400">
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {profile.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarDays size={12} /> Se unió el {formatDate(profile.created_at)}
                    </span>
                  </div>
                </div>
                {isMe && (
                  <Link
                    to="/app/profile"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50 dark:text-brand-300 dark:ring-brand-800 dark:hover:bg-brand-900/20"
                  >
                    <Pencil size={13} /> Editar
                  </Link>
                )}
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    <TreePine size={18} />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {profile.trees_count}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Árboles plantados</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                    <Heart size={18} />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {profile.likes_received}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Likes recibidos</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Their trees */}
            <section className="mt-8">
              <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
                Sus árboles{' '}
                <span className="text-base font-normal text-slate-400">
                  ({profile.trees_count})
                </span>
              </h2>
              {trees.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                  <TreePine size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-slate-500 dark:text-slate-400">
                    {isMe
                      ? 'Aún no has plantado ningún árbol.'
                      : 'Este usuario aún no ha plantado árboles.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {trees.map((tree) => (
                    <TreeCard
                      key={tree.id}
                      tree={tree}
                      onLike={handleLike}
                      onOpen={(t) => setSelectedId(t.id ?? null)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <AppFooter />

      {selectedTree && (
        <TreeDetailModal
          tree={selectedTree}
          onClose={() => setSelectedId(null)}
          onLike={handleLike}
          onDeleted={handleTreeDeleted}
          onCommentDelta={handleCommentDelta}
        />
      )}
    </div>
  );
}
