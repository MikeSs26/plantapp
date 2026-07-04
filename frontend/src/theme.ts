// Manejo del tema claro/oscuro. La clase `dark` vive en <html>.
const KEY = 'plantapp_theme';
export type Theme = 'light' | 'dark';

export function getInitialTheme(): Theme {
  const saved = localStorage.getItem(KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(KEY, theme);
}
