import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config';

export default function Profile() {
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null');
    } catch { return null; }
  });
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user && user.token) {
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

  return (
    <div className="profile-page p-4">
      <h1 className="text-2xl font-bold">{user.name}'s Profile</h1>
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