import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useState } from 'react';

export default function Admin() {
  const [auth, setAuth] = useState({ token: '', user: null });
  const [status, setStatus] = useState('');
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', category: '', image: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ name: '', price: '', category: '', image: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '' });
  const [cats, setCats] = useState([]);
  const [useCustom, setUseCustom] = useState(false);
  const [useCustomEdit, setUseCustomEdit] = useState(false);
  const [uploadingCreate, setUploadingCreate] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  useEffect(() => {
    let user = null;
    let token = '';
    try {
      user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null');
    } catch { 
      user = null;
    }
    token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
    try {
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('authToken', token);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    } catch { void 0; }
    setAuth({ token, user });
  }, []);

  async function api(path, options) {
    const r = await fetch(API_BASE + path, {
      ...(options || {}),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (auth.token || ''),
        ...(options && options.headers ? options.headers : {})
      }
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function load() {
    try {
      const list = await api('/api/products');
      setProducts(Array.isArray(list) ? list : []);
      setStatus('');
    } catch {
      setStatus('Failed to load products');
    }
  }
  async function loadCats() {
    try {
      const list = await api('/api/categories');
      setCats(Array.isArray(list) ? list : []);
    } catch { void 0; }
  }

  useEffect(() => {
    if (auth.token && auth.user && auth.user.role === 'admin') {
      load();
      loadCats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, auth.user && auth.user.role]);

  async function onSubmit(e){
    e.preventDefault();
    try {
      const payload = { ...form, price: Number(form.price)||0, stock: Number(form.stock)||0 };
      await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      setForm({ name: '', price: '', category: '', image: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '' });
      setUseCustom(false);
      load();
      loadCats();
      setStatus('Product created');
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Failed');
    }
  }

  async function onDelete(id){
    try {
      await api('/api/products/' + id, { method: 'DELETE' });
      load();
    } catch {
      setStatus('Delete failed');
    }
  }

  function startEdit(p){
    setEditingId(p.id);
    setEdit({
      name: p.name || '',
      price: p.price || 0,
      category: p.category || '',
      image: p.image || '',
      stock: p.stock || 0,
      status: p.status || 'active',
      slug: p.slug || '',
      metaTitle: p.metaTitle || '',
      metaDescription: p.metaDescription || '',
      description: p.description || ''
    });
    try {
      const ids = (cats || []).map(c => c.id);
      setUseCustomEdit(ids.includes(p.category) ? false : true);
    } catch { setUseCustomEdit(false); }
  }

  function cancelEdit(){
    setEditingId(null);
    setEdit({ name: '', price: '', category: '', image: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '' });
    setUseCustomEdit(false);
  }

  async function saveEdit(){
    try {
      const payload = { ...edit, price: Number(edit.price)||0, stock: Number(edit.stock)||0 };
      await api('/api/products/' + editingId, { method: 'PUT', body: JSON.stringify(payload) });
      setStatus('Product updated');
      setEditingId(null);
      load();
      loadCats();
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Update failed');
    }
  }
  async function onUploadCreate(e){
    const file = e.target && e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!file) return;
    setUploadingCreate(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await fetch(API_BASE + '/api/upload', { method: 'POST', body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) {
        setStatus(data && data.error ? data.error : 'Upload failed');
        return;
      }
      setForm({ ...form, image: data.url });
    } catch {
      setStatus('Upload failed');
    } finally {
      setUploadingCreate(false);
      if (e.target) e.target.value = '';
    }
  }
  async function onUploadEdit(e){
    const file = e.target && e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!file) return;
    setUploadingEdit(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await fetch(API_BASE + '/api/upload', { method: 'POST', body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) {
        setStatus(data && data.error ? data.error : 'Upload failed');
        return;
      }
      setEdit({ ...edit, image: data.url });
    } catch {
      setStatus('Upload failed');
    } finally {
      setUploadingEdit(false);
      if (e.target) e.target.value = '';
    }
  }

  const restricted = !auth.token || !auth.user || auth.user.role !== 'admin';

  return (
    <div>
      <Header />
      <CategoryNav />
      <main>
        <section className="auth-section">
          <div className="auth-container admin-dashboard" style={{ maxWidth: '100%' }}>
            <h2>Admin Dashboard</h2>
            {restricted ? (
              <div style={{ color: '#f44336' }}>Admin access required. Please login with an admin account.</div>
            ) : (
              <div className="admin-grid">
                <div className="admin-panel">
                  {status && <div style={{ marginBottom: 10 }}>{status}</div>}
                  <h3 className="admin-title">New Product</h3>
                  <form className="auth-form" onSubmit={onSubmit}>
                    <div className="form-group"><label>Name</label><input value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="form-group"><label>Price</label><input type="number" value={form.price} onChange={e=>setForm({ ...form, price: e.target.value })} required /></div>
                    <div className="form-group">
                      <label>Category</label>
                      <select value={useCustom ? '__custom' : (form.category || '')} onChange={e => {
                        const v = e.target.value;
                        if (v === '__custom') setUseCustom(true);
                        else { setUseCustom(false); setForm({ ...form, category: v }); }
                      }} required>
                        <option value="">Select category</option>
                        {cats.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        <option value="__custom">Custom...</option>
                      </select>
                      {useCustom && (
                        <input style={{ marginTop: 6 }} value={form.category} onChange={e=>setForm({ ...form, category: e.target.value })} placeholder="e.g. wall-art" required />
                      )}
                    </div>
                    <div className="form-group">
                      <label>Image</label>
                      <input type="file" accept="image/*" onChange={onUploadCreate} />
                      {uploadingCreate ? <div>Uploading...</div> : null}
                    </div>
                    <div className="form-group"><label>Stock</label><input type="number" value={form.stock} onChange={e=>setForm({ ...form, stock: e.target.value })} /></div>
                    <div className="form-group"><label>Status</label><input value={form.status} onChange={e=>setForm({ ...form, status: e.target.value })} /></div>
                    <div className="form-group"><label>Slug</label><input value={form.slug} onChange={e=>setForm({ ...form, slug: e.target.value })} /></div>
                    <div className="form-group"><label>Meta Title</label><input value={form.metaTitle} onChange={e=>setForm({ ...form, metaTitle: e.target.value })} /></div>
                    <div className="form-group"><label>Meta Description</label><input value={form.metaDescription} onChange={e=>setForm({ ...form, metaDescription: e.target.value })} /></div>
                    <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e=>setForm({ ...form, description: e.target.value })} placeholder="Detailed product description" /></div>
                    <div className="auth-actions"><button type="submit" className="submit-btn">Create Product</button></div>
                  </form>
                </div>
                <div className="admin-panel">
                  <h3 className="admin-title">Products</h3>
                  <div className="admin-products-grid">
                    {products.map(p => (
                      <div className="admin-product-card" key={p.id}>
                        {p.image ? <img src={String(p.image).startsWith('/') ? p.image : '/' + p.image} alt={p.name} title={p.name} /> : <div style={{ height: 120, background: '#f4f4f4' }} />}
                        {editingId === p.id ? (
                          <div className="auth-form" style={{ marginTop: 10 }}>
                            <div className="form-group"><label>Name</label><input value={edit.name} onChange={e=>setEdit({ ...edit, name: e.target.value })} required /></div>
                            <div className="form-group"><label>Price</label><input type="number" value={edit.price} onChange={e=>setEdit({ ...edit, price: e.target.value })} required /></div>
                            <div className="form-group">
                              <label>Category</label>
                              <select value={useCustomEdit ? '__custom' : (edit.category || '')} onChange={e => {
                                const v = e.target.value;
                                if (v === '__custom') setUseCustomEdit(true);
                                else { setUseCustomEdit(false); setEdit({ ...edit, category: v }); }
                              }} required>
                                <option value="">Select category</option>
                                {cats.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                <option value="__custom">Custom...</option>
                              </select>
                              {useCustomEdit && (
                                <input style={{ marginTop: 6 }} value={edit.category} onChange={e=>setEdit({ ...edit, category: e.target.value })} required />
                              )}
                            </div>
                            <div className="form-group">
                              <label>Image</label>
                              <input type="file" accept="image/*" onChange={onUploadEdit} />
                              {uploadingEdit ? <div>Uploading...</div> : null}
                            </div>
                            <div className="form-group"><label>Stock</label><input type="number" value={edit.stock} onChange={e=>setEdit({ ...edit, stock: e.target.value })} /></div>
                            <div className="form-group"><label>Status</label><input value={edit.status} onChange={e=>setEdit({ ...edit, status: e.target.value })} /></div>
                            <div className="form-group"><label>Slug</label><input value={edit.slug} onChange={e=>setEdit({ ...edit, slug: e.target.value })} /></div>
                            <div className="form-group"><label>Meta Title</label><input value={edit.metaTitle} onChange={e=>setEdit({ ...edit, metaTitle: e.target.value })} /></div>
                            <div className="form-group"><label>Meta Description</label><input value={edit.metaDescription} onChange={e=>setEdit({ ...edit, metaDescription: e.target.value })} /></div>
                            <div className="form-group"><label>Description</label><textarea value={edit.description} onChange={e=>setEdit({ ...edit, description: e.target.value })} /></div>
                            <div className="auth-actions" style={{ display: 'flex', gap: 8 }}>
                              <button type="button" className="submit-btn" onClick={saveEdit}>Save</button>
                              <button type="button" className="submit-btn" onClick={cancelEdit}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="admin-card-footer">
                            <h3>{p.name}</h3>
                            <p>PKR {Number(p.price)||0}</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="admin-btn edit" onClick={() => startEdit(p)}>
                                <i className="fa-solid fa-pen-to-square"></i>
                                Edit
                              </button>
                              <button className="admin-btn delete" onClick={() => onDelete(p.id)}>
                                <i className="fa-solid fa-trash"></i>
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
