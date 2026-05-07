import Header from '../components/Header';
import Footer from '../components/Footer';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeShipping, getEffectivePrice, imgUrl } from '../lib/utils';

function formatPrice(n) {
  return Number(n || 0);
}

function getCartItemKey(item) {
  return [item.id, item.size || '', item.color || ''].join('::');
}

function effectivePrice(item) {
  return getEffectivePrice(item && (item.basePrice ?? item.price), item && item.saleDiscount, item && item.size);
}

export default function Cart() {
  const [cart, setCart] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem('cart') || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof window !== 'undefined' && typeof window.updateCartCount === 'function') {
      window.updateCartCount();
    }
    try {
      const total = cart.reduce((s, i) => s + (i.quantity || 1), 0);
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { total } }));
    } catch { void 0; }
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, i) => sum + effectivePrice(i) * (i.quantity || 1), 0);
  }, [cart]);
  const shipping = computeShipping(subtotal);
  const tax = 0;
  const total = subtotal + shipping;
  const itemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cart]);

  function inc(itemKey) {
    setCart(prev => prev.map(i => getCartItemKey(i) === itemKey ? { ...i, quantity: (i.quantity || 1) + 1 } : i));
  }
  function dec(itemKey) {
    setCart(prev => prev.map(i => getCartItemKey(i) === itemKey ? { ...i, quantity: Math.max(1, (i.quantity || 1) - 1) } : i));
  }
  function remove(itemKey) {
    setCart(prev => prev.filter(i => getCartItemKey(i) !== itemKey));
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <div className="cart-page">
      <Header />
      <main>
        <div className="cart-container">
          <div className="cart-hero">
            <div>
              <h1 className="cart-title">Shopping Cart</h1>
            </div>
            <div className="cart-hero-stats">
              <div className="cart-stat-card">
                <span className="cart-stat-label">Items</span>
                <strong className="cart-stat-value">{itemCount}</strong>
              </div>
              <div className="cart-stat-card">
                <span className="cart-stat-label">Subtotal</span>
                <strong className="cart-stat-value">PKR {subtotal.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div className="cart-layout">
            <section className="cart-list-panel">
              <div className="cart-panel-header">
                <div>
                  <h2>Your Cart</h2>
                </div>
                {cart.length > 0 && (
                  <button type="button" className="cart-clear-btn" onClick={clearCart}>Clear Cart</button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="cart-empty-icon">
                    <i className="fa-solid fa-bag-shopping"></i>
                  </div>
                  <h3>Your cart is empty</h3>
                  <p>Browse the collection and add your favorite decor pieces to continue.</p>
                  <Link to="/shop" className="cart-empty-link">Start Shopping</Link>
                </div>
              ) : (
                <div className="cart-items-modern">
                  {cart.map((item) => {
                    const itemKey = getCartItemKey(item);
                    const unitPrice = effectivePrice(item);
                    const lineTotal = unitPrice * (item.quantity || 1);

                    return (
                      <article className="cart-item-card" key={itemKey}>
                        <div className="cart-item-media">
                          <img src={imgUrl(item.image)} alt={item.name} title={item.name} />
                        </div>

                        <div className="cart-item-body">
                          <div className="cart-item-topline">
                            <div>
                              <h3 className="cart-item-name">{item.name}</h3>
                              <div className="cart-item-variants">
                                <span className="cart-variant-pill">Size: {item.size || 'Not selected'}</span>
                                <span className="cart-variant-pill">Color: {item.color || 'Not selected'}</span>
                              </div>
                            </div>
                            <div className="cart-item-pricing">
                              <span className="cart-unit-price">PKR {unitPrice.toLocaleString()}</span>
                              <strong className="cart-line-total">PKR {lineTotal.toLocaleString()}</strong>
                            </div>
                          </div>

                          <div className="cart-item-footer">
                            <div className="quantity-control modern">
                              <button className="quantity-btn" onClick={() => dec(itemKey)} aria-label={`Decrease quantity of ${item.name}`}>-</button>
                              <input className="quantity" value={item.quantity || 1} readOnly aria-label={`Quantity of ${item.name}`} />
                              <button className="quantity-btn" onClick={() => inc(itemKey)} aria-label={`Increase quantity of ${item.name}`}>+</button>
                            </div>

                            <button className="remove-item" onClick={() => remove(itemKey)}>
                              <i className="fa-regular fa-trash-can"></i>
                              Remove
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="cart-summary modern">
              <h3 className="summary-title">Order Summary</h3>
              <div className="summary-details">
                <p><span>Subtotal</span><span className="subtotal-price">PKR {subtotal.toLocaleString()}</span></p>
                <p><span>Shipping</span><span className="shipping-price">PKR {shipping.toLocaleString()}</span></p>
                <p><span>Tax</span><span>PKR {tax.toLocaleString()}</span></p>
                <h4 className="total-price"><span>Total</span><span>PKR {total.toLocaleString()}</span></h4>
              </div>
              <Link to="/checkout" className="checkout-button">Proceed to Checkout</Link>
              <Link to="/shop" className="continue-shopping-link">Continue Shopping</Link>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
