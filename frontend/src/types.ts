export interface Tree {
  id?: number;
  species: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  user: number;
  planted_at?: string; // Django lo crea solo, por eso es opcional (?)
}