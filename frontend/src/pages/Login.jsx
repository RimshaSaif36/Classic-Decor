import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data && data.error ? data.error : 'Login failed');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token || '');
      localStorage.setItem('authToken', data.token || '');
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      localStorage.setItem('currentUser', JSON.stringify(data.user || {}));
      navigate('/');
    } catch {
      setError('Login failed');
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
            <h2>Login</h2>
            <form className="auth-form" onSubmit={onSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && <div style={{ color: '#f44336', marginBottom: '0.5rem' }}>{error}</div>}
              <div className="auth-actions">
                <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
              </div>
              <p style={{ textAlign: 'center', marginTop: '10px' }}>
                No account? <Link to="/register">Register</Link>
              </p>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
