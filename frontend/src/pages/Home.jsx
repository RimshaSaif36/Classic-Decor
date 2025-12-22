import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

function starText(n) {
  const s = Math.max(1, Math.min(5, Number(n) || 0));
  return '★'.repeat(s) + '☆'.repeat(5 - s);
}

function imgUrl(src) {
  const s = String(src || '');
  if (!s) return '';
  return s.startsWith('/') ? s : '/' + s;
}

function initials(name) {
  const t = String(name || '').trim();
  if (!t) return 'A';
  const parts = t.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || 'A';
}

export default function Home() {
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [latest, setLatest] = useState([]);
  const [ri, setRi] = useState(0);
  const [paused, setPaused] = useState(false);
  const [products, setProducts] = useState([]);

  const [newArrivals, setNewArrivals] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetch(API_BASE + '/api/reviews/summary');
        const summary = await s.json();
        if (!cancelled) setSummary(summary || { count: 0, average: 0 });
      } catch (e) { console.error(e) }

      try {
        const r = await fetch(API_BASE + '/api/reviews');
        const list = await r.json();
        const latest = (Array.isArray(list) ? list : []).slice(-3).reverse();
        if (!cancelled) setLatest(latest);
      } catch (e) { console.error(e) }

      try {
        const p = await fetch(API_BASE + '/api/products');
        const plist = await p.json();
        if (!cancelled) setProducts(Array.isArray(plist) ? plist : []);
      } catch (e) { console.error(e) }



      try {
        const na = await fetch(API_BASE + '/api/products?sort=newest&limit=10');
        const nalist = await na.json();
        if (!cancelled) setNewArrivals(Array.isArray(nalist) ? nalist : []);
      } catch (e) { console.error(e) }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!latest.length) return;
    const id = setInterval(() => {
      if (!paused) setRi(prev => (prev + 1) % latest.length);
    }, 5000);
    return () => clearInterval(id);
  }, [latest.length, paused]);

  const visible = useMemo(() => {
    const len = latest.length;
    if (len === 0) return [];
    return [latest[ri % len]];
  }, [latest, ri]);

  return (
    <div className="home-page">
      <Header />
      <CategoryNav />
      <main>
        <section className="hero">
          <div className="hero-overlay">
            <div className="hero-content">
              <h1 className="typewriter">Bring Art & Elegance to Every Corner</h1>
              <p>Modern. Elegant. Handcrafted for your space.</p>
              <Link to="/shop" className="shop-btn">Shop Now</Link>
            </div>
          </div>
        </section>
        <section className="featured-products">
          <h2>Featured Products</h2>
          <div className="product-grid">
            {[{
              id: 1,
              name: 'Eternal Motion - Black & Gold Cyclist Sculpture',
              price: 2499,
              image: '/images/1766139868966-cycle.jpg'
            }, {
              id: 2,
              name: 'Premium Majestic Roman Clock',
              price: 1999,
              image: '/images/1766139618884-clock.jpg'
            }, {
              id: 3,
              name: 'Flower Vase Book Shaped Vase',
              price: 3500,
              image: '/images/1765537411257-bookShapedVase.jpg'
            }, {
              id: 4,
              name: 'Mouse Shaped Custom Wall Decor',
              price: 2000,
              image: '/images/1765533128224-mouseshaped.jpg'
            }].map((p) => (
              <div className="product-item group relative" key={p.id}>
                <Link to={`/product/${p.id}`} className="block">
                  <img
                    src={imgUrl(p.image)}
                    alt={`${p.name} - Classic Decor`}
                    title={p.name}
                    className="rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
                <h3 className="text-lg font-semibold mt-2">{p.name}</h3>
                <p className="text-gray-600">PKR {p.price}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="about-overlay-section" aria-label="About Classic Decor">
          <div className="about-overlay">
            <div className="about-card">
              <h2>About Classic Decor</h2>
              <p>
                Our culture is founded on partnership, respect, and passion. From
                the designer who crafts fresh ideas, to the makers who bring them
                to life, to the customers who choose our work for their homes — we
                are united by a commitment to quality acrylic decor. We
                collaborate with care to deliver the very best.
              </p>
            </div>
          </div>
        </section>
      </main>
      <section className="new-arrivals">
        <h2>New Arrivals</h2>
        <div className="arrival-slider">
          <div className="slider-track">
            {newArrivals.map((p, i) => (
              <div className="slide" key={i}>
                <Link to={`/product/${p.id}`}>
                  <img src={imgUrl(p.image)} alt={p.name} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="why-us">
        <h2>Why Choose Classic Decor?</h2>
        <div className="why-grid">
          <div className="why-item">
            <h3>Premium Quality</h3>
            <p>We craft each acrylic product with precision for long-lasting durability.</p>
          </div>
          <div className="why-item">
            <h3>Customized Designs</h3>
            <p>Your ideas, your style — uniquely designed decor just for you.</p>
          </div>
          <div className="why-item">
            <h3>Fast Delivery</h3>
            <p>Delivery available across Pakistan with 100% safety packaging.</p>
          </div>
        </div>
      </section>
      <section className="reviews-section" aria-label="Latest Reviews">
        <div className="reviews-header">
          <div className="reviews-heading">
            <h3>Let customers speak for us</h3>
            <div className="reviews-topline"><span className="stars">★★★★★</span> <span className="from-text">from {summary.count || 0} reviews</span></div>
          </div>
          <div className="reviews-summary">{summary.average || 0}/5</div>
        </div>
        <div className="reviews-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="carousel-viewport">
            <div className="carousel-row">
              {visible.map((rev, i) => {
                const isCenter = latest.length >= 3 && i === 1;
                const prod = products.find(p => String(p.id) === String(rev.productId));
                return (
                  <div className={`carousel-card ${isCenter ? 'center' : ''}`} key={`${rev.title}-${i}-${ri}`}>
                    <div className="review-content">
                      <div className="review-header">
                        <div className="review-avatar">{initials(rev.name)}</div>
                        <div className="review-head-text">
                          <div className="review-title">{rev.title || 'Untitled'}</div>
                          <div className="review-meta"><span className="stars">{starText(rev.rating)}</span> • {rev.name || 'Anonymous'}</div>
                        </div>
                      </div>
                      <div className="review-comment">“{rev.comment || ''}”</div>
                    </div>
                    {prod && prod.image ? (
                      <div className="review-product-img">
                        <img src={imgUrl(prod.image)} alt={prod.name} title={prod.name} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
