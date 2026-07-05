export interface Tree {
  id?: number;
  species: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  user?: number;
  planted_by?: string;
  author_username?: string; // author's handle, for linking to their profile
  planted_at?: string; // Django lo crea solo, por eso es opcional (?)
  likes_count?: number;
  liked_by_me?: boolean;
  comments_count?: number;
}

export interface LeaderboardEntry {
  id: number;
  username: string;
  display_name: string;
  tree_count: number;
}

export interface Comment {
  id: number;
  tree: number;
  user: number;
  author_name: string;
  author_username: string;
  author_avatar: string;
  text: string;
  created_at: string;
}

// Respuesta paginada estándar de DRF.
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Stats {
  trees: number;
  users: number;
  likes: number;
  species: number;
}

// Datos que el frontend envía al crear un árbol (el dueño lo pone el backend).
export interface NewTree {
  species: string;
  photo_url: string;
  latitude: number;
  longitude: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  location: string;
  role: 'user' | 'admin';
  created_at: string;
  trees_count?: number;
  likes_received?: number;
}

// Public profile of any user (no email exposed).
export interface PublicProfile {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  location: string;
  role: 'user' | 'admin';
  created_at: string;
  trees_count: number;
  likes_received: number;
}

// Usuario visto desde el panel de administración (incluye estado e id).
export interface AdminUser {
  id: number;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string;
  location: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  trees_count: number;
  likes_received: number;
}

// Métricas globales del panel de administración.
export interface AdminStats {
  users: number;
  admins: number;
  trees: number;
  comments: number;
  likes: number;
  new_users_week: number;
  new_trees_week: number;
}
