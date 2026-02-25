import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useMemo, useState } from 'react';

export default function Checkout() {
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

  const shippingPrice = 200;
  const subtotal = useMemo(() => cart.reduce((s, i) => s + (Number(i.price)||0) * (i.quantity||1), 0), [cart]);
  const total = subtotal + shippingPrice;

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
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert(Object.values(newErrors).join('\n'));
      return;
    }
    
    if (!Array.isArray(cart) || cart.length === 0) return alert('Your cart is empty');
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
      alert('Order placed successfully');
      setCart([]);
      setName(''); setAddress(''); setCity(''); setPhone(''); setEmail(''); setPayment('cod'); setSenderNumber(''); setTransactionId('');
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
      <CategoryNav />
      <main>
        <div className="checkout-container">
          <h2>Checkout</h2>

          <div className="checkout-cart">
            <h3>Your Cart</h3>
            <div className="cart-items">
              {cart.length === 0 && <p>Your cart is empty.</p>}
              {cart.map(i => (
                <div className="checkout-cart-item" key={`${i.id}-${i.size || ''}-${i.color || ''}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <div className="item-name">{i.name} x {i.quantity || 1}</div>
                  {i.size && <div className="item-size">Size: {i.size}</div>}
                  {i.color && <div className="item-color">Color: {i.color}</div>}
                  <div className="item-price">PKR {(Number(i.price)||0) * (i.quantity||1)}</div>
                  <button onClick={() => removeItem(i)} style={{ justifySelf: 'end', color: '#c62828', background: 'transparent', border: 'none', cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <p>Subtotal: <span className="subtotal-price">PKR {subtotal}</span></p>
              <p>Shipping: <span className="shipping-price">PKR {shippingPrice}</span></p>
              <p><strong>Total: <span className="total-price">PKR {total}</span></strong></p>
            </div>
          </div>

          <form id="checkout-form" className="checkout-form" onSubmit={placeOrder}>
            <h3>Billing Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label>Name</label>
                <input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required style={{ borderColor: errors.name ? '#c62828' : undefined }} />
                {errors.name && <span style={{ color: '#c62828', fontSize: 12 }}>{errors.name}</span>}
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} required style={{ borderColor: errors.email ? '#c62828' : undefined }} />
                {errors.email && <span style={{ color: '#c62828', fontSize: 12 }}>{errors.email}</span>}
              </div>
              <div className="form-group">
                <label>Address</label>
                <input placeholder="Street, area" value={address} onChange={e=>setAddress(e.target.value)} required style={{ borderColor: errors.address ? '#c62828' : undefined }} />
                {errors.address && <span style={{ color: '#c62828', fontSize: 12 }}>{errors.address}</span>}
              </div>
              <div className="form-group">
                <label>City</label>
                <input placeholder="City" value={city} onChange={e=>setCity(e.target.value)} required style={{ borderColor: errors.city ? '#c62828' : undefined }} />
                {errors.city && <span style={{ color: '#c62828', fontSize: 12 }}>{errors.city}</span>}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input placeholder="03XXXXXXXXX" value={phone} onChange={e=>setPhone(e.target.value)} required style={{ borderColor: errors.phone ? '#c62828' : undefined }} />
                {errors.phone && <span style={{ color: '#c62828', fontSize: 12 }}>{errors.phone}</span>}
              </div>
              <div className="form-group"><label>Payment Option</label>
                <select value={payment} onChange={e=>setPayment(e.target.value)}>
                  <option value="cod">Cash on Delivery</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                </select>
              </div>
            </div>
            {(payment === 'jazzcash' || payment === 'easypaisa') && (
              <div style={{ marginTop: 15 }}>
                <p style={{ color: 'green', fontWeight: 'bold' }}>Send payment to this number: JazzCash / EasyPaisa: <span style={{ color: '#000', fontSize: 18 }}>03003395535</span></p>
                <div className="form-group"><label>Your JazzCash/EasyPaisa Number</label><input value={senderNumber} onChange={e=>setSenderNumber(e.target.value)} placeholder="03XXXXXXXXX" /></div>
                <div className="form-group"><label>Transaction ID</label><input value={transactionId} onChange={e=>setTransactionId(e.target.value)} placeholder="Enter Transaction ID" /></div>
              </div>
            )}
            <button type="submit" className="place-order-btn" disabled={placing}>{placing ? 'Placing...' : 'Place Order'}</button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
