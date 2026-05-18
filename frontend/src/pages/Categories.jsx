import Header from '../components/Header';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pushGtmEcommerceEvent } from '../lib/gtm';
import { addProductToCart, getEffectivePrice, imgUrl } from '../lib/utils';

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
        const key = encodeURIComponent(String(id || '').toLowerCase());
        const r = await fetch(API_BASE + '/api/products?category=' + key + '&limit=1000');
        const list = await r.json();
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setError('Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const filtered = useMemo(() => {
    const key = String(id || '').toLowerCase();
    return items.filter(p => String(p.category || '').toLowerCase() === key);
  }, [items, id]);

  function showCartMessage(message, type = 'success') {
    const existing = document.querySelector('.cart-message');
    if (existing) existing.remove();
    const m = document.createElement('div');
    m.className = `cart-message ${type}`;
    m.textContent = message;
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 2800);
  }

  function addToCart(p) {
    const added = addProductToCart(p);
    if (added) {
      const gtmPrice = getEffectivePrice(p?.price, p?.saleDiscount, added.sizeLabel);
      pushGtmEcommerceEvent('AddToCart', {
        entity: p,
        id: added.productId,
        value: gtmPrice,
        items: [{ ...p, productId: added.productId, quantity: 1, size: added.sizeLabel, sizeLabel: added.sizeLabel, color: added.colorLabel, colorLabel: added.colorLabel }]
      });
    }
    showCartMessage(
      added ? 'Added to cart' : 'Unable to add this product to cart',
      added ? 'success' : 'error'
    );
  }

  return (
    <div className="categories-page">
      <Header />
      <main>
        <section className="shop-products">
          <h2>{displayFromKey(id || 'All Products')}</h2>
          {loading && <div>Loading...</div>}
          {error && <div>{error}</div>}
          {!loading && !error && (
            <div className="product-grid">
              {filtered.map((p, index) => (
                <div className="product-item" key={p._id || p.id || p.slug || `${p.name || 'product'}-${index}`}>
                  <Link to={`/product/${encodeURIComponent(p._id || p.id || p.slug)}`} className="product-image-link">
                    <img src={imgUrl(p.image)} alt={p.name} title={p.name} />
                  </Link>
                  <h3>{p.name}</h3>
                  <p className="price">PKR {Number(p.price) || 0}</p>
                  <div className="product-actions">
                    <Link className="view-details" to={`/product/${encodeURIComponent(p._id || p.id || p.slug)}`}>View Details</Link>
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
