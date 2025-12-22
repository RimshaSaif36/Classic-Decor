import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch(API_BASE + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, adminCode })
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data && data.error ? data.error : 'Registration failed');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token || '');
      localStorage.setItem('authToken', data.token || '');
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      localStorage.setItem('currentUser', JSON.stringify(data.user || {}));
      navigate('/');
    } catch {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header />
      <CategoryNav />
      <main>
        <section className="auth-section">
          <div className="auth-container">
            <h2>Create Account</h2>
            <form className="auth-form" onSubmit={onSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>

              <p style={{ textAlign: 'center', margin: '6px 0' }}>
                <a href="#" onClick={e => { e.preventDefault(); setShowAdmin(v => !v); }}>
                  I have an admin code
                </a>
              </p>
              {showAdmin && (
                <div className="form-group">
                  <label>Admin Code</label>
                  <input value={adminCode} onChange={e => setAdminCode(e.target.value)} placeholder="Enter admin invite code" />
                </div>
              )}

              {error && <div style={{ color: '#f44336', marginBottom: '0.5rem' }}>{error}</div>}
              <div className="auth-actions">
                <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creating...' : 'Register'}</button>
              </div>
              <p style={{ textAlign: 'center', marginTop: '10px' }}>
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
