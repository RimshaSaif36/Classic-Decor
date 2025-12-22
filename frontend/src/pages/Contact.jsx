import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { useState } from 'react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div>
      <Header />
      <CategoryNav />
      <main>
        <section className="auth-section">
          <div className="auth-container">
            <h2>Contact Us</h2>
            {!sent ? (
              <form className="auth-form" onSubmit={submit}>
                <div className="form-group">
                  <label>Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} required />
                </div>
                <div className="auth-actions">
                  <button type="submit" className="submit-btn">Send</button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center' }}>Thanks for contacting us. We will reach out soon.</div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
