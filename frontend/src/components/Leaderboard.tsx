import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TreePine, Trophy } from 'lucide-react';
import { getLeaderboard } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import type { LeaderboardEntry } from '../types';

// Colores de las medallas top 3.
const rankStyles = [
  'bg-amber-400 text-amber-950',
  'bg-slate-300 text-slate-700',
  'bg-orange-400 text-orange-950',
];

export default function Leaderboard({ refreshKey }: { refreshKey?: number }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    getLeaderboard()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [refreshKey]);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
        <Trophy size={18} className="text-amber-500" /> Ranking
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Quiénes más han plantado</p>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Aún no hay datos.</p>
      ) : (
        <ol className="mt-4 space-y-1">
          {entries.map((e, i) => {
            const isMe = e.id === user?.id;
            return (
              <li
                key={e.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  isMe
                    ? 'bg-brand-50 dark:bg-brand-900/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    rankStyles[i] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-medium text-slate-800 dark:text-slate-100">
                  {e.username ? (
                    <Link
                      to={`/app/users/${e.username}`}
                      className="transition hover:text-brand-600 hover:underline"
                    >
                      {e.display_name}
                    </Link>
                  ) : (
                    e.display_name
                  )}
                  {isMe && (
                    <span className="ml-1 text-xs text-brand-600 dark:text-brand-300">(tú)</span>
                  )}
                </span>
                <span className="flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300">
                  {e.tree_count} <TreePine size={14} />
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
