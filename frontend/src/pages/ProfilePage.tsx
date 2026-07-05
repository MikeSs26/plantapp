import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  Check,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  Save,
  TreePine,
} from 'lucide-react';
import { authApi, updateMe, uploadImage } from '../api/api';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import { apiError } from '../lib/format';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Refresca stats (árboles, likes) al entrar al perfil.
  useEffect(() => {
    authApi
      .me()
      .then((res) => updateUser(res.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarPick = async (file: File | null) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast('La foto supera los 8 MB. Elige una más liviana.', 'error');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setAvatarUrl(url);
      toast('Foto subida. Recuerda guardar los cambios.');
    } catch {
      toast('No se pudo subir la imagen.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateMe({
        display_name: displayName,
        username,
        bio,
        location,
        avatar_url: avatarUrl,
      });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast(apiError(err, 'No se pudo guardar el perfil.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es', { month: 'long', year: 'numeric' })
    : '';

  const inputClass =
    'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  const stats = [
    {
      icon: <TreePine size={20} />,
      label: 'Árboles plantados',
      value: user?.trees_count ?? 0,
      color: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    },
    {
      icon: <Heart size={20} />,
      label: 'Likes recibidos',
      value: user?.likes_received ?? 0,
      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
    },
    {
      icon: <CalendarDays size={20} />,
      label: 'Miembro desde',
      value: memberSince,
      color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mi perfil</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Así te ve la comunidad de reforestadores.
        </p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${s.color}`}>
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-900 capitalize dark:text-white">
                  {s.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario de perfil */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
        >
          {/* Avatar */}
          <div className="flex items-center gap-5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-500/30"
              />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-full bg-brand-600 text-3xl font-bold text-white">
                {(displayName || user?.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarPick(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-500 hover:text-brand-700 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-300"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                {uploading ? 'Subiendo…' : 'Cambiar foto'}
              </button>
              <p className="mt-2 text-xs text-slate-400">JPG o PNG. Se guarda al presionar Guardar.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Nombre público
              </label>
              <input
                className={inputClass}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Ubicación
              </label>
              <div className="relative">
                <MapPin
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  className={`${inputClass} w-full pl-9`}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="ej: Bogotá, Colombia"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Nombre de usuario
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                @
              </span>
              <input
                className={`${inputClass} w-full pl-8`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu_usuario"
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]{3,30}"
                title="3–30 caracteres: letras, números o guion bajo"
                required
              />
            </div>
            <p className="text-xs text-slate-400">
              Tu identificador único. Aparece en la URL de tu perfil público.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Biografía
            </label>
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntale a la comunidad quién eres y por qué plantas árboles…"
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-300">
                <Check size={16} /> Perfil actualizado
              </span>
            )}
          </div>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          Sesión iniciada como <strong>{user?.email}</strong>
        </p>
      </main>

      <AppFooter />
    </div>
  );
}
