import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config';
import './Profile.css';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Profile() {
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
                      <label>Address</label>
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
                {orders.length === 0 ? (
                  <div className="empty-note">No orders yet.</div>
                ) : (
                  <ul className="order-list">
                    {orders.map((o) => (
                      <li key={o._id} className="order-card">
                        <div className="order-head">
                          <span className="order-id">#{String(o._id).slice(-8)}</span>
                          <span className={"status-badge " + String(o.paymentStatus || 'pending').toLowerCase()}>{o.paymentStatus}</span>
                        </div>
                        <div className="order-meta">
                          <div className="order-line">
                            <span className="label">Total</span>
                            <span className="value">PKR {Number(o.total || 0).toLocaleString()}</span>
                          </div>
                          <div className="order-line">
                            <span className="label">Date</span>
                            <span className="value">{new Date(o.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
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
