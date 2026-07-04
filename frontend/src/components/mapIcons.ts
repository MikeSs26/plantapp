import L from 'leaflet';

// Pines propios (divIcon con CSS en index.css). Reemplazan los iconos por
// defecto de Leaflet, que se rompen con bundlers y salían como un cuadrado.

// className: '' quita el fondo blanco por defecto de leaflet-div-icon.
export const treePin = L.divIcon({
  className: '',
  html: '<div class="tree-pin"><span>🌳</span></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 42], // compensa la punta de la gota rotada
  popupAnchor: [0, -40],
});

export const pickPin = L.divIcon({
  className: '',
  html: '<div class="tree-pin tree-pin--pick"><span>📍</span></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 42],
  popupAnchor: [0, -40],
});
