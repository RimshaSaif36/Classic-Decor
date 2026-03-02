import Header from "../components/Header";
import CategoryNav from "../components/CategoryNav";
import Footer from "../components/Footer";
import { API_BASE } from "../lib/config";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { imgUrl } from "../lib/utils";

export default function Home() {
  const [latest, setLatest] = useState([]);
  const [ri, setRi] = useState(0);
  const [paused, setPaused] = useState(false);
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Request only approved reviews from the API when possible
        const r = await fetch(API_BASE + "/api/reviews?onlyApproved=true");
        const list = await r.json();
        // Ensure we only use approved reviews (fallback if API doesn't filter)
        const approved = (Array.isArray(list) ? list : []).filter(rv => (rv.status || 'approved') === 'approved').reverse();
        if (!cancelled) {
          setLatest(approved);
          setLoadingReviews(false);
        }
      } catch (e) {
        console.error(e);
        setLoadingReviews(false);
      }

      try {
        const p = await fetch(API_BASE + "/api/products");
        const plist = await p.json();
        if (!cancelled) {
          setProducts(Array.isArray(plist) ? plist : []);
          // Set featured products dynamically - take first 6 products
          const featured = Array.isArray(plist) ? plist.slice(0, 6) : [];
          setFeaturedProducts(featured);
          setLoadingFeatured(false);
        }
      } catch (e) {
        console.error(e);
        setLoadingFeatured(false);
      }

      try {
        const na = await fetch(API_BASE + "/api/products?sort=newest&limit=10");
        const nalist = await na.json();
        if (!cancelled) setNewArrivals(Array.isArray(nalist) ? nalist : []);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!latest.length) return;
    const id = setInterval(() => {
      if (!paused) setRi((prev) => (prev + 1) % latest.length);
    }, 3000);
    return () => clearInterval(id);
  }, [latest.length, paused]);

  const visible = useMemo(() => {
    const len = latest.length;
    if (len === 0) return [];

    // Show 3 reviews at a time, cycling through all available reviews
    const reviewsPerSlide = Math.min(3, len);

    // If we have fewer than or equal to 3 reviews, show all without repetition
    if (len <= 3) {
      return latest.slice();
    }

    const result = [];
    for (let i = 0; i < reviewsPerSlide; i++) {
      const index = (ri + i) % len;
      result.push(latest[index]);
    }

    return result;
  }, [latest, ri]);

  return (
    <div className="home-page">
      <Header />
      <CategoryNav />
      <main>
        <section className="hero">
          <div className="hero-overlay">
            <div className="hero-content">
              <h1 className="typewriter">
                Bring Art & Elegance to Every Corner
              </h1>
              <p>Modern. Elegant. Handcrafted for your space.</p>
              <Link to="/shop" className="shop-btn">
                Shop Now
              </Link>
            </div>
          </div>
        </section>
        <section className="featured-products">
          <h2>Featured Products</h2>
          <p className="section-subtitle">
            Handpicked selections from our premium collection
          </p>

          {loadingFeatured ? (
            <div className="loading-spinner">
              <p>Loading featured products...</p>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="no-products">
              <p>No featured products available at the moment.</p>
            </div>
          ) : (
            <div className="product-grid">
              {featuredProducts.map((p) => (
                <div className="product-item" key={p.id}>
                  <Link
                    to={`/product/${p._id || p.id}`}
                    className="product-image-wrapper"
                  >
                    {p.saleDiscount > 0 && (
                      <div className="sale-badge-home">{p.saleDiscount}% OFF</div>
                    )}
                    <img
                      src={imgUrl(p.image)}
                      alt={`${p.name} - The Classic Decor`}
                      title={p.name}
                      className="product-image"
                    />
                    <div className="product-overlay">
                      <button className="quick-view-btn">Quick View</button>
                    </div>
                  </Link>
                  <div className="product-item-content">
                    <h3 className="product-name">{p.name}</h3>
                    <p className="product-description">
                      {p.description || "Premium acrylic decor item"}
                    </p>
                    <div className="product-footer">
                      <p className="product-price">
                        {p.saleDiscount > 0 ? (
                          <>
                            <span className="original-price-home">PKR {Number(p.price).toLocaleString()}</span>
                            <span className="sale-price-home">PKR {(p.price - (p.price * p.saleDiscount / 100)).toLocaleString()}</span>
                          </>
                        ) : (
                          <>PKR {Number(p.price || 0).toLocaleString()}</>
                        )}
                      </p>
                      <button
                        className="add-to-cart-btn"
                        onClick={() => {
                          const next = [
                            ...JSON.parse(localStorage.getItem("cart") || "[]"),
                          ];
                          const pid = p._id || p.id || p.slug;
                          const existing = next.find((i) => i.id === pid);
                          if (existing) {
                            existing.quantity = (existing.quantity || 1) + 1;
                          } else {
                            next.push({
                              id: pid,
                              name: p.name,
                              price: Number(p.price) || 0,
                              image: imgUrl(p.image || ""),
                              quantity: 1,
                            });
                          }
                          localStorage.setItem("cart", JSON.stringify(next));
                          const total = next.reduce(
                            (s, i) => s + (i.quantity || 1),
                            0
                          );
                          window.dispatchEvent(
                            new CustomEvent("cart-updated", {
                              detail: { total },
                            })
                          );

                          const m = document.createElement("div");
                          m.className = "cart-message success";
                          m.textContent = "Added to cart!";
                          document.body.appendChild(m);
                          setTimeout(() => m.remove(), 2800);
                        }}
                      >
                        <i className="fas fa-shopping-cart"></i> Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="featured-cta">
            <Link to="/shop" className="view-all-btn">
              View All Products
            </Link>
          </div>
        </section>
        <section
          className="about-overlay-section"
          aria-label="About The Classic Decor"
        >
          <div className="about-overlay">
            <div className="about-card">
              <h2>About The Classic Decor</h2>
              <p>
                Our culture is founded on partnership, respect, and passion.
                From the designer who crafts fresh ideas, to the makers who
                bring them to life, to the customers who choose our work for
                their homes we are united by a commitment to quality acrylic
                decor. We collaborate with care to deliver the very best.
              </p>
            </div>
          </div>
        </section>
      </main>
      <section className="new-arrivals">
        <h2>New Arrivals</h2>
        <div className="arrival-slider">
          <div className="slider-track">
            {newArrivals.map((p) => (
              <div className="slide" key={p._id || p.id}>
                <Link to={`/product/${p._id || p.id}`}>
                  <img src={imgUrl(p.image)} alt={p.name} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="why-us">
        <div className="why-us-container">
          <div className="why-us-header">
            <h2>Why Choose The Classic Decor?</h2>
            <p>Experience excellence in every detail with our premium acrylic decor solutions</p>
          </div>
          <div className="why-grid">
            <div className="why-item">
              <div className="why-icon">
                <i className="fas fa-award"></i>
              </div>
              <h3>Premium Quality</h3>
              <p>
                Crafted with premium grade acrylic materials, ensuring durability, clarity, and long-lasting elegance for your space.
              </p>
            </div>
            <div className="why-item">
              <div className="why-icon">
                <i className="fas fa-shipping-fast"></i>
              </div>
              <h3>Fast & Safe Delivery</h3>
              <p>
                Nationwide delivery across Pakistan with premium packaging and tracking, ensuring your items arrive safely and on time.
              </p>
            </div>
            <div className="why-item">
              <div className="why-icon">
                <i className="fas fa-palette"></i>
              </div>
              <h3>Custom Designs</h3>
              <p>
                Personalized acrylic solutions tailored to your unique style and requirements with professional design consultation.
              </p>
            </div>
            <div className="why-item">
              <div className="why-icon">
                <i className="fas fa-headset"></i>
              </div>
              <h3>24/7 Support</h3>
              <p>
                Dedicated customer support team available round the clock to assist you with orders, queries, and after-sales service.
              </p>
            </div>
            <div className="why-item">
              <div className="why-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Quality Guarantee</h3>
              <p>
                100% satisfaction guarantee with quality assurance on all products and hassle-free return policy for your peace of mind.
              </p>
            </div>
            <div className="why-item">
              <div className="why-icon">
                <i className="fas fa-tools"></i>
              </div>
              <h3>Expert Craftsmanship</h3>
              <p>
                Handcrafted by skilled artisans with years of experience in acrylic fabrication and modern design techniques.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="reviews-section" aria-label="Latest Reviews">
        <div className="reviews-header">
          <h3>Let customers speak for us</h3>
        </div>
        
        {loadingReviews ? (
          <div className="reviews-loading">
            <div className="loading-spinner">Loading customer reviews...</div>
          </div>
        ) : latest.length === 0 ? (
          <div className="no-reviews">
            <p>No reviews available yet. Be the first to leave a review!</p>
          </div>
        ) : (
          <>
            <div
              className="reviews-carousel-wrapper"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <button
                className="carousel-arrow carousel-arrow-prev"
                onClick={() => setRi((prev) => (prev - 1 + latest.length) % latest.length)}
                aria-label="Previous reviews"
              >
                &lt;
              </button>
              <div className="reviews-carousel">
                <div className="carousel-row" data-animation={ri}>
                  {visible.map((rev, i) => {
                    const pid = String(rev.productId || '');
                    const prod = products.find((p) => {
                      const candidates = [p._id, p.id, p.slug].map(v => String(v || ''));
                      return candidates.includes(pid);
                    });
                    return (
                      <div
                        className="carousel-card"
                        key={`${rev._id || rev.id}-${i}-${ri}`}
                      >
                        {prod && prod.image && (
                          <div className="review-card-image">
                            <img
                              src={imgUrl(prod.image)}
                              alt={prod.name}
                              title={prod.name}
                            />
                          </div>
                        )}
                        <div className="review-card-content">
                          <div className="review-card-title">
                            {rev.title || "Review"}
                          </div>
                          <div className="review-card-comment">
                            "{rev.comment || ""}"
                          </div>
                          {prod && (
                            <div className="review-product-info">
                              {prod.name}
                            </div>
                          )}
                          <div className="review-card-author">
                            {rev.name || "Anonymous"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                className="carousel-arrow carousel-arrow-next"
                onClick={() => setRi((prev) => (prev + 1) % latest.length)}
                aria-label="Next reviews"
              >
                &gt;
              </button>
            </div>
            {/* Progress indicators */}
            {latest.length > 3 && (
              <div className="carousel-indicators">
                {Array.from({ length: latest.length }, (_, index) => (
                  <button
                    key={index}
                    className={`indicator-dot ${ri % latest.length === index ? 'active' : ''}`}
                    onClick={() => setRi(index)}
                    aria-label={`Go to review ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
      <Footer />
    </div>
  );
}
