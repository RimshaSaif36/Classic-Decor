import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

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
      setUser(null);
      window.location.href = '/';
    } catch { void 0; }
  }
  return (
    <header className="header">
      <div className="logo">
        <Link to="/" className="logo-text">Classic Decor</Link>
      </div>
      <nav>
        <ul></ul>
      </nav>
      <div className="header-actions">
        <button className="icon-btn mobile-menu-btn" aria-label="Menu" onClick={() => setMenuOpen(true)}>
          <i className="fa-solid fa-bars"></i>
        </button>
        <Link to="/shop" className="icon-btn" title="Shop">
          <i className="fa-solid fa-store"></i>
        </Link>
        <button
          id="search-toggle"
          className="icon-btn"
          title="Search"
          onClick={() => setOpen(true)}
        >
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
        <Link to="/login" className="icon-btn" title="Account">
          <i className="fa-regular fa-user"></i>
        </Link>
        {user && user.role === 'admin' && (
          <Link to="/admin" className="action-link" id="nav-admin">Admin</Link>
        )}
        {user && user.name && (
          <span className="action-text" id="nav-account">Hi, {String(user.name).split(' ')[0]}</span>
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
              <span className="mobile-brand">Classic Decor</span>
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
                <Link to="/categories/vases">Flower Vases</Link>
              </div>
            </div>
          </aside>
        </div>
      )}

      {open && (
        <div id="search-overlay" className="search-overlay open" aria-hidden="false" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="search-panel">
            <button
              id="search-close"
              className="search-close"
              aria-label="Close search"
              onClick={() => setOpen(false)}
            >
              &times;
            </button>
            <form
              id="search-form"
              className="search-form"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get('q');
                if (!q) return setOpen(false);
                window.location.href = `/shop?q=${encodeURIComponent(q)}`;
              }}
            >
              <input
                id="search-input"
                type="search"
                name="q"
                placeholder="Search products, categories..."
                aria-label="Search"
                autoComplete="off"
              />
              <button type="submit" className="search-submit">Search</button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
