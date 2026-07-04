import { CalendarDays, Heart, MessageCircle, TreePine, UserRound } from 'lucide-react';
import { formatDate } from '../lib/format';
import type { Tree } from '../types';

interface Props {
  tree: Tree;
  onLike: (tree: Tree) => void;
  onOpen: (tree: Tree) => void;
}

export default function TreeCard({ tree, onLike, onOpen }: Props) {
  return (
    <article
      onClick={() => onOpen(tree)}
      className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 dark:ring-slate-700"
    >
      {tree.photo_url ? (
        <img
          src={tree.photo_url}
          alt={tree.species || 'Árbol'}
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="grid h-44 w-full place-items-center bg-gradient-to-br from-brand-50 to-emerald-100 dark:from-slate-700/60 dark:to-slate-700/30">
          <TreePine size={44} className="text-brand-300 dark:text-slate-500" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-900 dark:text-white">
              {tree.species || 'Especie desconocida'}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <UserRound size={12} /> {tree.planted_by || 'Anónimo'}
              <span className="mx-1">·</span>
              <CalendarDays size={12} /> {formatDate(tree.planted_at)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation(); // no abrir el modal al dar like
              onLike(tree);
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
              tree.liked_by_me
                ? 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800'
                : 'text-slate-500 ring-slate-200 hover:text-red-500 hover:ring-red-300 dark:text-slate-400 dark:ring-slate-600'
            }`}
            title={tree.liked_by_me ? 'Quitar me gusta' : 'Me gusta'}
          >
            <Heart size={15} className={tree.liked_by_me ? 'fill-red-500 text-red-500' : ''} />
            {tree.likes_count ?? 0}
          </button>
        </div>
        <p className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <MessageCircle size={12} /> {tree.comments_count ?? 0} comentarios
          </span>
        </p>
      </div>
    </article>
  );
}
