import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi, tokenStore } from '../api/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<void>;
  logout: () => void;
  // Actualiza el usuario en memoria (tras editar el perfil).
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la app: si hay token guardado, recuperamos el perfil.
  useEffect(() => {
    const bootstrap = async () => {
      if (tokenStore.getAccess()) {
        try {
          const res = await authApi.me();
          setUser(res.data);
        } catch {
          tokenStore.clear();
        }
      }
      setLoading(false);
    };
    bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    tokenStore.set(res.data.access, res.data.refresh);
    const me = await authApi.me();
    setUser(me.data);
  };

  const register = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    await authApi.register(email, password, username, displayName);
    await login(email, password); // login automático tras registrarse
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUser: setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
