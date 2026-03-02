import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { imgUrl } from '../lib/utils';

// Standard product sizes
const PRODUCT_SIZES = [
  {
    id: 's',
    label: 'Small (S) - 8 × 8'
  },
  {
    id: 'm',
    label: 'Medium (M) - 12 × 12'
  },
  {
    id: 'l',
    label: 'Large (L) - 15 × 15'
  }
];

export default function ProductDetail() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewProducts, setReviewProducts] = useState({});
  const [related, setRelated] = useState([]);
  const [revForm, setRevForm] = useState({ name: '', rating: 5, title: '', comment: '' });

  // fetch single product by id/slug
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(API_BASE + '/api/products/' + encodeURIComponent(id));
        if (!r.ok) {
          if (!cancelled) setError('Product not found');
          return;
        }
        const p = await r.json();
        if (!cancelled) {
          setItems([p]);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Failed to load product');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const product = useMemo(() => {
    return items && items.length ? items[0] : null;
  }, [items]);

  const availableSizes = useMemo(() => {
    if (!product) return [];
    // Use sizes from product if available (from dashboard)
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
      return product.sizes.map(s => ({ label: s }));
    }
    // Fallback to a default set of all standard sizes
    return PRODUCT_SIZES;
  }, [product]);

  const availableColors = useMemo(() => {
    if (!product) return [];
    // Use colors from product if available (from dashboard)
    if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
      return product.colors;
    }
    // Fallback to standard colors
    return ['Transparent', 'Black', 'Silver', 'Golden'];
  }, [product]);

  useEffect(() => {
    if (!product) return;
    
    // Initialize state if not already set or if switching products
    const vs = availableSizes;
    const vc = availableColors;

    setSize(prev => prev || (vs && vs.length ? String(vs[0].label || vs[0]) : ''));
    setColor(prev => prev || (vc && vc.length ? String(vc[0]) : ''));
    
    (async () => {
      try {
        const pid = product._id || product.id || product.slug;
        const r = await fetch(API_BASE + '/api/reviews?productId=' + encodeURIComponent(pid) + '&onlyApproved=true');
        const list = await r.json();
        setReviews(Array.isArray(list) ? list : []);
        
        // Fetch product images for all reviews
        const productMap = {};
        for (const review of (Array.isArray(list) ? list : [])) {
          if (review.productId && !productMap[review.productId]) {
            try {
              const productRes = await fetch(API_BASE + '/api/products/' + encodeURIComponent(review.productId));
              if (productRes.ok) {
                const productData = await productRes.json();
                productMap[review.productId] = productData;
              }
            } catch (err) {
              console.error('Failed to fetch product for review:', err);
            }
          }
        }
        setReviewProducts(productMap);
      } catch { void 0; }
    })();

    // fetch related products
    (async () => {
      try {
        const pid = product._id || product.id || product.slug;
        const r = await fetch(API_BASE + '/api/products/' + encodeURIComponent(pid) + '/related');
        const list = await r.json();
        if (Array.isArray(list)) setRelated(list);
      } catch { void 0; }
    })();
  }, [product, availableSizes, availableColors]);

  function addToCartDetail(p) {
    const sizeLabel = String(size || '');
    const colorLabel = String(color || '');
    const payload = {
      ...p,
      size: sizeLabel,
      color: colorLabel,
      sizeLabel,
      colorLabel
    };
    if (typeof window !== 'undefined' && typeof window.addToCart === 'function') {
      window.addToCart(payload);
      return;
    }
    const next = [...JSON.parse(localStorage.getItem('cart') || '[]')];
    const pid = p._id || p.id || p.slug;
    const existing = next.find(i => i.id === pid && String(i.size||'') === sizeLabel && String(i.color||'') === colorLabel);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      next.push({
        id: pid,
        name: p.name,
        price: Number(p.price) || 0,
        image: imgUrl(p.image || ''),
        quantity: 1,
        size: sizeLabel,
        color: colorLabel,
        sizeLabel,
        colorLabel
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

  async function submitReview(e){
    e.preventDefault();
    if (!product) return;
    const payload = {
      productId: product._id || product.id || product.slug,
      name: revForm.name || 'Anonymous',
      rating: Number(revForm.rating) || 5,
      title: revForm.title || '',
      comment: revForm.comment || ''
    };
    try {
      const r = await fetch(API_BASE + '/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) {
        const t = await r.text().catch(()=> '');
        alert(t || 'Failed to submit review');
        return;
      }
      const created = await r.json();
      setRevForm({ name: '', rating: 5, title: '', comment: '' });
      if (created.status && String(created.status).toLowerCase() === 'pending') {
        alert('Review submitted and is pending approval');
      } else {
        setReviews(prev => [created, ...prev]);
        const m = document.createElement('div');
        m.className = 'cart-message success';
        m.textContent = 'Review submitted';
        document.body.appendChild(m);
        setTimeout(() => m.remove(), 2500);
      }
    } catch { alert('Failed to submit review'); }
  }

  return (
    <div>
      <Header />
      <CategoryNav />
      <main>
        {loading && <div style={{ padding: '2rem' }}>Loading...</div>}
        {error && <div style={{ padding: '2rem' }}>{error}</div>}
        {!loading && !error && !product && (
          <section className="product-detail"><h2>Product Not Found</h2></section>
        )}
        {!loading && !error && product && (
          <div>
          <section className="product-detail">
            <div className="product-image-gallery">
              <img src={imgUrl(product.image)} alt={product.name} title={product.name} className="main-image" />
            </div>
            <div className="product-info">
              <h2 className="product-name">{product.name}</h2>
              <p className="product-description">{product.description || product.metaDescription || ''}</p>
              <div className="price-section">
                {product.saleDiscount > 0 && (
                  <div className="sale-badge-detail">{product.saleDiscount}% OFF</div>
                )}
                <p className="product-price">
                  {product.saleDiscount > 0 ? (
                    <>
                      <span className="original-price">PKR {Number(product.price).toLocaleString()}</span>
                      <span className="sale-price-detail">PKR {(product.price - (product.price * product.saleDiscount / 100)).toLocaleString()}</span>
                    </>
                  ) : (
                    <>PKR {Number(product.price) || 0}</>
                  )}
                </p>
              </div>

              <div className="product-options">
                {availableSizes.length > 0 && (
                  <div className="option-group">
                    <label>Size</label>
                    <select value={size} onChange={e=>setSize(e.target.value)}>
                      {availableSizes.map(s => {
                        const sizeLabel = s.label || s;
                        return <option key={sizeLabel} value={sizeLabel}>{sizeLabel}</option>
                      })}
                    </select>
                  </div>
                )}
                {availableColors.length > 0 && (
                  <div className="option-group">
                    <label>Color</label>
                    <select value={color} onChange={e=>setColor(e.target.value)}>
                      {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button className="add-to-cart-detail" onClick={() => addToCartDetail(product)}>Add to Cart</button>
              <div className="review-form" style={{ marginTop: 24 }}>
                <h3 style={{ gridColumn: '1 / -1', margin: 0, marginBottom: 8 }}>Add a Review</h3>
                <input placeholder="Your name" value={revForm.name} onChange={e=>setRevForm({ ...revForm, name: e.target.value })} />
                <select value={revForm.rating} onChange={e=>setRevForm({ ...revForm, rating: e.target.value })}>
                  {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                </select>
                <input placeholder="Review title (optional)" value={revForm.title} onChange={e=>setRevForm({ ...revForm, title: e.target.value })} />
                <textarea placeholder="Write your review..." value={revForm.comment} onChange={e=>setRevForm({ ...revForm, comment: e.target.value })} />
                <button onClick={submitReview}>Submit Review</button>
              </div>
            </div>
          </section>
          <section className="reviews-section" aria-label="Product Reviews">
            <div className="reviews-header">
              <h3>Customer Reviews</h3>
              <div className="reviews-summary">{reviews.length} reviews</div>
            </div>
            <div className="reviews-grid">
              {reviews.map((rev) => {
                const reviewProduct = reviewProducts[rev.productId];
                return (
                  <div className="review-card" key={rev.id}>
                    {reviewProduct && (
                      <div className="review-product-img">
                        <img src={imgUrl(reviewProduct.image)} alt={reviewProduct.name} title={reviewProduct.name} />
                      </div>
                    )}
                    <div className="review-title">{rev.title || 'Untitled'}</div>
                    <div className="review-meta"><span className="stars">{'★'.repeat(Number(rev.rating)||5)}</span> • {rev.name || 'Anonymous'}</div>
                    <div className="review-comment">"{rev.comment || ''}"</div>
                    {reviewProduct && (
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                        Product: <strong>{reviewProduct.name}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
              {reviews.length === 0 && <div className="review-card">No reviews yet</div>}
            </div>
          </section>

          {related && related.length > 0 && (
            <section className="shop-products" style={{ paddingTop: 8 }}>
              <h2>Related Products</h2>
              <div className="product-grid">
                {related.map(p => (
                  <div className="product-item" key={p.id}>
                    <img src={imgUrl(p.image)} alt={p.name} title={p.name} />
                    <h3>{p.name}</h3>
                    <p className="price">PKR {Number(p.price) || 0}</p>
                    <div className="product-actions">
                      <a className="view-details" href={`/product/${encodeURIComponent(p._id || p.id)}`}>View Details</a>
                    <button className="add-to-cart" onClick={() => addToCartDetail(p)}>Add to Cart</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
