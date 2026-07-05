// frontend/src/api/api.ts
import axios from 'axios';
import type {
  AdminStats,
  AdminUser,
  Comment,
  LeaderboardEntry,
  NewTree,
  Paginated,
  Stats,
  Tree,
  User,
} from '../types';

// En producción se define VITE_API_URL en el .env del frontend.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/';
const ACCESS_KEY = 'plantapp_access';
const REFRESH_KEY = 'plantapp_refresh';

// --- Manejo de tokens en localStorage ---
export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_KEY, access),
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const api = axios.create({ baseURL: BASE_URL });

// Adjunta el access token a cada petición.
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si una respuesta es 401, intenta refrescar el token UNA vez y reintentar.
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      tokenStore.getRefresh() &&
      !original.url?.includes('auth/refresh')
    ) {
      original._retry = true;
      try {
        // Una sola petición de refresh compartida entre llamadas simultáneas.
        if (!refreshing) {
          refreshing = axios
            .post(`${BASE_URL}auth/refresh/`, { refresh: tokenStore.getRefresh() })
            .then((res) => {
              const newAccess = res.data.access as string;
              // simplejwt rota el refresh, así que guardamos el nuevo si viene.
              if (res.data.refresh) {
                tokenStore.set(newAccess, res.data.refresh);
              } else {
                tokenStore.setAccess(newAccess);
              }
              return newAccess;
            })
            .finally(() => {
              refreshing = null;
            });
        }
        const newAccess = await refreshing;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshError) {
        // El refresh también falló: sesión expirada.
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// --- Endpoints de autenticación ---
export const authApi = {
  register: (email: string, password: string, display_name: string) =>
    api.post<User>('auth/register/', { email, password, display_name }),
  login: (email: string, password: string) =>
    api.post<{ access: string; refresh: string }>('auth/login/', { email, password }),
  me: () => api.get<User>('auth/me/'),
};

// Actualiza el perfil del usuario autenticado.
export const updateMe = async (
  data: Partial<Pick<User, 'display_name' | 'bio' | 'location' | 'avatar_url'>>
) => {
  const response = await api.patch<User>('auth/me/', data);
  return response.data;
};

// --- Endpoints de árboles ---
export interface TreeQuery {
  page?: number;
  search?: string;
  mine?: boolean;
  ordering?: 'likes';
}

export const getTrees = async (query: TreeQuery = {}): Promise<Paginated<Tree>> => {
  const params: Record<string, string | number> = {};
  if (query.page) params.page = query.page;
  if (query.search) params.search = query.search;
  if (query.mine) params.mine = 1;
  if (query.ordering) params.ordering = query.ordering;
  const response = await api.get<Paginated<Tree>>('trees/', { params });
  return response.data;
};

// Todos los árboles (datos mínimos, sin paginar) para el mapa.
export const getTreeLocations = async (): Promise<Tree[]> => {
  const response = await api.get<Tree[]>('trees/locations/');
  return response.data;
};

export const deleteTree = async (id: number) => {
  await api.delete(`trees/${id}/`);
};

// --- Comentarios ---
export const getComments = async (treeId: number): Promise<Comment[]> => {
  const response = await api.get<Comment[]>('comments/', { params: { tree: treeId } });
  return response.data;
};

export const addComment = async (treeId: number, text: string): Promise<Comment> => {
  const response = await api.post<Comment>('comments/', { tree: treeId, text });
  return response.data;
};

export const deleteComment = async (id: number) => {
  await api.delete(`comments/${id}/`);
};

// --- Stats públicas (landing) ---
export const getStats = async (): Promise<Stats> => {
  const response = await api.get<Stats>('stats/');
  return response.data;
};

export const createTree = async (treeData: NewTree) => {
  const response = await api.post('trees/', treeData);
  return response.data;
};

// Sube una imagen al backend (que la reenvía a Cloudinary) y devuelve la URL.
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  // No fijamos Content-Type: axios pone el boundary de multipart automáticamente.
  const response = await api.post<{ url: string }>('upload/', formData);
  return response.data.url;
};

// Alterna el like sobre un árbol. Devuelve el estado nuevo.
export const toggleLike = async (treeId: number) => {
  const response = await api.post<{ liked: boolean; likes_count: number }>(
    `trees/${treeId}/like/`
  );
  return response.data;
};

// Top 10 de usuarios que más árboles han plantado.
export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const response = await api.get<LeaderboardEntry[]>('leaderboard/');
  return response.data;
};

// --- Panel de administración (requiere rol admin en el backend) ---
export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get<AdminStats>('admin/stats/');
    return response.data;
  },
  getUsers: async (): Promise<AdminUser[]> => {
    // El endpoint de admin no pagina: devuelve la lista completa.
    const response = await api.get<AdminUser[]>('admin/users/');
    return response.data;
  },
  updateUser: async (
    id: number,
    data: Partial<Pick<AdminUser, 'role' | 'is_active'>>
  ): Promise<AdminUser> => {
    const response = await api.patch<AdminUser>(`admin/users/${id}/`, data);
    return response.data;
  },
  deleteUser: async (id: number) => {
    await api.delete(`admin/users/${id}/`);
  },
};

export default api;
