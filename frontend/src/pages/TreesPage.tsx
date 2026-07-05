import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import {
  ChevronDown,
  Globe,
  Heart,
  Loader2,
  MapPin,
  Search,
  Sprout,
  TreePine,
} from 'lucide-react';
import {
  authApi,
  createTree,
  getStats,
  getTreeLocations,
  getTrees,
  toggleLike,
  uploadImage,
} from '../api/api';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import Leaderboard from '../components/Leaderboard';
import MapPicker, { type Coords } from '../components/MapPicker';
import TreeCard from '../components/TreeCard';
import TreeDetailModal from '../components/TreeDetailModal';
import TreesMap from '../components/TreesMap';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import { apiError } from '../lib/format';
import { getCurrentPosition } from '../lib/geolocation';
import type { Stats, Tree } from '../types';

type Filter = 'all' | 'mine';
type Sort = 'recent' | 'liked';

const MAX_PHOTO_MB = 8;

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <div className="h-44 w-full bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
    </div>
  );
}

export default function TreesPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  // Formulario
  const [species, setSpecies] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Feed paginado
  const [feed, setFeed] = useState<Tree[]>([]);
  const [feedCount, setFeedCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Controles (búsqueda con debounce)
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');

  // Mapa + stats + modal
  const [mapTrees, setMapTrees] = useState<Tree[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const fetchFeed = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoadingFeed(true);
      try {
        const data = await getTrees({
          page: pageNum,
          search: debouncedQuery || undefined,
          mine: filter === 'mine' || undefined,
          ordering: sort === 'liked' ? 'likes' : undefined,
        });
        setFeed((prev) => (append ? [...prev, ...data.results] : data.results));
        setFeedCount(data.count);
        setHasNext(Boolean(data.next));
        setPage(pageNum);
      } catch {
        toast('No se pudo cargar el feed.', 'error');
      } finally {
        setLoadingFeed(false);
        setLoadingMore(false);
      }
    },
    [debouncedQuery, filter, sort, toast]
  );

  // Recargar el feed cuando cambian búsqueda/filtros.
  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  const refreshGlobal = useCallback(() => {
    getTreeLocations().then(setMapTrees).catch(() => {});
    getStats().then(setStats).catch(() => {});
    authApi.me().then((res) => updateUser(res.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshGlobal();
  }, [refreshGlobal]);

  // Un like actualiza feed, mapa y modal a la vez.
  const handleLike = async (tree: Tree) => {
    if (!tree.id) return;
    try {
      const res = await toggleLike(tree.id);
      const patch = (t: Tree) =>
        t.id === tree.id ? { ...t, liked_by_me: res.liked, likes_count: res.likes_count } : t;
      setFeed((prev) => prev.map(patch));
      setMapTrees((prev) => prev.map(patch));
    } catch {
      toast('No se pudo registrar el like.', 'error');
    }
  };

  const handleCommentDelta = (treeId: number, delta: number) => {
    setFeed((prev) =>
      prev.map((t) =>
        t.id === treeId ? { ...t, comments_count: (t.comments_count ?? 0) + delta } : t
      )
    );
  };

  const handleTreeDeleted = (tree: Tree) => {
    setSelectedId(null);
    setFeed((prev) => prev.filter((t) => t.id !== tree.id));
    setMapTrees((prev) => prev.filter((t) => t.id !== tree.id));
    setFeedCount((c) => Math.max(0, c - 1));
    refreshGlobal();
  };

  const handlePhotoPick = (file: File | null) => {
    if (file && file.size > MAX_PHOTO_MB * 1024 * 1024) {
      toast(`La foto supera los ${MAX_PHOTO_MB} MB. Elige una más liviana.`, 'error');
      return;
    }
    setPhoto(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!coords) {
      toast('Elige la ubicación del árbol tocando el mapa.', 'error');
      return;
    }
    if (!photo) {
      toast('La foto es obligatoria: ayuda a verificar que el árbol es real.', 'error');
      return;
    }
    setSaving(true);
    try {
      // Fresh location, requested on every submission (never cached/reused).
      // The backend checks it's within 50 km of the tree pin, to prove the
      // user is actually near where they say they're planting.
      const reporterCoords = await getCurrentPosition();
      const photoUrl = await uploadImage(photo);
      await createTree({
        species,
        photo_url: photoUrl,
        // Leaflet entrega floats de altísima precisión; el modelo solo admite
        // 10-11 dígitos. 6 decimales (~11 cm) es de sobra y encaja sin error.
        latitude: Number(coords.lat.toFixed(6)),
        longitude: Number(coords.lng.toFixed(6)),
        reporter_latitude: Number(reporterCoords.lat.toFixed(6)),
        reporter_longitude: Number(reporterCoords.lng.toFixed(6)),
      });
      toast('¡Árbol plantado con éxito! 🌳');
      setSpecies('');
      setCoords(null);
      setPhoto(null);
      fetchFeed(1, false);
      refreshGlobal();
    } catch (err) {
      // Geolocation rejections are plain Errors (not Axios), so they get
      // their own specific message instead of the generic API fallback.
      if (!axios.isAxiosError(err) && err instanceof Error) {
        toast(err.message, 'error');
      } else {
        toast(apiError(err, 'No se pudo registrar el árbol.'), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // El modal siempre refleja el estado más reciente del árbol.
  const selectedTree = useMemo(
    () =>
      feed.find((t) => t.id === selectedId) ??
      mapTrees.find((t) => t.id === selectedId) ??
      null,
    [feed, mapTrees, selectedId]
  );

  const statCards = [
    {
      icon: <Globe size={20} />,
      label: 'Árboles de la comunidad',
      value: stats?.trees ?? '—',
      color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    },
    {
      icon: <Sprout size={20} />,
      label: 'Tus árboles',
      value: user?.trees_count ?? 0,
      color: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    },
    {
      icon: <Heart size={20} />,
      label: 'Likes recibidos',
      value: user?.likes_received ?? 0,
      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
    },
  ];

  const inputClass =
    'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? 'bg-brand-600 text-white'
        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-400 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <AppHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Hola, {user?.display_name || 'reforestador'} 👋
        </h1>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${s.color}`}>
                {s.icon}
              </span>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {/* Formulario */}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                <Sprout size={20} className="text-brand-600" /> Registrar un árbol
              </h2>
              <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Especie
                  </label>
                  <input
                    className={inputClass}
                    type="text"
                    placeholder="ej: Roble"
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Foto (obligatoria, máx. {MAX_PHOTO_MB} MB)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => handlePhotoPick(e.target.files?.[0] ?? null)}
                    className="text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/40 dark:file:text-brand-200"
                  />
                  <p className="text-xs text-slate-400">
                    Ayuda a verificar que el árbol es real, no un registro falso.
                  </p>
                  {photo && (
                    <img
                      src={URL.createObjectURL(photo)}
                      alt="Vista previa"
                      className="mt-2 h-28 w-28 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Ubicación — toca el mapa o usa tu ubicación
                  </label>
                  <div className="overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
                    <MapPicker value={coords} onChange={setCoords} />
                  </div>
                  <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin size={12} />
                    {coords
                      ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                      : 'Sin ubicación seleccionada todavía.'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Al guardar te pediremos tu ubicación actual, para verificar que estás
                    cerca de donde plantas.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <TreePine size={16} />}
                  {saving ? 'Guardando…' : 'Registrar Árbol'}
                </button>
              </form>
            </section>

            {/* Mapa comunitario */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                <Globe size={20} className="text-brand-600" /> Mapa de árboles{' '}
                <span className="text-base font-normal text-slate-400">({mapTrees.length})</span>
              </h2>
              <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700">
                <TreesMap trees={mapTrees} />
              </div>
            </section>

            {/* Feed */}
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Feed{' '}
                  <span className="text-base font-normal text-slate-400">({feedCount})</span>
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar especie o autor…"
                      className="w-44 rounded-full border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <button className={chipClass(filter === 'all')} onClick={() => setFilter('all')}>
                    Todos
                  </button>
                  <button
                    className={chipClass(filter === 'mine')}
                    onClick={() => setFilter('mine')}
                  >
                    Míos
                  </button>
                  <button
                    className={chipClass(sort === 'liked')}
                    onClick={() => setSort(sort === 'liked' ? 'recent' : 'liked')}
                    title="Ordenar por más queridos"
                  >
                    <Heart size={11} className="mr-1 inline" />
                    Top
                  </button>
                </div>
              </div>

              {loadingFeed ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : feed.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                  <TreePine size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-slate-500 dark:text-slate-400">
                    {feedCount === 0 && !debouncedQuery && filter === 'all'
                      ? '¡Registra el primer árbol de la comunidad!'
                      : 'Nada por aquí con esos filtros.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {feed.map((tree) => (
                      <TreeCard
                        key={tree.id}
                        tree={tree}
                        onLike={handleLike}
                        onOpen={(t) => setSelectedId(t.id ?? null)}
                      />
                    ))}
                  </div>
                  {hasNext && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => fetchFeed(page + 1, true)}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-400 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                      >
                        {loadingMore ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                        Cargar más
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* Ranking */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <Leaderboard refreshKey={feedCount} />
            </div>
          </aside>
        </div>
      </main>

      <AppFooter />

      {/* Modal de detalle */}
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
