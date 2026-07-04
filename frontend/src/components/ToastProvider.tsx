import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Contenedor de toasts */}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[3000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              t.type === 'success' ? 'bg-brand-600' : 'bg-red-500'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx.toast;
}
