import { useState } from 'react';
import { getTrees, createTree } from './api/api';
import type { Tree } from './types';

// ... (Interface Tree aquí)

function App() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [newTree, setNewTree] = useState({
    species: '',
    photo_url: 'https://via.placeholder.com/150', // temp placeholder
    latitude: 0,
    longitude: 0,
    user: 1 // for now we're using the superuser (admin)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTree(newTree);
      alert("¡Árbol plantado con éxito! 🌳");
      // Recargar la lista
      const data = await getTrees();
      setTrees(data);
    } catch (error) {
      console.error("Error al plantar:", error);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Plantapp 🌳</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '40px', display: 'flex', gap: '10px', flexDirection: 'column', maxWidth: '300px' }}>
        <input 
          type="text" 
          placeholder="Especie (ej: Roble)" 
          onChange={e => setNewTree({...newTree, species: e.target.value})}
          required 
        />
        <input 
          type="number" 
          step="any" 
          placeholder="Latitud" 
          onChange={e => setNewTree({...newTree, latitude: parseFloat(e.target.value)})}
        />
        <input 
          type="number" 
          step="any" 
          placeholder="Longitud" 
          onChange={e => setNewTree({...newTree, longitude: parseFloat(e.target.value)})}
        />
        <button type="submit" style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '10px', cursor: 'pointer' }}>
          Registrar Árbol
        </button>
      </form>

      <hr />

      <h2>Árboles Registrados ({trees.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {trees.map(tree => (
          <div key={tree.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
            <h3>{tree.species || 'Especie desconocida'}</h3>
            <p>📍 {tree.latitude}, {tree.longitude}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;