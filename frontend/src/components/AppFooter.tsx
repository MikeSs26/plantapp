import { Heart, TreePine } from 'lucide-react';

export default function AppFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 py-8 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center text-sm text-slate-400">
        <span className="flex items-center gap-1.5 font-semibold text-brand-700 dark:text-brand-300">
          <TreePine size={16} /> PlantApp
        </span>
        <p className="flex items-center gap-1">
          Hecho con <Heart size={13} className="fill-red-400 text-red-400" /> para el planeta —
          © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
