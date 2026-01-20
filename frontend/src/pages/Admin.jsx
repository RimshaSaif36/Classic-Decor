import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import { API_BASE } from '../lib/config';
import { useEffect, useState, useMemo, Fragment } from 'react';
import { imgUrl } from '../lib/utils';

export default function Admin() {
  const [auth, setAuth] = useState({ token: '', user: null });
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, totalProducts: 0, totalUsers: 0, pendingOrders: 0 });
  const [report, setReport] = useState({ daily: [], monthly: [] });
  const [form, setForm] = useState({ name: '', price: '', category: '', image: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ name: '', price: '', category: '', image: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '' });
  const [cats, setCats] = useState([]);
  const [useCustom, setUseCustom] = useState(false);
  const [useCustomEdit, setUseCustomEdit] = useState(false);
  const [uploadingCreate, setUploadingCreate] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(null);
  const [searchOrders, setSearchOrders] = useState('');

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
    console.log('[Admin] Auth initialized - Token present:', !!token, 'User:', user?.email);
    setAuth({ token, user });
  }, []);

  async function api(path, options) {
    const token = auth.token || '';
    if (!token && path !== '/api/products') {
      console.warn('[Admin] API called without token for:', path);
    }
    const r = await fetch(API_BASE + path, {
      ...(options || {}),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        ...(options && options.headers ? options.headers : {})
      }
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401) {
        console.error('[Admin] Unauthorized - token invalid or expired');
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        window.location.href = '/login?redirect=/admin';
      }
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  async function load() {
    try {
      const list = await api('/api/products?limit=1000');
      setProducts(Array.isArray(list) ? list : []);
      setStatus('');
    } catch {
      setStatus('Failed to load products');
    }
  }

  async function loadOrders() {
    try {
      if (!auth.token) {
        setStatus('Please login to view orders');
        return;
      }
      const list = await api('/api/orders');
      setOrders(Array.isArray(list) ? list : []);
      calculateStats(Array.isArray(list) ? list : [], products);
      setStatus(''); // Clear error status when successful
    } catch (e) {
      console.error('Failed to load orders:', e);
      setOrders([]);
      calculateStats([], products);
      setStatus('Failed to load orders - ' + (e.message || 'Unknown error'));
    }
  }

  async function loadUsers() {
    try {
      if (!auth.token) return;
      const list = await api('/api/users');
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load users:', e);
      setStatus('Failed to load users');
    }
  }

  async function loadReport() {
    try {
      const data = await api('/api/orders/report');
      setReport({
        daily: Array.isArray(data?.daily) ? data.daily : [],
        monthly: Array.isArray(data?.monthly) ? data.monthly : []
      });
    } catch {
      // ignore silently
    }
  }

  function calculateStats(ordersList, productsList) {
    const totalOrders = ordersList.length;
    const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const pendingOrders = ordersList.filter(o => o.paymentStatus === 'pending').length;
    const totalProducts = productsList.length;
    const totalUsers = users.length;
    
    setStats({
      totalOrders,
      totalRevenue,
      totalProducts,
      totalUsers,
      pendingOrders
    });
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
      loadOrders();
      loadUsers();
      loadReport();
    }
  }, [auth.token, auth.user]);

  useEffect(() => {
    // Recalculate stats whenever products, orders or users change
    calculateStats(orders, products);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, orders]);

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
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api('/api/products/' + id, { method: 'DELETE' });
      setStatus('Product deleted successfully');
      await load();
    } catch (e) {
      console.error('Delete error:', e);
      setStatus('Delete failed: ' + (e && e.message ? e.message : 'Unknown error'));
    }
  }

  function startEdit(p){
    const pid = p._id || p.id;
    setEditingId(pid);
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

  async function updateOrderStatus(orderId, newStatus) {
    try {
      setUpdatingOrderStatus(orderId);
      await api('/api/orders/' + orderId, { method: 'PUT', body: JSON.stringify({ paymentStatus: newStatus }) });
      setStatus('Order status updated');
      loadOrders();
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Failed to update status');
    } finally {
      setUpdatingOrderStatus(null);
    }
  }

  async function deleteOrder(orderId) {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await api('/api/orders/' + orderId, { method: 'DELETE' });
      setStatus('Order deleted');
      loadOrders();
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Failed to delete order');
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

  const filteredOrders = orders.filter(o => 
    !searchOrders || 
    (o.name && o.name.toLowerCase().includes(searchOrders.toLowerCase())) ||
    (o.phone && o.phone.includes(searchOrders)) ||
    (o._id && o._id.includes(searchOrders))
  );

  const orderGroups = useMemo(() => {
    const m = new Map();
    for (const o of filteredOrders) {
      const key = (String(o.email || (o.metadata && o.metadata.email) || '').trim()) || '—';
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(o);
    }
    return Array.from(m.entries()).map(([email, orders]) => ({ email, orders }));
  }, [filteredOrders]);

  const recentOrders = orders;

  return (
    <div>
      <Header />
      <CategoryNav />
      <main>
        <section className="auth-section">
          <div className="auth-container admin-dashboard" style={{ maxWidth: '100%' }}>
            <div className="admin-header">
              <h2>Admin Dashboard</h2>
              <p className="admin-subtitle">Manage products, orders, and store data</p>
            </div>

            {restricted ? (
              <div style={{ color: '#f44336', padding: '20px', background: '#ffebee', borderRadius: '8px' }}>
                <strong>⚠️ Admin access required.</strong> Please login with an admin account.
              </div>
            ) : (
              <>
                {/* Dashboard Tabs */}
                <div className="admin-tabs">
                  <button 
                    className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    <i className="fa-solid fa-chart-line"></i> Dashboard
                  </button>
                  <button 
                    className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                  >
                    <i className="fa-solid fa-shopping-cart"></i> Orders
                  </button>
                  <button 
                    className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
                    onClick={() => setActiveTab('products')}
                  >
                    <i className="fa-solid fa-box"></i> Products
                  </button>
                  <button 
                    className={`admin-tab ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                  >
                    <i className="fa-solid fa-chart-pie"></i> Reports
                  </button>
                </div>

                {status && (
                  <div className="admin-alert" style={{ marginBottom: '20px' }}>
                    {status}
                  </div>
                )}

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                  <>
                    {/* Stats Cards */}
                    <div className="admin-stats-grid">
                      <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#e3f2fd' }}>
                          <i className="fa-solid fa-shopping-bag" style={{ color: '#1976d2' }}></i>
                        </div>
                        <div className="stat-content">
                          <h4>Total Orders</h4>
                          <p className="stat-value">{stats.totalOrders}</p>
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#f3e5f5' }}>
                          <i className="fa-solid fa-dollar-sign" style={{ color: '#7b1fa2' }}></i>
                        </div>
                        <div className="stat-content">
                          <h4>Total Revenue</h4>
                          <p className="stat-value">PKR {stats.totalRevenue.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#fff3e0' }}>
                          <i className="fa-solid fa-clock" style={{ color: '#f57c00' }}></i>
                        </div>
                        <div className="stat-content">
                          <h4>Pending Orders</h4>
                          <p className="stat-value">{stats.pendingOrders}</p>
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#e8f5e9' }}>
                          <i className="fa-solid fa-box" style={{ color: '#388e3c' }}></i>
                        </div>
                        <div className="stat-content">
                          <h4>Total Products</h4>
                          <p className="stat-value">{stats.totalProducts}</p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Orders */}
                    <div className="admin-section">
                      <h3 className="admin-title">Recent Orders</h3>
                      <div className="admin-table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Customer Name</th>
                              <th>Phone</th>
                              <th>Total</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentOrders.length > 0 ? (
                              recentOrders.map(order => (
                                <tr key={order._id}>
                                  <td><code>{String(order._id).slice(-8)}</code></td>
                                  <td>{order.name}</td>
                                  <td>{order.phone}</td>
                                  <td><strong>PKR {Number(order.total || 0).toLocaleString()}</strong></td>
                                  <td>
                                    <span className={`order-status status-${order.paymentStatus}`}>
                                      {order.paymentStatus}
                                    </span>
                                  </td>
                                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No orders yet</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                  <div className="admin-section">
                    <div className="section-header">
                      <h3 className="admin-title">Order Management</h3>
                      <input 
                        type="text" 
                        placeholder="Search by name, phone, or order ID..." 
                        className="admin-search"
                        value={searchOrders}
                        onChange={(e) => setSearchOrders(e.target.value)}
                      />
                    </div>

                    <div className="admin-table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Address</th>
                            <th>Product</th>
                            <th>Image</th>
                            <th>Color</th>
                            <th>Size</th>
                            <th>Payment</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderGroups.length > 0 ? (
                            orderGroups.map((group, gi) => (
                              <Fragment key={'group-' + gi}>
                                <tr className="order-group-header">
                                  <td colSpan="14">
                                    <strong>{group.email}</strong>
                                    <span style={{ marginLeft: 8, color: '#666' }}>{group.orders.length} orders</span>
                                  </td>
                                </tr>
                                {group.orders.map(order => (
                                  <tr key={order._id}>
                                    <td><code style={{ fontSize: '0.85rem' }}>{String(order._id).slice(-8)}</code></td>
                                    <td>
                                      <div className="order-customer">
                                        <strong>{order.name}</strong>
                                      </div>
                                    </td>
                                    <td>{order.phone}</td>
                                    <td>
                                      <small>{order.address}</small>
                                    </td>
                                    <td>
                                      <div className="order-product">
                                        {(order.items && order.items[0] && order.items[0].name) ? order.items[0].name : '—'}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="order-image">
                                        {(order.items && order.items[0] && order.items[0].image) ? (
                                          <img src={imgUrl(order.items[0].image)} alt={order.items[0].name || ''} />
                                        ) : (
                                          <span>—</span>
                                        )}
                                      </div>
                                    </td>
                                    <td>{(order.items && order.items[0] && order.items[0].color) ? order.items[0].color : '—'}</td>
                                    <td>{(order.items && order.items[0] && order.items[0].size) ? order.items[0].size : '—'}</td>
                                    <td>{order.payment || (order.metadata && order.metadata.gateway) || '—'}</td>
                                    <td>
                                      <div className="order-items">
                                        {order.items && order.items.length > 0 && (
                                          <div>{order.items.length} item{order.items.length > 1 ? 's' : ''}</div>
                                        )}
                                      </div>
                                    </td>
                                    <td><strong>PKR {Number(order.total || 0).toLocaleString()}</strong></td>
                                    <td>
                                      <select 
                                        className="order-status-select"
                                        value={order.paymentStatus}
                                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                                        disabled={updatingOrderStatus === order._id}
                                      >
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                        <option value="failed">Failed</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                      </select>
                                    </td>
                                    <td><small>{new Date(order.createdAt).toLocaleDateString()}</small></td>
                                    <td>
                                      <button 
                                        className="admin-btn delete"
                                        onClick={() => deleteOrder(order._id)}
                                        title="Delete order"
                                      >
                                        <i className="fa-solid fa-trash"></i>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </Fragment>
                            ))
                          ) : (
                            <tr><td colSpan="14" style={{ textAlign: 'center', padding: '20px' }}>
                              {searchOrders ? 'No matching orders found' : 'No orders found'}
                            </td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* PRODUCTS TAB */}
                {activeTab === 'products' && (
                  <div className="admin-grid">
                    <div className="admin-panel">
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
                      <h3 className="admin-title">Products ({products.length})</h3>
                      <div className="admin-products-grid">
                        {products.map((p) => {
                          const pid = p._id || p.id;
                          return (
                            <div className="admin-product-card" key={pid}>
                              {p.image ? (
                                <img src={imgUrl(p.image)} alt={p.name} title={p.name} />
                              ) : (
                                <div style={{ height: 120, background: '#f4f4f4' }} />
                              )}

                              {editingId === pid ? (
                                <div className="auth-form" style={{ marginTop: 10 }}>
                                  <div className="form-group"><label>Name</label><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} required /></div>
                                  <div className="form-group"><label>Price</label><input type="number" value={edit.price} onChange={e => setEdit({ ...edit, price: e.target.value })} required /></div>
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
                                      <input style={{ marginTop: 6 }} value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })} required />
                                    )}
                                  </div>
                                  <div className="form-group">
                                    <label>Image</label>
                                    <input type="file" accept="image/*" onChange={onUploadEdit} />
                                    {uploadingEdit ? <div>Uploading...</div> : null}
                                  </div>
                                  <div className="form-group"><label>Stock</label><input type="number" value={edit.stock} onChange={e => setEdit({ ...edit, stock: e.target.value })} /></div>
                                  <div className="form-group"><label>Status</label><input value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })} /></div>
                                  <div className="form-group"><label>Slug</label><input value={edit.slug} onChange={e => setEdit({ ...edit, slug: e.target.value })} /></div>
                                  <div className="form-group"><label>Meta Title</label><input value={edit.metaTitle} onChange={e => setEdit({ ...edit, metaTitle: e.target.value })} /></div>
                                  <div className="form-group"><label>Meta Description</label><input value={edit.metaDescription} onChange={e => setEdit({ ...edit, metaDescription: e.target.value })} /></div>
                                  <div className="form-group"><label>Description</label><textarea value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} /></div>
                                  <div className="auth-actions" style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" className="submit-btn" onClick={saveEdit}>Save</button>
                                    <button type="button" className="submit-btn" onClick={cancelEdit}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="admin-card-footer">
                                  <h3>{p.name}</h3>
                                  <p>PKR {Number(p.price) || 0}</p>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="admin-btn edit" onClick={() => startEdit(p)}>
                                      <i className="fa-solid fa-pen-to-square"></i>
                                      Edit
                                    </button>
                                    <button className="admin-btn delete" onClick={() => onDelete(pid)}>
                                      <i className="fa-solid fa-trash"></i>
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* REPORTS TAB */}
                {activeTab === 'reports' && (
                  <div className="admin-section">
                    <h3 className="admin-title">Order Analytics</h3>
                    <div className="admin-grid">
                      <div className="admin-panel">
                        <h4 className="admin-subtitle">Daily (Last 30 days)</h4>
                        <div className="admin-table-wrapper">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Orders</th>
                                <th>Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(report.daily || []).length > 0 ? (
                                report.daily.map((d) => (
                                  <tr key={d.date}>
                                    <td>{d.date}</td>
                                    <td>{d.orders}</td>
                                    <td>PKR {Number(d.revenue || 0).toLocaleString()}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No data</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="admin-panel">
                        <h4 className="admin-subtitle">Monthly (Last 12 months)</h4>
                        <div className="admin-table-wrapper">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th>Orders</th>
                                <th>Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(report.monthly || []).length > 0 ? (
                                report.monthly.map((m) => (
                                  <tr key={m.month}>
                                    <td>{m.month}</td>
                                    <td>{m.orders}</td>
                                    <td>PKR {Number(m.revenue || 0).toLocaleString()}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No data</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
