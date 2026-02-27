import Header from '../components/Header';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { imgUrl } from '../lib/utils';

export default function Shop() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [params] = useSearchParams();

  // filters & pagination
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(params.get('category') || '');
  const [minPrice, setMinPrice] = useState(params.get('min') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('max') || '');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [page, setPage] = useState(Number(params.get('page') || 1));
  const [searchInput, setSearchInput] = useState(params.get('q') || '');
  const limit = 24;

  useEffect(() => {
    // fetch categories
    (async () => {
        try {
            const r = await fetch(API_BASE + '/api/products');
            if (!r.ok) return;
            const allProducts = await r.json();
            if (Array.isArray(allProducts)) {
              const uniqueCategories = [...new Set(allProducts.map(p => p.category))];
              setCategories(uniqueCategories);
            }
        } catch (e) {
            console.error('Could not fetch categories', e);
        }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const qs = new URLSearchParams();
        // Use searchInput for the query, not 'q' from URL, to ensure consistency
        if (searchInput) qs.set('q', searchInput);
        if (category) qs.set('category', category);
        if (minPrice) qs.set('min', minPrice);
        if (maxPrice) qs.set('max', maxPrice);
        if (sort) qs.set('sort', sort);
        if (page) qs.set('page', String(page));
        qs.set('limit', String(limit));
        
        const r = await fetch(API_BASE + '/api/products?' + qs.toString());
        if (!r.ok) throw new Error('Failed to fetch');
        const list = await r.json();
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Failed to load products. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchInput, category, minPrice, maxPrice, sort, page]);

  function applyFilters(){
    const qs = new URLSearchParams();
    if (searchInput) qs.set('q', searchInput);
    if (category) qs.set('category', category);
    if (minPrice) qs.set('min', minPrice);
    if (maxPrice) qs.set('max', maxPrice);
    if (sort) qs.set('sort', sort);
    
    // Reset to page 1 on any filter change
    setPage(1);
    qs.set('page', '1');

    const newUrl = '?' + qs.toString();
    try {
      window.history.pushState({}, '', newUrl);
    } catch (e) { console.error(e); }
  }

  const filtered = useMemo(() => {
    // Server-side filtering is now the primary method.
    // This memo is less critical but can be kept for complex client-side logic if needed in future.
    return items;
  }, [items]);

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
    <>
      <Header />
      <div className="shop-container">
        <div className="shop-header">
          <h1 className="shop-title">Shop Our Collection</h1>
          <p className="shop-subtitle">
              Find the perfect acrylic decor to elevate your space.
            </p>
        </div>

        {/* Filters */}
        <div className="filters-section">
            <div className="filter-grid">
              {/* Search */}
              <div>
                <label htmlFor="search" className="filter-label">Search</label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                  className="filter-input"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="filter-label">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="filter-input"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label htmlFor="sort" className="filter-label">Sort By</label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="filter-input"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="filter-actions">
                <button
                    onClick={applyFilters}
                    className="apply-btn"
                  >
                  Apply Filters
                </button>
                <button
                    onClick={() => {
                      setSearchInput('');
                      setCategory('');
                      setMinPrice('');
                      setMaxPrice('');
                      setSort('newest');
                      setPage(1);
                      const qs = new URLSearchParams();
                      qs.set('page', '1');
                      qs.set('sort', 'newest');
                      window.history.pushState({}, '', '?' + qs.toString());
                    }}
                    className="reset-btn"
                  >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

        {/* Products Grid */}
        {loading ? (
          <div className="loading-state">Loading products...</div>
        ) : error ? (
          <div className="error-state">Error: {error}</div>
        ) : (
          <>
            <div className="products-grid">
                {filtered.map(p => (
                  <div key={p.id} className="shop-product-card">
                    <div className="product-image-wrapper">
                      {p.saleDiscount > 0 && (
                        <div className="sale-badge">{p.saleDiscount}% OFF</div>
                      )}
                      <Link to={`/product/${encodeURIComponent(p._id || p.id || p.slug)}`} className="product-link">
                        <img
                          src={imgUrl(p.image)}
                          alt={p.name}
                          className="product-img"
                        />
                      </Link>
                      <div className="product-overlay-action">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart(p);
                          }}
                          className="quick-add-btn"
                        >
                          <i className="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                      </div>
                    </div>
                    <div className="product-info">
                      <h3 className="product-title">
                        <Link to={`/product/${encodeURIComponent(p._id || p.id || p.slug)}`}>
                          {p.name}
                        </Link>
                      </h3>
                      <p className="product-price">
                        {p.saleDiscount > 0 ? (
                          <>
                            <span className="original-price">PKR {Number(p.price).toLocaleString()}</span>
                            <span className="sale-price">PKR {(p.price - (p.price * p.saleDiscount / 100)).toLocaleString()}</span>
                          </>
                        ) : (
                          <>PKR {Number(p.price).toLocaleString()}</>
                        )}
                      </p>
                      <div className="product-actions">
                        <Link to={`/product/${encodeURIComponent(p._id || p.id || p.slug)}`} className="view-details-btn">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {filtered.length === 0 && (
              <div className="no-products-found">
                <h3>No Products Found</h3>
                <p>Try adjusting your filters or search term.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="pagination-controls">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="pagination-btn"
              >
                ← Previous
              </button>
              <span className="pagination-info">Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={filtered.length < limit || loading}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
