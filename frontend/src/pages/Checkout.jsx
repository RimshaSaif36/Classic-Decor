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
  const [payment, setPayment] = useState('cod');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [placing, setPlacing] = useState(false);

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

  async function placeOrder(e){
    e.preventDefault();
    if (!Array.isArray(cart) || cart.length === 0) return alert('Your cart is empty');
    if ((payment === 'jazzcash' || payment === 'easypaisa') && (!senderNumber || !transactionId)) {
      return alert('Enter Payment Number and Transaction ID.');
    }
    setPlacing(true);
    try {
      const payload = {
        name, address, phone,
        payment,
        senderNumber: payment === 'card' || payment === 'cod' ? '' : senderNumber,
        transactionId: payment === 'card' || payment === 'cod' ? '' : transactionId,
        items: cart,
        subtotal,
        shipping: shippingPrice,
        total,
        createdAt: new Date().toISOString(),
      };

      // If payment is Card (Stripe), create a checkout session and redirect
      if (payment === 'card') {
        const r = await fetch(API_BASE + '/create-checkout-session', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, cart })
        });
        const data = await r.json().catch(() => ({}));
        if (data && data.url) {
          localStorage.setItem('lastOrder', JSON.stringify(payload));
          window.location.href = data.url;
          return;
        }
        const errMsg = (data && data.error) ? data.error : 'Failed to create Stripe session';
        alert('Stripe Error: ' + errMsg);
        return;
      }

      // Fallback: create regular order (COD / JazzCash / EasyPaisa)
      const r = await fetch(API_BASE + '/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const t = await r.text().catch(()=> '');
        alert(t || 'Failed to place order');
        return;
      }
      alert('Order placed successfully');
      setCart([]);
      setName(''); setAddress(''); setPhone(''); setPayment('cod'); setSenderNumber(''); setTransactionId('');
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
                <div className="checkout-cart-item" key={i.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <div className="item-name">{i.name} x {i.quantity || 1}</div>
                  <div className="item-price">PKR {(Number(i.price)||0) * (i.quantity||1)}</div>
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
            <div className="form-group"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} required /></div>
            <div className="form-group"><label>Address</label><input value={address} onChange={e=>setAddress(e.target.value)} required /></div>
            <div className="form-group"><label>Phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} required /></div>
            <div className="form-group"><label>Payment Option</label>
              <select value={payment} onChange={e=>setPayment(e.target.value)}>
                <option value="cod">Cash on Delivery</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="card">Card (Stripe)</option>
              </select>
            </div>
            {(payment === 'jazzcash' || payment === 'easypaisa') && (
              <div style={{ marginTop: 15 }}>
                <p style={{ color: 'green', fontWeight: 'bold' }}>Send payment to this number: JazzCash / EasyPaisa: <span style={{ color: '#000', fontSize: 18 }}>03074040767</span></p>
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
