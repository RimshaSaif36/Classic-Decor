import Header from '../components/Header';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useState } from 'react';

export default function CustomDesign() {
  const token = (() => {
    try {
      return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
    } catch {
      return '';
    }
  })();

  const [form, setForm] = useState({
    productType: '',
    preferredSize: '',
    preferredColor: '',
    quantity: '1',
    budget: '',
    notes: '',
    uploadedImage: ''
  });
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    fetch(API_BASE + '/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((user) => {
        if (cancelled || !user || typeof user !== 'object') return;
        setProfile(user);
      })
      .catch(() => void 0);

    return () => {
      cancelled = true;
    };
  }, [token]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setUploading(true);
    setStatus('');
    try {
      const data = new FormData();
      data.append('image', file);
      const response = await fetch(API_BASE + '/api/upload', {
        method: 'POST',
        body: data
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        setStatus(result.error || 'Image upload failed');
        return;
      }
      updateField('uploadedImage', result.url);
    } catch {
      setStatus('Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};

    const cleanName = String(profile && profile.name ? profile.name : '').trim();
    const cleanEmail = String(profile && profile.email ? profile.email : '').trim();
    const cleanPhone = String(profile && profile.phone ? profile.phone : '').trim();
    const cleanAddress = String(profile && profile.address ? profile.address : '').trim();
    const cleanCity = String(profile && profile.city ? profile.city : '').trim();
    const cleanProductType = String(form.productType || '').trim();
    const cleanSize = String(form.preferredSize || '').trim();
    const cleanColor = String(form.preferredColor || '').trim();
    const cleanNotes = String(form.notes || '').trim();
    const cleanBudget = String(form.budget || '').trim();
    const quantity = Math.max(1, Number(form.quantity) || 1);

    if (!token) nextErrors.profile = 'Please login first to submit a custom design request';
    if (!cleanName || !cleanEmail || !cleanPhone || !cleanAddress || !cleanCity) {
      nextErrors.profile = 'Please complete your profile details before submitting a custom request';
    }
    if (!cleanProductType) nextErrors.productType = 'Product type is required';
    if (!cleanSize) nextErrors.preferredSize = 'Preferred size is required';
    if (!cleanColor) nextErrors.preferredColor = 'Preferred color is required';
    if (!cleanNotes || cleanNotes.length < 10) nextErrors.notes = 'Please describe your custom design in more detail';
    if (!form.uploadedImage) nextErrors.uploadedImage = 'Please upload a reference image';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus('Please complete the required fields');
      return;
    }

    setSubmitting(true);
    setErrors({});
    setStatus('');

    try {
      const payload = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        city: cleanCity,
        payment: 'custom-design-request',
        items: [
          {
            productId: 'custom-design-request',
            name: cleanProductType,
            price: 0,
            quantity,
            size: cleanSize,
            color: cleanColor,
            image: form.uploadedImage
          }
        ],
        subtotal: 0,
        shipping: 0,
        total: 0,
        metadata: {
          requestType: 'custom-design',
          productType: cleanProductType,
          preferredSize: cleanSize,
          preferredColor: cleanColor,
          budget: cleanBudget,
          designNotes: cleanNotes,
          referenceImage: form.uploadedImage,
          quantity,
          needsQuote: true
        }
      };

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(API_BASE + '/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(result.error || 'Failed to submit custom request');
        return;
      }

      setStatus('Custom design request submitted successfully. Our team will contact you soon.');
      setForm((prev) => ({
        ...prev,
        productType: '',
        preferredSize: '',
        preferredColor: '',
        quantity: '1',
        budget: '',
        notes: '',
        uploadedImage: ''
      }));
    } catch {
      setStatus('Failed to submit custom request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="custom-design-page">
      <Header />
      <main className="custom-design-main">
        <section className="custom-design-shell">
          <div className="custom-design-media-card">
            <div className="custom-design-preview-frame">
              {form.uploadedImage ? (
                <img src={form.uploadedImage} alt="Reference preview" className="custom-design-preview" />
              ) : (
                <div className="custom-design-placeholder">
                  <i className="fa-regular fa-image"></i>
                  <strong>No image uploaded yet</strong>
                </div>
              )}
            </div>
          </div>

          <form className="custom-design-form custom-design-form-card" onSubmit={handleSubmit}>
            <div className="custom-design-form-header">
              <h1>Custom Design Request</h1>
              <div className="custom-design-toolbar">
                <label className="custom-upload-button">
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                  {uploading ? 'Uploading...' : (form.uploadedImage ? 'Change Image' : 'Upload Image')}
                </label>
                <div className="custom-design-toolbar-text">
                  Add your own size, color, and design details here.
                </div>
              </div>
              {errors.uploadedImage ? <span className="field-error">{errors.uploadedImage}</span> : null}
              {errors.profile ? <span className="field-error">{errors.profile}</span> : null}
            </div>

            <div className="custom-design-grid">
                <div className="form-group">
                  <label>Product type</label>
                  <input value={form.productType} onChange={(e) => updateField('productType', e.target.value)} placeholder="e.g. Name plate, wall art, logo sign" />
                  {errors.productType ? <span className="field-error">{errors.productType}</span> : null}
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" min="1" value={form.quantity} onChange={(e) => updateField('quantity', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Preferred size</label>
                  <input value={form.preferredSize} onChange={(e) => updateField('preferredSize', e.target.value)} placeholder="e.g. 18 x 24 inches" />
                  {errors.preferredSize ? <span className="field-error">{errors.preferredSize}</span> : null}
                </div>
                <div className="form-group">
                  <label>Preferred color</label>
                  <input value={form.preferredColor} onChange={(e) => updateField('preferredColor', e.target.value)} placeholder="e.g. Matte black, gold mirror" />
                  {errors.preferredColor ? <span className="field-error">{errors.preferredColor}</span> : null}
                </div>
                <div className="form-group custom-design-full">
                  <label>Estimated budget</label>
                  <input value={form.budget} onChange={(e) => updateField('budget', e.target.value)} placeholder="Optional budget or target price" />
                </div>
                <div className="form-group custom-design-full">
                  <label>Design details</label>
                  <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Describe the text, style, finish, mounting preference, or any other details..." />
                  {errors.notes ? <span className="field-error">{errors.notes}</span> : null}
                </div>
              </div>

              {status ? <div className="custom-design-status">{status}</div> : null}
              <button type="submit" className="place-order-btn" disabled={submitting || uploading}>
                {submitting ? 'Submitting...' : 'Submit Custom Request'}
              </button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
