import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { useEffect, useMemo, useState } from 'react';
import { imgUrl } from '../lib/utils';

function formatPrice(n) {
  return Number(n || 0);
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
    return cart.reduce((sum, i) => sum + formatPrice(i.price) * (i.quantity || 1), 0);
  }, [cart]);
  const shipping = 200;
  const total = subtotal + shipping;

  function inc(id) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: (i.quantity || 1) + 1 } : i));
  }
  function dec(id) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, (i.quantity || 1) - 1) } : i));
  }
  function remove(id) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="cart-page">
      <Header />
      <CategoryNav />
      <main>
        <div className="cart-container">
          <h2>Your Shopping Cart</h2>
          <div className="cart-table">
            <div className="cart-table-header">
              <div className="header-product">Product</div>
              <div className="header-price">Price</div>
              <div className="header-quantity">Quantity</div>
              <div className="header-total">Total</div>
              <div className="header-remove"></div>
            </div>
            <div className="cart-items">
              {cart.map(i => (
                <div className="cart-item-row" key={i.id}>
                  <div className="product-info-cell">
                    <img src={imgUrl(i.image)} alt={i.name} title={i.name} />
                    <div className="item-name">{i.name}</div>
                  </div>
                  <div className="item-price">PKR {formatPrice(i.price)}</div>
                  <div className="quantity-control">
                    <button className="quantity-btn" onClick={() => dec(i.id)}>-</button>
                    <input className="quantity" value={i.quantity || 1} readOnly />
                    <button className="quantity-btn" onClick={() => inc(i.id)}>+</button>
                  </div>
                  <div className="item-total-cell">PKR {formatPrice(i.price) * (i.quantity || 1)}</div>
                  <button className="remove-item" onClick={() => remove(i.id)}>Remove</button>
                </div>
              ))}
              {cart.length === 0 && <div className="cart-item-row">Your cart is empty</div>}
            </div>
          </div>

          <div className="cart-summary">
            <h3 className="summary-title">Cart Summary</h3>
            <div className="summary-details">
              <p>Subtotal: <span className="subtotal-price">PKR {subtotal}</span></p>
              <p>Shipping: <span className="shipping-price">PKR {shipping}</span></p>
              <h4 className="total-price">Total: <span>PKR {total}</span></h4>
            </div>
            <a href="/checkout" className="checkout-button">Proceed to Checkout</a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
