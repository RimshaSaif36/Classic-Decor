import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config';
import './Profile.css';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ORDER_STATUSES = [
  'pending',
  'approved',
  'completed',
  'paid',
  'shipped',
  'delivered',
  'failed',
  'cancelled',
];

export default function Profile() {
  const [orderMessage, setOrderMessage] = useState('');
  const [cancelingId, setCancelingId] = useState('');
  const [submittingPaymentId, setSubmittingPaymentId] = useState('');
  const [paymentForms, setPaymentForms] = useState({});
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null');
    } catch { return null; }
  });
  const token = (() => {
    try {
      return localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    } catch { return ''; }
  })();
  const [orders, setOrders] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function canCancelOrder(order) {
    const status = String(order && order.paymentStatus ? order.paymentStatus : 'pending').toLowerCase();
    return status === 'pending' || status === 'paid' || status === 'completed';
  }

  function formatStatusLabel(status) {
    const value = String(status || 'pending').toLowerCase();
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function normalizeStatus(status) {
    const value = String(status || 'pending').toLowerCase();
    return ORDER_STATUSES.includes(value) ? value : 'pending';
  }

  function isCustomOrder(order) {
    return String(order?.metadata?.requestType || '').toLowerCase() === 'custom-design' || Boolean(order?.metadata?.needsQuote);
  }

  function hasCustomPaymentDetails(order) {
    return Boolean(String(order?.payment || '').trim()) && String(order?.payment || '').toLowerCase() !== 'custom-design-request'
      && Boolean(String(order?.senderNumber || '').trim())
      && Boolean(String(order?.transactionId || '').trim());
  }

  function canSubmitCustomPayment(order) {
    const status = normalizeStatus(order?.paymentStatus);
    return isCustomOrder(order)
      && Number(order?.total || 0) > 0
      && !hasCustomPaymentDetails(order)
      && !['approved', 'shipped', 'delivered', 'cancelled'].includes(status);
  }

  function getPaymentForm(orderId) {
    return paymentForms[orderId] || { payment: 'jazzcash', senderNumber: '', transactionId: '' };
  }

  function updatePaymentForm(orderId, key, value) {
    setPaymentForms(prev => ({
      ...prev,
      [orderId]: {
        ...getPaymentForm(orderId),
        [key]: value,
      }
    }));
  }

  useEffect(() => {
    if (token) {
      fetch(API_BASE + '/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(u => {
          if (u && typeof u === 'object') {
            setName(u.name || '');
            setPhone(u.phone || '');
            setAddress(u.address || '');
            setCity(u.city || '');
          }
        })
        .catch(() => void 0);
      fetch(API_BASE + '/api/orders/my', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed');
          return res.json();
        })
        .then(setOrders)
        .catch(() => setOrders([]));
    }
  }, [token]);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="profile-section" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
            <h1 className="profile-title">Profile</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              Please log in to view your profile and order history.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const r = await fetch(API_BASE + '/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone, address, city })
      });
      const data = await r.json();
      if (!r.ok) {
        setMessage(data && data.error ? data.error : 'Update failed');
        return;
      }
      const merged = { ...user, name: data.name, phone: data.phone, address: data.address, city: data.city };
      setUser(merged);
      localStorage.setItem('user', JSON.stringify(merged));
      localStorage.setItem('currentUser', JSON.stringify(merged));
      setMessage('Profile updated');
    } catch {
      setMessage('Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(orderId) {
    const confirmed = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmed) return;

    setCancelingId(orderId);
    setOrderMessage('');
    try {
      const r = await fetch(API_BASE + '/api/orders/' + orderId + '/cancel', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      if (!r.ok) {
        setOrderMessage(data && data.error ? data.error : 'Unable to cancel order');
        return;
      }
      setOrders(prev => prev.map(order => (
        String(order._id) === String(orderId)
          ? { ...order, paymentStatus: data.paymentStatus || 'cancelled' }
          : order
      )));
      setOrderMessage('Order cancelled successfully');
    } catch {
      setOrderMessage('Unable to cancel order');
    } finally {
      setCancelingId('');
    }
  }

  async function submitCustomPayment(orderId) {
    const form = getPaymentForm(orderId);
    setSubmittingPaymentId(orderId);
    setOrderMessage('');

    try {
      const r = await fetch(API_BASE + '/api/orders/' + orderId + '/custom-payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) {
        setOrderMessage(data && data.error ? data.error : 'Unable to submit payment details');
        return;
      }
      setOrders(prev => prev.map(order => String(order._id) === String(orderId) ? data : order));
      setPaymentForms(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setOrderMessage('Payment details submitted. Admin can now review and approve your custom order.');
    } catch {
      setOrderMessage('Unable to submit payment details');
    } finally {
      setSubmittingPaymentId('');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <div className="profile-section">
          <div className="profile-container">
            <div className="profile-header">
              <h1 className="profile-title">{user.name}'s Profile</h1>
              <p className="profile-subtitle">Manage your account and view your orders</p>
            </div>
            <div className="profile-grid">
              <div className="profile-card">
                <form onSubmit={saveProfile} className="profile-form">
                  <div className="profile-note">
                    Update your phone number and shipping address here. These details are used for your future orders.
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Name</label>
                      <input value={name} onChange={e=>setName(e.target.value)} className="form-input" />
                    </div>
                    <div className="form-field">
                      <label>Phone</label>
                      <input value={phone} onChange={e=>setPhone(e.target.value)} className="form-input" placeholder="03XXXXXXXXX" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Shipping Address</label>
                      <input value={address} onChange={e=>setAddress(e.target.value)} className="form-input" />
                    </div>
                    <div className="form-field">
                      <label>City</label>
                      <input value={city} onChange={e=>setCity(e.target.value)} className="form-input" />
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    {message && <div className="form-message">{message}</div>}
                  </div>
                </form>
              </div>
              <div className="profile-card">
                <div className="orders-header">
                  <h2 className="section-title">Order History</h2>
                </div>
                {orderMessage && <div className="order-message">{orderMessage}</div>}
                {orders.length === 0 ? (
                  <div className="empty-note">No orders yet.</div>
                ) : (
                  <ul className="order-list">
                    {orders.map((o) => (
                      <li key={o._id} className="order-card">
                        {(() => {
                          const currentStatus = normalizeStatus(o.paymentStatus);

                          return (
                            <>
                        <div className="order-head">
                          <span className="order-id">#{String(o._id).slice(-8)}</span>
                          <span className={"status-badge " + currentStatus}>{formatStatusLabel(currentStatus)}</span>
                        </div>
                        <div className="order-status-track" aria-label="Order status progress">
                          {ORDER_STATUSES.map((status) => (
                            <span
                              key={status}
                              className={"status-step " + status + (currentStatus === status ? ' current' : '')}
                            >
                              {formatStatusLabel(status)}
                            </span>
                          ))}
                        </div>
                        <div className="order-meta">
                          <div className="order-line">
                            <span className="label">Total</span>
                            <span className="value">{Number(o.total || 0) > 0 ? `PKR ${Number(o.total || 0).toLocaleString()}` : 'Quote pending'}</span>
                          </div>
                          <div className="order-line">
                            <span className="label">Date</span>
                            <span className="value">{new Date(o.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="order-line">
                            <span className="label">Phone</span>
                            <span className="value">{o.phone || phone || 'Not provided'}</span>
                          </div>
                          <div className="order-line order-line-wide">
                            <span className="label">Shipping Address</span>
                            <span className="value">{[o.address, o.city].filter(Boolean).join(', ') || [address, city].filter(Boolean).join(', ') || 'Not provided'}</span>
                          </div>
                        </div>
                        {canSubmitCustomPayment(o) && (
                          <div className="custom-payment-box">
                            <h3 className="custom-payment-title">Submit Payment Details</h3>
                            <p className="custom-payment-note">Your custom quote is ready. Submit your payment details here so the admin can approve your order.</p>
                            <div className="custom-payment-grid">
                              <div className="form-field">
                                <label>Payment Method</label>
                                <select
                                  value={getPaymentForm(String(o._id)).payment}
                                  onChange={e => updatePaymentForm(String(o._id), 'payment', e.target.value)}
                                  className="form-input"
                                >
                                  <option value="jazzcash">JazzCash</option>
                                  <option value="easypaisa">EasyPaisa</option>
                                  <option value="bank transfer">Bank Transfer</option>
                                </select>
                              </div>
                              <div className="form-field">
                                <label>Sender Number</label>
                                <input
                                  value={getPaymentForm(String(o._id)).senderNumber}
                                  onChange={e => updatePaymentForm(String(o._id), 'senderNumber', e.target.value)}
                                  className="form-input"
                                  placeholder="03XXXXXXXXX"
                                />
                              </div>
                              <div className="form-field custom-payment-full">
                                <label>Transaction ID</label>
                                <input
                                  value={getPaymentForm(String(o._id)).transactionId}
                                  onChange={e => updatePaymentForm(String(o._id), 'transactionId', e.target.value)}
                                  className="form-input"
                                  placeholder="Enter transaction ID"
                                />
                              </div>
                            </div>
                            <div className="order-actions custom-payment-actions">
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => submitCustomPayment(String(o._id))}
                                disabled={submittingPaymentId === String(o._id)}
                              >
                                {submittingPaymentId === String(o._id) ? 'Submitting…' : 'Submit Payment'}
                              </button>
                            </div>
                          </div>
                        )}
                        {canCancelOrder(o) && (
                          <div className="order-actions">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => cancelOrder(o._id)}
                              disabled={cancelingId === String(o._id)}
                            >
                              {cancelingId === String(o._id) ? 'Cancelling…' : 'Cancel Order'}
                            </button>
                          </div>
                        )}
                            </>
                          );
                        })()}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
