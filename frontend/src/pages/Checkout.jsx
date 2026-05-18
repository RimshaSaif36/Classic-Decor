import Header from '../components/Header';
import Footer from '../components/Footer';
import Notification from '../components/Notification';
import { API_BASE } from '../lib/config';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pushGtmEcommerceEvent } from '../lib/gtm';
import { computeShipping, getEffectivePrice } from '../lib/utils';

function effectivePrice(item) {
  return getEffectivePrice(item && (item.basePrice ?? item.price), item && item.saleDiscount, item && item.size);
}

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem('cart') || '[]');
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  });
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [payment, setPayment] = useState('cod');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const hasTrackedCheckoutRef = useRef(false);

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + effectivePrice(i) * (i.quantity || 1), 0),
    [cart]
  );
  // Free shipping for orders above PKR 5,000
  const shippingPrice = computeShipping(subtotal);
  const total = subtotal + shippingPrice;

  useEffect(() => {
    // Redirect to cart if it's empty
    if (Array.isArray(cart) && cart.length === 0) {
      setNotification({
        message: 'Your cart is empty! Redirecting to cart...',
        type: 'warning',
        duration: 2000
      });
      const timer = setTimeout(() => {
        navigate('/cart', { replace: true });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cart, navigate]);

  useEffect(() => {
    if (hasTrackedCheckoutRef.current || !Array.isArray(cart) || cart.length === 0) {
      return;
    }

    pushGtmEcommerceEvent('InitiateCheckout', {
      entity: cart[0],
      value: total,
      items: cart,
    });
    hasTrackedCheckoutRef.current = true;
  }, [cart, total]);

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

  function removeItem(item){
    setCart(prev => prev.filter(i => !(
      i.id === item.id &&
      String(i.size || '') === String(item.size || '') &&
      String(i.color || '') === String(item.color || '')
    )));
  }

  useEffect(() => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      if (!token) return;
      fetch(API_BASE + '/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(u => {
          if (u && typeof u === 'object') {
            if (u.name) setName(prev => prev || u.name);
            if (u.email) setEmail(prev => prev || u.email);
            if (u.phone) setPhone(prev => prev || u.phone);
            if (u.address) setAddress(prev => prev || u.address);
            if (u.city) setCity(prev => prev || u.city);
          }
        })
        .catch(() => void 0);
    } catch { void 0; }
  }, []);

  async function placeOrder(e){
    e.preventDefault();
    const newErrors = {};
    
    // Validate required fields
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim();
    const cleanPhone = String(phone || '').trim();
    const cleanAddress = String(address || '').trim();
    const cleanCity = String(city || '').trim();

    if (!cleanName) newErrors.name = 'Name is required';
    
    if (!cleanEmail) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = 'Email must be valid';
    }
    
    if (!cleanPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(03|\+923|\+92 3)\d{9}$|^03\d{9}$/.test(cleanPhone)) {
      newErrors.phone = 'Phone number must be 11 digits (03XXXXXXXXX)';
    }
    
    if (!cleanAddress) {
      newErrors.address = 'Address is required';
    } else if (cleanAddress.length < 5) {
      newErrors.address = 'Address must be at least 5 characters';
    }
    
    if (!cleanCity) newErrors.city = 'City is required';
    
    if (!Array.isArray(cart) || cart.length === 0) return alert('Your cart is empty');
    const invalidCartItems = cart.filter(item => !String(item.size || '').trim() || !String(item.color || '').trim());
    if (invalidCartItems.length > 0) {
      newErrors.cart = `Please select size and color for: ${invalidCartItems.map(item => item.name || 'item').join(', ')}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert(Object.values(newErrors).join('\n'));
      return;
    }

    if ((payment === 'jazzcash' || payment === 'easypaisa') && (!senderNumber || !transactionId)) {
      return alert('Enter Payment Number and Transaction ID.');
    }
    setPlacing(true);
    setErrors({});
    try {
      const cleanPhoneNumbers = cleanPhone.replace(/[^\d+]/g, '').trim();
      const payload = {
        name: cleanName, address: cleanAddress, city: cleanCity, phone: cleanPhoneNumbers, email: cleanEmail,
        payment,
        senderNumber: payment === 'card' || payment === 'cod' ? '' : senderNumber,
        transactionId: payment === 'card' || payment === 'cod' ? '' : transactionId,
        items: cart,
        subtotal,
        shipping: shippingPrice,
        total,
        createdAt: new Date().toISOString(),
      };

      // If payment is Card (PayFast), initiate and redirect
      if (payment === 'card') {
        const r = await fetch(API_BASE + '/payfast/initiate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, cart })
        });
        const data = await r.json().catch(() => ({}));
        if (data && data.url) {
          localStorage.setItem('lastOrder', JSON.stringify(payload));
          window.location.href = data.url;
          return;
        }
        const errMsg = (data && data.error) ? data.error : 'Failed to initiate PayFast';
        alert('PayFast Error: ' + errMsg);
        return;
      }

      // Create regular order (COD / JazzCash / EasyPaisa)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const r = await fetch(API_BASE + '/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const t = await r.text().catch(()=> '');
        let msg = t;
        try {
          const j = JSON.parse(t);
          msg = (j && j.error) ? j.error : t;
        } catch { void 0; }
        alert(msg || 'Failed to place order');
        return;
      }
      const createdOrder = await r.json().catch(() => null);
      if (createdOrder && typeof createdOrder === 'object' && createdOrder.success === false) {
        alert(createdOrder.error || 'Failed to place order');
        return;
      }
      const successfulOrder = createdOrder && typeof createdOrder === 'object'
        ? {
            ...payload,
            ...createdOrder,
            items: Array.isArray(createdOrder.items) ? createdOrder.items : payload.items
          }
        : payload;
      pushGtmEcommerceEvent('Purchase', {
        entity: successfulOrder,
        id: successfulOrder.transactionId || successfulOrder.orderId || successfulOrder._id || successfulOrder.id,
        value: successfulOrder.total ?? payload.total,
        shipping: successfulOrder.shipping ?? payload.shipping,
        items: Array.isArray(successfulOrder.items) ? successfulOrder.items : payload.items
      });
      localStorage.setItem('lastOrder', JSON.stringify(successfulOrder));
      setCart([]);
      setName(''); setAddress(''); setCity(''); setPhone(''); setEmail(''); setPayment('cod'); setSenderNumber(''); setTransactionId('');
      navigate('/success');
    } catch (err) {
      console.error(err);
      alert('Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="checkout-page">
      <Header />
      <main>
        <div className="checkout-container">
          <h2>Checkout</h2>

          <div className="checkout-layout">
            <form id="checkout-form" className="checkout-form" onSubmit={placeOrder}>
              <div className="checkout-section-heading">
                <h3>Shipping Address</h3>
              </div>
              {errors.cart && <div className="checkout-alert">{errors.cart}</div>}
              <div className="checkout-fields-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input placeholder="Enter full name" value={name} onChange={e=>setName(e.target.value)} required className={errors.name ? 'has-error' : ''} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="Enter email" value={email} onChange={e=>setEmail(e.target.value)} required className={errors.email ? 'has-error' : ''} />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input placeholder="Enter phone" value={phone} onChange={e=>setPhone(e.target.value)} required className={errors.phone ? 'has-error' : ''} />
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label>Address</label>
                <input placeholder="Enter address" value={address} onChange={e=>setAddress(e.target.value)} required className={errors.address ? 'has-error' : ''} />
                {errors.address && <span className="field-error">{errors.address}</span>}
              </div>
              <div className="form-group">
                <label>City</label>
                <input placeholder="Enter city" value={city} onChange={e=>setCity(e.target.value)} required className={errors.city ? 'has-error' : ''} />
                {errors.city && <span className="field-error">{errors.city}</span>}
              </div>
              <div className="form-group checkout-field-full"><label>Payment Option</label>
                <select value={payment} onChange={e=>setPayment(e.target.value)}>
                  <option value="cod">Cash on Delivery</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                </select>
              </div>
              </div>
            {(payment === 'jazzcash' || payment === 'easypaisa') && (
              <div className="checkout-payment-box">
                <p className="checkout-payment-note">Send payment to JazzCash / EasyPaisa: <strong>03003395535</strong></p>
                <div className="form-group"><label>Your JazzCash/EasyPaisa Number</label><input value={senderNumber} onChange={e=>setSenderNumber(e.target.value)} placeholder="03XXXXXXXXX" /></div>
                <div className="form-group"><label>Transaction ID</label><input value={transactionId} onChange={e=>setTransactionId(e.target.value)} placeholder="Enter transaction ID" /></div>
              </div>
            )}
            <button type="submit" className="place-order-btn" disabled={placing}>{placing ? 'Placing...' : 'Place Order'}</button>
            </form>

            <aside className="checkout-summary-panel">
              <h3>Order Summary</h3>
              <div className="checkout-summary-items">
                {cart.length === 0 ? (
                  <p className="checkout-empty-text">Your cart is empty.</p>
                ) : (
                  cart.map(i => (
                    <div className="checkout-summary-item" key={`${i.id}-${i.size || ''}-${i.color || ''}`}>
                      <div className="checkout-summary-item-main">
                        <div>
                          <div className="checkout-item-name">{i.name}</div>
                          <div className="checkout-item-meta">Qty: {i.quantity || 1}</div>
                          {i.size && <div className="checkout-item-meta">Size: {i.size}</div>}
                          {i.color && <div className="checkout-item-meta">Color: {i.color}</div>}
                        </div>
                        <div className="checkout-item-price">PKR {(effectivePrice(i) * (i.quantity || 1)).toLocaleString()}</div>
                      </div>
                      <button type="button" className="checkout-remove-btn" onClick={() => removeItem(i)}>Remove</button>
                    </div>
                  ))
                )}
              </div>
              <div className="checkout-totals">
                <p><span>Subtotal</span><span className="subtotal-price">PKR {subtotal.toLocaleString()}</span></p>
                <p><span>Shipping</span><span className="shipping-price">PKR {shippingPrice.toLocaleString()}</span></p>
                <p className="checkout-total-row"><span>Total</span><span className="total-price">PKR {total.toLocaleString()}</span></p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
