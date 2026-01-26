import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { API_BASE } from '../lib/config';
import { imgUrl } from '../lib/utils';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null');
    } catch { return null; }
  });
  useEffect(() => {
    function compute() {
      try {
        const list = JSON.parse(localStorage.getItem('cart') || '[]');
        const total = Array.isArray(list) ? list.reduce((s, i) => s + (i.quantity || 1), 0) : 0;
        setCount(total);
      } catch {
        setCount(0);
      }
    }
    compute();
    function onUpdate(e){
      const d = e && e.detail && typeof e.detail.total === 'number' ? e.detail.total : null;
      if (d !== null) setCount(d);
      else compute();
    }
    function onStorage(){
      try {
        const u = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null');
        setUser(u);
      } catch { setUser(null); }
      compute();
    }
    window.addEventListener('cart-updated', onUpdate);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('cart-updated', onUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  function logout(){
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('cart');
      try {
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { total: 0 } }));
      } catch { void 0; }
      setUser(null);
      window.location.href = '/';
    } catch { void 0; }
  }
  return (
    <header className="header">
      <button className="icon-btn mobile-menu-btn" aria-label="Menu" onClick={() => setMenuOpen(true)}>
        <i className="fa-solid fa-bars"></i>
      </button>
      <div className="logo">
        <Link to="/" className="logo-link">
          <img src="/images/brandlogo.png" alt="The Classic Decor Logo" className="logo-img" />
          <span className="logo-text"></span>
        </Link>
      </div>
      <nav>
        <ul></ul>
      </nav>
      <div className="header-actions">
        <Link to="/shop" className="icon-btn" title="Shop">
          <i className="fa-solid fa-store"></i>
        </Link>
        <button
          id="search-button"
          className="search-button"
          aria-label="Open search"
          aria-expanded={open ? 'true' : 'false'}
          onClick={() => setOpen(v => !v)}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            className="search-icon"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
        {open && (
          <InlineSearch
            onSubmit={(q) => { if (!q) return; window.location.href = `/shop?q=${encodeURIComponent(q)}`; }}
            onClose={() => setOpen(false)}
          />
        )}
        {!user ? (
          <Link to="/login" className="icon-btn" title="Account">
            <i className="fa-regular fa-user"></i>
          </Link>
        ) : null}
        {user && user.role === 'admin' && (
          <Link to="/admin" className="action-link" id="nav-admin">Admin</Link>
        )}
        {user && user.name && (
          <Link to="/profile" className="action-link" id="nav-account">Hi, {String(user.name).split(' ')[0]}</Link>
        )}
        {user ? (
          <a href="#" className="action-link" id="nav-logout" onClick={(e)=>{ e.preventDefault(); logout(); }}>Logout</a>
        ) : null}
        <Link to="/cart" className="icon-btn" title="Cart">
          <i className="fa-solid fa-cart-shopping"></i>
          <span id="nav-cart-count">{count}</span>
        </Link>
      </div>

      

      {menuOpen && (
        <div className="mobile-drawer open" onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}>
          <aside className="mobile-sheet">
            <div className="mobile-sheet-header">
              <span className="mobile-brand">The Classic Decor</span>
              <button className="icon-btn mobile-close" aria-label="Close" onClick={() => setMenuOpen(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <nav className="mobile-list">
              <Link to="/">Home</Link>
              <Link to="/shop">Shop</Link>
              {user && user.role === 'admin' ? <Link to="/admin">Admin</Link> : null}
              <Link to="/cart">Cart</Link>
              {user ? <Link to="/profile">Profile</Link> : null}
              {!user ? (
                <Link to="/login">Login</Link>
              ) : (
                <a href="#" onClick={(e)=>{ e.preventDefault(); logout(); }}>Logout</a>
              )}
            </nav>
            <div className="mobile-cats">
              <h4>Categories</h4>
              <div className="mobile-cats-list">
                <Link to="/categories/wall-art">Wall Art</Link>
                <Link to="/categories/wall-mirrors">Wall Mirrors</Link>
                <Link to="/categories/wall-clocks">Wall Clocks</Link>
                <Link to="/categories/name-plates">Name Plates</Link>
                <Link to="/categories/photo-frames">Photo Frames</Link>
                <Link to="/categories/kids-decor">Kids Decor</Link>
                <Link to="/categories/shelves">Shelves</Link>
                <Link to="/categories/vases">Vases</Link>
                <Link to="/categories/accessories">Accessories</Link>
                <Link to="/categories/office-decor">Office Decor</Link>
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

function SearchBox({ onSubmit }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(API_BASE + '/api/categories');
        const list = await r.json();
        if (!cancelled) setCategories(Array.isArray(list) ? list : []);
      } catch { void 0; }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!q || q.trim().length < 2) { setProducts([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const r = await fetch(API_BASE + '/api/products?q=' + encodeURIComponent(q) + '&limit=6', { signal: ctrl.signal });
        const list = await r.json();
        setProducts(Array.isArray(list) ? list : []);
      } catch { void 0; }
      finally { setLoading(false); }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);
  const matches = (() => {
    const s = String(q || '').toLowerCase();
    return (categories || [])
      .map(c => ({ name: c.name || '', id: c.id || c.name || '' }))
      .filter(c => c.name.toLowerCase().includes(s))
      .slice(0, 5);
  })();
  return (
    <form
      id="search-form"
      className="search-form"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const qq = q.trim();
        if (!qq) return;
        onSubmit(qq);
      }}
    >
      <input
        id="search-input"
        type="search"
        name="q"
        placeholder="Search products, categories..."
        aria-label="Search"
        autoComplete="off"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="search-results">
        <div className="search-columns">
          <div className="search-suggestions">
            <div className="results-title">Suggestions</div>
            {q && matches.length === 0 && (
              <div className="empty-note">No suggestions</div>
            )}
            {matches.map(m => (
              <Link key={m.id} to={`/shop?q=${encodeURIComponent(m.name)}`} className="suggestion-item">
                <i className="fa-solid fa-magnifying-glass"></i>
                <span>{m.name}</span>
              </Link>
            ))}
          </div>
          <div className="search-products">
            <div className="results-title">Products</div>
            {loading && <div className="loading-note">Searching…</div>}
            {!loading && q && products.length === 0 && (
              <div className="empty-note">No products found</div>
            )}
            {products.map(p => (
              <Link
                key={p._id || p.id || p.slug}
                to={`/product/${encodeURIComponent(p._id || p.id || p.slug)}`}
                className="product-result"
              >
                <img className="product-thumb" src={imgUrl(p.image)} alt={p.name} />
                <div className="product-meta">
                  <div className="product-name">{p.name}</div>
                  <div className="product-price">PKR {Number(p.price) || 0}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {q && (
          <Link to={`/shop?q=${encodeURIComponent(q)}`} className="search-all">
            Search for "{q}"
          </Link>
        )}
      </div>
      <button type="submit" className="search-submit">Search</button>
    </form>
  );
}

function InlineSearch({ onSubmit, onClose }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  useEffect(() => {
    if (!q || q.trim().length < 2) { setProducts([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const r = await fetch(API_BASE + '/api/products?q=' + encodeURIComponent(q) + '&limit=5', { signal: ctrl.signal });
        const list = await r.json();
        setProducts(Array.isArray(list) ? list : []);
      } catch { void 0; }
      finally { setLoading(false); }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);
  return (
    <div className="inline-search">
      <input
        className="inline-search-input"
        type="search"
        placeholder="Search products…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter') { const qq = q.trim(); if (qq) { onSubmit(qq); onClose(); } } }}
      />
      <button className="inline-search-go" onClick={() => { const qq = q.trim(); if (qq) { onSubmit(qq); onClose(); } }}>
        <i className="fa-solid fa-magnifying-glass"></i>
      </button>
      {q && (
        <div className="inline-search-dropdown">
          {loading && <div className="inline-note">Searching…</div>}
          {!loading && products.length === 0 && (
            <div className="inline-note">No products</div>
          )}
          {products.map(p => (
            <Link
              key={p._id || p.id || p.slug}
              to={`/product/${encodeURIComponent(p._id || p.id || p.slug)}`}
              className="inline-result"
              onClick={onClose}
            >
              <img src={imgUrl(p.image)} alt={p.name} className="inline-thumb" />
              <div className="inline-meta">
                <div className="inline-name">{p.name}</div>
                <div className="inline-price">PKR {Number(p.price) || 0}</div>
              </div>
            </Link>
          ))}
          {products.length > 0 && (
            <Link className="inline-all" to={`/shop?q=${encodeURIComponent(q)}`} onClick={onClose}>
              See all results
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
