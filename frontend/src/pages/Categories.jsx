import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

function imgUrl(src) {
  const s = String(src || '');
  if (!s) return '';
  return s.startsWith('/') ? s : '/' + s;
}

export default function Categories() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  function displayFromKey(key){
    return String(key||'').split(/[-_]/g).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(API_BASE + '/api/products');
        const list = await r.json();
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setError('Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const key = String(id || '').toLowerCase();
    return items.filter(p => String(p.category || '').toLowerCase() === key);
  }, [items, id]);

  function addToCart(p) {
    if (typeof window !== 'undefined' && typeof window.addToCart === 'function') {
      window.addToCart(p);
      return;
    }
    const next = [...JSON.parse(localStorage.getItem('cart') || '[]')];
    const existing = next.find(i => i.id === p.id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      next.push({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        image: imgUrl(p.image || ''),
        quantity: 1
      });
    }
    localStorage.setItem('cart', JSON.stringify(next));
    if (typeof window !== 'undefined' && typeof window.updateCartCount === 'function') {
      window.updateCartCount();
    }
    try {
      const total = next.reduce((s, i) => s + (i.quantity || 1), 0);
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { total } }));
    } catch { void 0; }
    const m = document.createElement('div');
    m.className = 'cart-message success';
    m.textContent = 'Added to cart';
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 2800);
  }

  return (
    <div className="categories-page">
      <Header />
      <CategoryNav />
      <main>
        <section className="shop-products">
          <h2>{displayFromKey(id || 'All Products')}</h2>
          {loading && <div>Loading...</div>}
          {error && <div>{error}</div>}
          {!loading && !error && (
            <div className="product-grid">
              {filtered.map(p => (
                <div className="product-item" key={p.id}>
                  <img src={imgUrl(p.image)} alt={p.name} title={p.name} />
                  <h3>{p.name}</h3>
                  <p className="price">PKR {Number(p.price) || 0}</p>
                  <div className="product-actions">
                    <a className="view-details" href={`/product/${encodeURIComponent(p.id)}`}>View Details</a>
                    <button className="add-to-cart" onClick={() => addToCart(p)}>Add to Cart</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div>No products in this category</div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
