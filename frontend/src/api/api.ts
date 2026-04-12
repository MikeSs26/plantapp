// frontend/src/api/api.ts
import axios from 'axios';
import type { Tree } from '../types';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/', //backend url
});

export const getTrees = async () => {
  const response = await api.get('trees/');
  return response.data;
};

export const createTree = async (treeData: Tree) => {
  const response = await api.post('trees/', treeData);
  return response.data;
};

export default api;