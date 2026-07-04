import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Envuelve rutas que requieren sesión iniciada.
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Cargando…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
