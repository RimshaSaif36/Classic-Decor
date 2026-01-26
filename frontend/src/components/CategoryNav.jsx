import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../lib/config';

const defaultCats = [
  { id: 'wall-art', name: 'Wall Art' },
  { id: 'wall-mirrors', name: 'Wall Mirrors' },
  { id: 'wall-clocks', name: 'Wall Clocks' },
  { id: 'name-plates', name: 'Name Plates' },
  { id: 'photo-frames', name: 'Photo Frames' },
  { id: 'kids-decor', name: 'Kids Decor' },
  { id: 'shelves', name: 'Shelves' },
  { id: 'vases', name: 'Vases' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'office-decor', name: 'Office Decor' },
];

function mergeCategories(defaults, server) {
  const map = new Map();
  defaults.forEach((d) =>
    map.set(d.id, { id: d.id, name: d.name, count: d.count || 0 })
  );
  (server || []).forEach((s) => {
    const id = s.id || s.name;
    const name = s.name || s.id;
    if (map.has(id)) {
      const existing = map.get(id);
      existing.count = s.count || existing.count || 0;
      existing.name = name || existing.name;
    } else {
      map.set(id, { id, name, count: s.count || 0 });
    }
  });
  const result = [];
  defaults.forEach((d) => {
    if (map.has(d.id)) result.push(map.get(d.id));
  });
  const extras = [];
  Array.from(map.keys()).forEach((k) => {
    if (!defaults.some((d) => d.id === k)) extras.push(map.get(k));
  });
  extras.sort((a, b) => a.name.localeCompare(b.name));
  return result.concat(extras);
}

export default function CategoryNav() {
  const [cats, setCats] = useState(defaultCats);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(API_BASE + '/api/categories');
        if (!r.ok) return;
        const list = await r.json();
        if (!Array.isArray(list) || list.length === 0) return;
        const mapped = list.map((c) => ({
          id: c.id || c.name,
          name: c.name || c.id,
          count: c.count,
        }));
        const merged = mergeCategories(defaultCats, mapped);
        if (!cancelled) setCats(merged);
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <nav className="category-nav">
      <div className="category-container">
        <ul>
          {cats.map((c) => (
            <li key={c.id}>
              <Link to={`/categories/${encodeURIComponent(c.id)}`}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
