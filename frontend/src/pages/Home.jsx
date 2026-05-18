import Header from "../components/Header";
import Footer from "../components/Footer";
import { API_BASE } from "../lib/config";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { pushGtmEcommerceEvent } from "../lib/gtm";
import { addProductToCart, getEffectivePrice, imgUrl } from "../lib/utils";

export default function Home() {
  const [latest, setLatest] = useState([]);
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
          const featured = Array.isArray(plist) ? plist.slice(0, 10) : [];
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

  const reviewCards = useMemo(
    () =>
      latest.map((rev, index) => {
        const pid = String(rev.productId || "");
        const prod = products.find((p) => {
          const candidates = [p._id, p.id, p.slug].map((value) => String(value || ""));
          return candidates.includes(pid);
        });

        return {
          rev,
          prod,
          key: `${rev._id || rev.id || index}-${index}`,
        };
      }),
    [latest, products]
  );

  const marqueeReviews = useMemo(() => {
    if (!reviewCards.length) return [];
    return [...reviewCards, ...reviewCards];
  }, [reviewCards]);

  const reviewAnimationDuration = useMemo(() => {
    const baseCount = Math.max(reviewCards.length, 3);
    return `${baseCount * 8}s`;
  }, [reviewCards.length]);

  function showCartMessage(message, type = "success") {
    const existing = document.querySelector(".cart-message");
    if (existing) existing.remove();
    const m = document.createElement("div");
    m.className = `cart-message ${type}`;
    m.textContent = message;
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 2800);
  }

  function requireProductOptions(product) {
    const added = addProductToCart(product);
    if (added) {
      const gtmPrice = getEffectivePrice(product?.price, product?.saleDiscount, added.sizeLabel);
      pushGtmEcommerceEvent("AddToCart", {
        entity: product,
        id: added.productId,
        value: gtmPrice,
        items: [{ ...product, productId: added.productId, quantity: 1, size: added.sizeLabel, sizeLabel: added.sizeLabel, color: added.colorLabel, colorLabel: added.colorLabel }],
      });
    }
    showCartMessage(
      added ? "Added to cart" : "Unable to add this product to cart",
      added ? "success" : "error",
    );
  }

  return (
    <div className="home-page">
      <Header />
      <main>
        <section className="hero" id="home-hero">
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
              {featuredProducts.map((p, index) => (
                <div className="product-item" key={p._id || p.id || p.slug || `${p.name || 'product'}-${index}`}>
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
                        onClick={() => requireProductOptions(p)}
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
        
      </main>
      <section className="new-arrivals">
        <h2>New Arrivals</h2>
        <div className="arrival-slider">
          <div className="slider-track">
            {newArrivals.map((p, index) => (
              <div className="slide" key={p._id || p.id || p.slug || `${p.name || 'arrival'}-${index}`}>
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
              <Link to="/custom-design" className="why-cta-link">Start a custom request</Link>
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
            <div className="reviews-carousel-wrapper">
              <div className="reviews-carousel">
                <div
                  className="carousel-track"
                  style={{ "--review-scroll-duration": reviewAnimationDuration }}
                >
                  {marqueeReviews.map(({ rev, prod, key }, index) => {
                    return (
                      <div
                        className="carousel-card"
                        key={`${key}-${index}`}
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
            </div>
          </>
        )}
      </section>
      <Footer />
    </div>
  );
}
