import Header from '../components/Header';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function imgUrl(src) {
  const s = String(src || '');
  if (!s) return '';
  return s.startsWith('/') ? s : '/' + s;
}

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
      <div className="bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight" style={{color: '#d4af37'}}>Shop Our Collection</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
              Find the perfect acrylic decor to elevate your space.
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
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
                <label htmlFor="sort" className="block text-sm font-medium text-gray-700">Sort By</label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-end space-x-3">
                <button
                    onClick={applyFilters}
                    style={{backgroundColor: '#d4af37'}}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                  >
                  Apply
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
                    style={{borderColor: '#d4af37', color: '#d4af37'}}
                    className="w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                  >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-20">Loading products...</div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">Error: {error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filtered.map(p => (
                  <div key={p.id} className="group relative bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300">
                    <div className="w-full h-56 bg-gray-200 overflow-hidden">
                      <a href={`/product/${encodeURIComponent(p.id)}`} className="block w-full h-full">
                        <img
                          src={imgUrl(p.image)}
                          alt={p.name}
                          className="w-full h-full object-cover object-center group-hover:opacity-75 transition-opacity"
                        />
                      </a>
                    </div>
                    <div className="p-4 flex flex-col">
                      <h3 className="text-base font-semibold flex-grow" style={{color: '#d4af37'}}>
                        <a href={`/product/${encodeURIComponent(p.id)}`}>
                          {p.name}
                        </a>
                      </h3>
                      <p className="mt-2 text-lg font-bold text-gray-900">PKR {Number(p.price) || 0}</p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addToCart(p);
                        }}
                        style={{backgroundColor: '#d4af37'}}
                        className="mt-4 w-full text-white py-2 px-4 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <h3 className="text-2xl font-semibold" style={{color: '#d4af37'}}>No Products Found</h3>
                  <p className="mt-2 text-gray-500">Try adjusting your filters or search term.</p>
                </div>
              )}

              {/* Pagination */}
              <div className="flex justify-center items-center gap-4 mt-12">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1 || loading}
                  className="px-4 py-2 border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">Page {page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={filtered.length < limit || loading}
                  className="px-4 py-2 border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
