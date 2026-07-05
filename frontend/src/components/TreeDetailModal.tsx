import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Heart,
  Loader2,
  MapPin,
  SendHorizontal,
  Trash2,
  TreePine,
  UserRound,
  X,
} from 'lucide-react';
import { addComment, deleteComment, deleteTree, getComments } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './ToastProvider';
import { apiError, formatDate, timeAgo } from '../lib/format';
import type { Comment, Tree } from '../types';

interface Props {
  tree: Tree;
  onClose: () => void;
  onLike: (tree: Tree) => void;
  onDeleted: (tree: Tree) => void;
  onCommentDelta: (treeId: number, delta: number) => void;
}

function CommentAvatar({ comment }: { comment: Comment }) {
  if (comment.author_avatar) {
    return (
      <img
        src={comment.author_avatar}
        alt={comment.author_name}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
      {(comment.author_name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

export default function TreeDetailModal({ tree, onClose, onLike, onDeleted, onCommentDelta }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isMine = tree.user === user?.id;
  // El dueño o un admin (moderación) pueden eliminar el árbol.
  const canDelete = isMine || isAdmin;

  // Cargar comentarios al abrir.
  useEffect(() => {
    if (!tree.id) return;
    setLoadingComments(true);
    getComments(tree.id)
      .then(setComments)
      .catch(() => toast('No se pudieron cargar los comentarios.', 'error'))
      .finally(() => setLoadingComments(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.id]);

  // Cerrar con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!tree.id || !text.trim()) return;
    setSending(true);
    try {
      const created = await addComment(tree.id, text.trim());
      setComments((prev) => [...prev, created]);
      onCommentDelta(tree.id, 1);
      setText('');
    } catch (err) {
      toast(apiError(err, 'No se pudo enviar el comentario.'), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (comment: Comment) => {
    try {
      await deleteComment(comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      if (tree.id) onCommentDelta(tree.id, -1);
    } catch {
      toast('No se pudo borrar el comentario.', 'error');
    }
  };

  const handleDeleteTree = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (!tree.id) return;
    setDeleting(true);
    try {
      await deleteTree(tree.id);
      toast('Árbol eliminado.');
      onDeleted(tree);
    } catch {
      toast('No se pudo eliminar el árbol.', 'error');
      setDeleting(false);
    }
  };

  return (
    <div
      className="fade-in fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-in flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900"
      >
        {/* Foto / encabezado */}
        <div className="relative shrink-0">
          {tree.photo_url ? (
            <img
              src={tree.photo_url}
              alt={tree.species || 'Árbol'}
              className="h-56 w-full object-cover"
            />
          ) : (
            <div className="grid h-40 w-full place-items-center bg-gradient-to-br from-brand-100 to-emerald-200 dark:from-slate-800 dark:to-slate-700">
              <TreePine size={52} className="text-brand-400 dark:text-slate-500" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {tree.species || 'Especie desconocida'}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <UserRound size={12} />
                  {tree.author_username ? (
                    <Link
                      to={`/app/users/${tree.author_username}`}
                      onClick={onClose}
                      className="font-medium transition hover:text-brand-600 hover:underline"
                    >
                      {tree.planted_by || `@${tree.author_username}`}
                    </Link>
                  ) : (
                    tree.planted_by || 'Anónimo'
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} /> {formatDate(tree.planted_at)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {tree.latitude}, {tree.longitude}
                </span>
              </p>
            </div>
            <button
              onClick={() => onLike(tree)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition ${
                tree.liked_by_me
                  ? 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800'
                  : 'text-slate-500 ring-slate-200 hover:text-red-500 hover:ring-red-300 dark:text-slate-400 dark:ring-slate-600'
              }`}
            >
              <Heart size={16} className={tree.liked_by_me ? 'fill-red-500 text-red-500' : ''} />
              {tree.likes_count ?? 0}
            </button>
          </div>

          {/* Eliminar árbol: el dueño, o un admin como moderación. */}
          {canDelete && (
            <div className="mt-3">
              <button
                onClick={handleDeleteTree}
                disabled={deleting}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-60 ${
                  confirmDelete
                    ? 'bg-red-500 text-white ring-red-500 hover:bg-red-600'
                    : 'text-red-500 ring-red-200 hover:bg-red-50 dark:ring-red-900 dark:hover:bg-red-900/20'
                }`}
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {confirmDelete
                  ? '¿Seguro? Click para confirmar'
                  : isMine
                    ? 'Eliminar este árbol'
                    : 'Eliminar (moderación)'}
              </button>
            </div>
          )}

          {/* Comentarios */}
          <h3 className="mt-6 text-sm font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Comentarios ({comments.length})
          </h3>

          {loadingComments ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={15} className="animate-spin" /> Cargando…
            </p>
          ) : comments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Nadie ha comentado todavía. ¡Sé el primero! 🌱
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <CommentAvatar comment={c} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {c.author_username ? (
                        <Link
                          to={`/app/users/${c.author_username}`}
                          onClick={onClose}
                          className="font-semibold text-slate-900 transition hover:text-brand-600 hover:underline dark:text-white"
                        >
                          {c.author_name || `@${c.author_username}`}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {c.author_name || 'Anónimo'}
                        </span>
                      )}{' '}
                      <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                    </p>
                    <p className="mt-0.5 text-sm break-words text-slate-700 dark:text-slate-300">
                      {c.text}
                    </p>
                  </div>
                  {(c.user === user?.id || isAdmin) && (
                    <button
                      onClick={() => handleDeleteComment(c)}
                      className="shrink-0 self-start text-slate-300 transition hover:text-red-500 dark:text-slate-600"
                      title={c.user === user?.id ? 'Borrar comentario' : 'Borrar (moderación)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Escribir comentario */}
        <form
          onSubmit={handleSend}
          className="flex shrink-0 items-center gap-2 border-t border-slate-100 p-4 dark:border-slate-800"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un comentario…"
            maxLength={500}
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
            title="Enviar"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <SendHorizontal size={16} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
