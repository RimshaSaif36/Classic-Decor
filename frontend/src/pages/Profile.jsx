import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config';

export default function Profile() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null');
    } catch { return null; }
  });
  const [orders, setOrders] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user && user.token) {
      fetch(API_BASE + '/api/users/me', {
        headers: { Authorization: `Bearer ${user.token}` }
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
        headers: { Authorization: `Bearer ${user.token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed');
          return res.json();
        })
        .then(setOrders)
        .catch(() => setOrders([]));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="profile-page p-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p>Please log in to view your profile and order history.</p>
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
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
    <div className="profile-page p-4">
      <h1 className="text-2xl font-bold">{user.name}'s Profile</h1>
      <form onSubmit={saveProfile} className="mt-4" style={{ maxWidth: 520 }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Phone</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} className="border p-2 w-full" placeholder="03XXXXXXXXX" />
          </div>
          <div>
            <label className="block text-sm mb-1">Address</label>
            <input value={address} onChange={e=>setAddress(e.target.value)} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">City</label>
            <input value={city} onChange={e=>setCity(e.target.value)} className="border p-2 w-full" />
          </div>
        </div>
        <button type="submit" className="mt-3 border p-2 rounded bg-black text-white" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {message && <div className="mt-2 text-sm">{message}</div>}
      </form>
      <h2 className="text-xl mt-4">Order History</h2>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <ul className="mt-2">
          {orders.map((o) => (
            <li key={o._id} className="border-b py-2">
              <div>Order ID: {o._id}</div>
              <div>Total: PKR {o.total}</div>
              <div>Status: {o.paymentStatus}</div>
              <div>Date: {new Date(o.createdAt).toLocaleDateString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
