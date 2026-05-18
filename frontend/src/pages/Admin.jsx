import Header from '../components/Header';
import Footer from '../components/Footer';
import AnalyticsCalendar from '../components/AnalyticsCalendar';
import AnalyticsCharts from '../components/AnalyticsCharts';
import AnalyticsSummary from '../components/AnalyticsSummary';
import ReviewsManagement from '../components/ReviewsManagement';
import { API_BASE } from '../lib/config';
import { useEffect, useState, useMemo, Fragment } from 'react';
import { imgUrl } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Predefined options
const PRESET_COLORS = ['Black', 'Transparent', 'Golden', 'Silver', 'Brown'];
const PRESET_SIZES = ['Small', 'Medium', 'Large', 'Small (8x8)', 'Medium (12x12)', 'Large (15x15)'];

function formatOrderDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-PK');
}

function formatOrderTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-PK', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatMoney(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function formatOrderTotal(order) {
  if (order.metadata && order.metadata.requestType === 'custom-design' && Number(order.total || 0) <= 0) {
    return 'Quote pending';
  }
  return formatMoney(order.total || 0);
}

function isCustomDesignOrder(order) {
  return String(order?.metadata?.requestType || '').toLowerCase() === 'custom-design' || Boolean(order?.metadata?.needsQuote);
}

function hasCustomQuoteAmount(order) {
  const budget = String(order?.metadata?.budget || '').replace(/,/g, '').trim();
  const numericBudget = Number(budget) || 0;
  return Number(order?.total || 0) > 0 || numericBudget > 0;
}

function hasCustomPaymentDetails(order) {
  const paymentMethod = String(order?.payment || '').trim().toLowerCase();
  const senderNumber = String(order?.senderNumber || '').trim();
  const transactionId = String(order?.transactionId || '').trim();

  return Boolean(paymentMethod)
    && paymentMethod !== 'custom-design-request'
    && Boolean(senderNumber)
    && Boolean(transactionId);
}

function canApproveCustomOrder(order) {
  if (!isCustomDesignOrder(order)) return true;
  return hasCustomQuoteAmount(order);
}

function getCustomApprovalBlockReason(order) {
  if (!isCustomDesignOrder(order)) return '';
  if (!hasCustomQuoteAmount(order)) return 'Share quote amount first before approving this custom order';
  return '';
}

function getApprovalBadge(order) {
  if (!isCustomDesignOrder(order)) return null;

  if (canApproveCustomOrder(order)) {
    return {
      label: 'Ready to Approve',
      background: '#e8f5e9',
      color: '#2e7d32',
      borderColor: '#c8e6c9',
    };
  }

  if (Number(order?.total || 0) <= 0) {
    return {
      label: 'Quote Required',
      background: '#fff8e1',
      color: '#8d6e00',
      borderColor: '#f0d98a',
    };
  }

  return null;
}

function formatOrderPayment(order) {
  const paymentMethod = String(order?.payment || '').trim();
  const transactionId = String(order?.transactionId || '').trim();
  const senderNumber = String(order?.senderNumber || '').trim();
  const isCustomOrder = String(order?.metadata?.requestType || '').toLowerCase() === 'custom-design' || Boolean(order?.metadata?.needsQuote);

  if (isCustomOrder && (!paymentMethod || paymentMethod.toLowerCase() === 'custom-design-request')) {
    return {
      title: Number(order?.total || 0) > 0 ? 'Awaiting customer payment details' : 'Quote not shared yet',
      detail: '—',
      sender: '',
    };
  }

  return {
    title: paymentMethod ? formatDisplayText(paymentMethod) : '—',
    detail: transactionId ? `TX: ${transactionId}` : 'TX: —',
    sender: senderNumber ? `Sender: ${senderNumber}` : '',
  };
}

function formatMetaLabel(key) {
  return String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatMetaValue(value) {
  if (Array.isArray(value)) return value.map(formatMetaValue).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatDisplayText(value) {
  const normalized = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '—';

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getOrderImageEntries(order) {
  const imageEntries = [];

  (order.items || []).forEach((item, index) => {
    if (!item || !item.image) return;
    imageEntries.push({
      title: item.name || `Item ${index + 1}`,
      details: [
        item.color ? `Color: ${item.color}` : null,
        item.size ? `Size: ${item.size}` : null,
        item.quantity ? `Qty: ${item.quantity}` : null,
      ].filter(Boolean).join(' | '),
      src: imgUrl(item.image),
    });
  });

  if (order.metadata && order.metadata.referenceImage) {
    const referenceSrc = imgUrl(order.metadata.referenceImage);
    if (!imageEntries.some((entry) => entry.src === referenceSrc)) {
      imageEntries.push({
        title: 'Reference image',
        details: 'Uploaded by customer for custom design',
        src: referenceSrc,
      });
    }
  }

  return imageEntries;
}

async function fetchImageDataUrl(src) {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error('Image fetch failed');
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function Admin() {
  const [auth, setAuth] = useState({ token: '', user: null });
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, totalProducts: 0, totalUsers: 0, pendingOrders: 0 });
  const [report, setReport] = useState({ daily: [], monthly: [] });
  const [form, setForm] = useState({ name: '', price: '', category: '', image: '', images: [], relatedProductsText: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '', saleDiscount: 0, colors: '', sizes: '' });
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ name: '', price: '', category: '', image: '', images: [], relatedProductsText: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '', saleDiscount: 0, colors: '', sizes: '' });
  const [cats, setCats] = useState([]);
  const [formColorChecks, setFormColorChecks] = useState({});
  const [formSizeChecks, setFormSizeChecks] = useState({});
  const [formCustomColors, setFormCustomColors] = useState('');
  const [formCustomSizes, setFormCustomSizes] = useState('');
  const [editColorChecks, setEditColorChecks] = useState({});
  const [editSizeChecks, setEditSizeChecks] = useState({});
  const [editCustomColors, setEditCustomColors] = useState('');
  const [editCustomSizes, setEditCustomSizes] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [useCustomEdit, setUseCustomEdit] = useState(false);
  const [uploadingCreate, setUploadingCreate] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(null);
  const [exportingOrderId, setExportingOrderId] = useState(null);
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
      // Merge checked colors with custom colors
      const selectedColors = Object.keys(formColorChecks).filter(c => formColorChecks[c]);
      const customColorsList = formCustomColors ? formCustomColors.split(',').map(c => c.trim()).filter(c => c) : [];
      const allColors = [...selectedColors, ...customColorsList];
      
      // Merge checked sizes with custom sizes
      const selectedSizes = Object.keys(formSizeChecks).filter(s => formSizeChecks[s]);
      const customSizesList = formCustomSizes ? formCustomSizes.split(',').map(s => s.trim()).filter(s => s) : [];
      const allSizes = [...selectedSizes, ...customSizesList];
      
      const relatedProducts = form.relatedProductsText
        ? form.relatedProductsText.split(',').map((item) => item.trim()).filter((item) => item)
        : [];
      const payload = { 
        ...form, 
        price: Number(form.price)||0, 
        stock: Number(form.stock)||0,
        saleDiscount: Number(form.saleDiscount)||0,
        colors: allColors,
        sizes: allSizes,
        images: form.images || [],
        relatedProducts,
      };
      await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      setForm({ name: '', price: '', category: '', image: '', images: [], relatedProductsText: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '', saleDiscount: 0, colors: '', sizes: '' });
      setFormColorChecks({});
      setFormSizeChecks({});
      setFormCustomColors('');
      setFormCustomSizes('');
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
      images: Array.isArray(p.images) ? p.images : [],
      relatedProductsText: Array.isArray(p.relatedProducts) ? p.relatedProducts.join(', ') : (p.relatedProducts || ''),
      stock: p.stock || 0,
      status: p.status || 'active',
      slug: p.slug || '',
      metaTitle: p.metaTitle || '',
      metaDescription: p.metaDescription || '',
      description: p.description || '',
      saleDiscount: p.saleDiscount || 0,
      colors: Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || ''),
      sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || '')
    });
    
    // Populate edit color/size checkboxes
    const existingColors = Array.isArray(p.colors) ? p.colors : [];
    const existingSizes = Array.isArray(p.sizes) ? p.sizes : [];
    
    const colorChecks = {};
    PRESET_COLORS.forEach(c => {
      colorChecks[c] = existingColors.includes(c);
    });
    
    const sizeChecks = {};
    PRESET_SIZES.forEach(s => {
      sizeChecks[s] = existingSizes.includes(s);
    });
    
    // Find custom colors/sizes (not in preset)
    const customCols = existingColors.filter(c => !PRESET_COLORS.includes(c));
    const customSzs = existingSizes.filter(s => !PRESET_SIZES.includes(s));
    
    setEditColorChecks(colorChecks);
    setEditSizeChecks(sizeChecks);
    setEditCustomColors(customCols.join(', '));
    setEditCustomSizes(customSzs.join(', '));
    try {
      const ids = (cats || []).map(c => c.id);
      setUseCustomEdit(ids.includes(p.category) ? false : true);
    } catch { setUseCustomEdit(false); }
  }

  function cancelEdit(){
    setEditingId(null);
    setEdit({ name: '', price: '', category: '', image: '', images: [], relatedProductsText: '', stock: 0, status: 'active', slug: '', metaTitle: '', metaDescription: '', description: '', saleDiscount: 0, colors: '', sizes: '' });
    setEditColorChecks({});
    setEditSizeChecks({});
    setEditCustomColors('');
    setEditCustomSizes('');
    setUseCustomEdit(false);
  }

  async function saveEdit(){
    try {
      // Merge checked colors with custom colors
      const selectedColors = Object.keys(editColorChecks).filter(c => editColorChecks[c]);
      const customColorsList = editCustomColors ? editCustomColors.split(',').map(c => c.trim()).filter(c => c) : [];
      const allColors = [...selectedColors, ...customColorsList];
      
      // Merge checked sizes with custom sizes
      const selectedSizes = Object.keys(editSizeChecks).filter(s => editSizeChecks[s]);
      const customSizesList = editCustomSizes ? editCustomSizes.split(',').map(s => s.trim()).filter(s => s) : [];
      const allSizes = [...selectedSizes, ...customSizesList];
      
      const relatedProducts = edit.relatedProductsText
        ? edit.relatedProductsText.split(',').map((item) => item.trim()).filter((item) => item)
        : [];
      const payload = { 
        ...edit, 
        price: Number(edit.price)||0, 
        stock: Number(edit.stock)||0,
        saleDiscount: Number(edit.saleDiscount)||0,
        colors: allColors,
        sizes: allSizes,
        images: edit.images || [],
        relatedProducts,
      };
      await api('/api/products/' + editingId, { method: 'PUT', body: JSON.stringify(payload) });
      setStatus('Product updated');
      setEditingId(null);
      setEditColorChecks({});
      setEditSizeChecks({});
      setEditCustomColors('');
      setEditCustomSizes('');
      load();
      loadCats();
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Update failed');
    }
  }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      const targetOrder = orders.find(order => String(order._id) === String(orderId));
      if (newStatus === 'approved' && targetOrder && !canApproveCustomOrder(targetOrder)) {
        setStatus(getCustomApprovalBlockReason(targetOrder) || 'Custom order cannot be approved yet');
        return;
      }
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

  async function exportOrderPdf(order) {
    try {
      setExportingOrderId(order._id);

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - (margin * 2);
      const palette = {
        ink: [33, 37, 41],
        muted: [108, 117, 125],
        gold: [198, 153, 61],
        goldSoft: [247, 241, 224],
        line: [225, 229, 233],
        panel: [250, 250, 247],
        deep: [24, 33, 41],
        success: [55, 125, 79],
        warning: [173, 118, 33],
        danger: [183, 64, 64],
      };
      const metadataEntries = Object.entries(order.metadata || {}).filter(([key, value]) => {
        if (value === '' || value == null) return false;
        return !['referenceImage', 'gateway'].includes(key);
      });
      const totalPagesExp = '{total_pages_count_string}';
      const orderReference = String(order._id || '—');
      const orderShortId = orderReference === '—' ? orderReference : orderReference.slice(-8).toUpperCase();
      const orderStatus = formatDisplayText(order.paymentStatus || 'pending');
      const paymentMethod = formatDisplayText(order.payment || (order.metadata && order.metadata.gateway) || '—');
      const customerName = order.name || '—';
      const customerAddress = [order.address, order.city].filter(Boolean).join(', ') || '—';
      const imageEntries = getOrderImageEntries(order);

      let y = 118;

      const getStatusFill = () => {
        const value = String(order.paymentStatus || '').toLowerCase();
        if (['completed', 'approved', 'delivered', 'paid', 'shipped'].includes(value)) return palette.success;
        if (['failed', 'cancelled'].includes(value)) return palette.danger;
        return palette.warning;
      };

      const drawPageHeader = (continuation = false) => {
        doc.setFillColor(...palette.deep);
        doc.rect(0, 0, pageWidth, 92, 'F');
        doc.setFillColor(...palette.gold);
        doc.rect(0, 92, pageWidth, 4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text('Classic Decor', margin, 42);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(232, 236, 239);
        doc.text(continuation ? 'Order fulfillment sheet continuation' : 'Order fulfillment and shipping sheet', margin, 61);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(`Order Ref: ${orderShortId}`, pageWidth - margin, 36, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(232, 236, 239);
        doc.text(`${formatOrderDate(order.createdAt)}  |  ${formatOrderTime(order.createdAt)}`, pageWidth - margin, 56, { align: 'right' });

        y = 118;
      };

      const drawPageFooter = (pageNumber) => {
        doc.setDrawColor(...palette.line);
        doc.line(margin, pageHeight - 38, pageWidth - margin, pageHeight - 38);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...palette.muted);
        doc.text('Prepared from the admin panel for shipping coordination.', margin, pageHeight - 22);
        doc.text(`Page ${pageNumber} of ${totalPagesExp}`, pageWidth - margin, pageHeight - 22, { align: 'right' });
      };

      const ensurePageSpace = (requiredHeight = 80) => {
        if (y + requiredHeight <= pageHeight - 56) return;
        doc.addPage();
        drawPageHeader(true);
      };

      const addSectionTitle = (title, subtitle) => {
        ensurePageSpace(48);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...palette.ink);
        doc.text(title, margin, y);

        if (subtitle) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...palette.muted);
          doc.text(subtitle, margin, y + 14);
        }

        doc.setDrawColor(...palette.gold);
        doc.setLineWidth(1.2);
        doc.line(margin, y + 22, margin + 92, y + 22);
        y += 34;
      };

      const drawSummaryCard = (x, top, width, title, value, accent, subtext) => {
        doc.setFillColor(...palette.panel);
        doc.setDrawColor(...palette.line);
        doc.roundedRect(x, top, width, 70, 10, 10, 'FD');
        doc.setFillColor(...accent);
        doc.roundedRect(x, top, 6, 70, 6, 6, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...palette.muted);
        doc.text(title, x + 18, top + 22);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(...palette.ink);
        doc.text(value, x + 18, top + 44);

        if (subtext) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...palette.muted);
          doc.text(doc.splitTextToSize(subtext, width - 28), x + 18, top + 58);
        }
      };

      drawPageHeader(false);

      const cardGap = 12;
      const cardWidth = (contentWidth - (cardGap * 2)) / 3;
      drawSummaryCard(margin, y, cardWidth, 'Customer', customerName, palette.gold, customerAddress);
      drawSummaryCard(margin + cardWidth + cardGap, y, cardWidth, 'Status', orderStatus, getStatusFill(), `Payment: ${paymentMethod}`);
      drawSummaryCard(margin + ((cardWidth + cardGap) * 2), y, cardWidth, 'Order Total', formatOrderTotal(order), palette.deep, `${(order.items || []).length} item${(order.items || []).length === 1 ? '' : 's'}`);
      y += 92;

      addSectionTitle('Customer and Shipping Details', 'Verified recipient and dispatch information');
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
          overflow: 'linebreak',
          textColor: palette.ink,
          lineColor: palette.line,
          lineWidth: 0.5,
        },
        body: [
          ['Order ID', orderReference],
          ['Order Date', formatOrderDate(order.createdAt)],
          ['Order Time', formatOrderTime(order.createdAt)],
          ['Customer Name', order.name || '—'],
          ['Email', order.email || '—'],
          ['Phone', order.phone || '—'],
          ['City', order.city || '—'],
          ['Address', order.address || '—'],
          ['Payment Method', paymentMethod],
          ['Payment Status', orderStatus],
          ['Subtotal', formatMoney(order.subtotal || 0)],
          ['Shipping', formatMoney(order.shipping || 0)],
          ['Order Total', formatOrderTotal(order)],
        ],
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 130, fontStyle: 'bold', fillColor: palette.goldSoft },
          1: { cellWidth: contentWidth - 130 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1 && data.row.index === 9) {
            data.cell.styles.textColor = getStatusFill();
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
      y = doc.lastAutoTable.finalY + 20;

      addSectionTitle('Items', 'Product, quantity, visual references, and line totals');
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
          overflow: 'linebreak',
          valign: 'top',
          textColor: palette.ink,
          lineColor: palette.line,
          lineWidth: 0.5,
        },
        alternateRowStyles: { fillColor: [252, 252, 250] },
        headStyles: { fillColor: palette.deep, textColor: [255, 255, 255], fontStyle: 'bold' },
        body: (order.items || []).length > 0 ? (order.items || []).map((item, index) => {
          const quantity = Number(item.quantity || 1);
          const price = Number(item.price || 0);
          return [
            String(index + 1),
            item.name || '—',
            String(quantity),
            item.size || '—',
            item.color || '—',
            price > 0 ? formatMoney(price) : '—',
            price > 0 ? formatMoney(price * quantity) : '—',
            item.image ? 'Attached in image section' : '—',
          ];
        }) : [['1', 'No item details available', '—', '—', '—', '—', '—', '—']],
        head: [['#', 'Item', 'Qty', 'Size', 'Color', 'Price', 'Line Total', 'Image']],
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 170 },
          2: { cellWidth: 34, halign: 'center' },
          3: { cellWidth: 54 },
          4: { cellWidth: 58 },
          5: { cellWidth: 64 },
          6: { cellWidth: 74 },
          7: { cellWidth: 88 },
        },
      });
      y = doc.lastAutoTable.finalY + 20;

      if (metadataEntries.length > 0) {
        addSectionTitle('Additional Request Details', 'Notes supplied by the customer for preparation or customization');
        autoTable(doc, {
          startY: y,
          theme: 'grid',
          styles: {
            fontSize: 10,
            cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
            overflow: 'linebreak',
            textColor: palette.ink,
            lineColor: palette.line,
            lineWidth: 0.5,
          },
          body: metadataEntries.map(([key, value]) => [formatMetaLabel(key), formatMetaValue(value)]),
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 150, fontStyle: 'bold', fillColor: palette.goldSoft },
            1: { cellWidth: contentWidth - 150 },
          },
        });
        y = doc.lastAutoTable.finalY + 20;
      }

      if (imageEntries.length > 0) {
        addSectionTitle('Attached Images', 'Product visuals and customer references for the shipping team');

        for (const imageEntry of imageEntries) {
          ensurePageSpace(196);

          doc.setFillColor(...palette.panel);
          doc.setDrawColor(...palette.line);
          doc.roundedRect(margin, y, contentWidth, 176, 12, 12, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...palette.ink);
          doc.text(imageEntry.title, margin + 18, y + 24);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...palette.muted);
          if (imageEntry.details) {
            doc.text(doc.splitTextToSize(imageEntry.details, contentWidth - 180), margin + 18, y + 42);
          }

          const dataUrl = await fetchImageDataUrl(imageEntry.src);
          if (dataUrl) {
            const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(dataUrl, format, margin + 18, y + 54, 118, 118);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...palette.ink);
            doc.text('Image Source', margin + 154, y + 78);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...palette.muted);
            doc.text(doc.splitTextToSize(imageEntry.src, contentWidth - 172), margin + 154, y + 96);
          } else {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...palette.danger);
            doc.text('Image preview unavailable', margin + 18, y + 76);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...palette.muted);
            doc.text(doc.splitTextToSize(imageEntry.src, contentWidth - 36), margin + 18, y + 94);
          }

          y += 192;
        }
      }

      const totalPages = doc.getNumberOfPages();
      for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
        doc.setPage(pageIndex);
        drawPageFooter(pageIndex);
      }

      if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages(totalPagesExp);
      }

      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const popup = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        doc.save(`order-${String(order._id || 'sheet')}.pdf`);
      }
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      setStatus('Order PDF prepared');
    } catch (e) {
      console.error('Failed to export order PDF:', e);
      setStatus(e && e.message ? e.message : 'Failed to prepare order PDF');
    } finally {
      setExportingOrderId(null);
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

  async function onUploadGalleryCreate(e) {
    const files = e.target && e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setUploadingCreate(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        const r = await fetch(API_BASE + '/api/upload', { method: 'POST', body: fd });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.url) {
          setStatus(data && data.error ? data.error : 'Upload failed');
          continue;
        }
        setForm((prev) => ({ ...prev, images: [...(prev.images || []), data.url] }));
      }
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

  async function onUploadGalleryEdit(e) {
    const files = e.target && e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setUploadingEdit(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        const r = await fetch(API_BASE + '/api/upload', { method: 'POST', body: fd });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.url) {
          setStatus(data && data.error ? data.error : 'Upload failed');
          continue;
        }
        setEdit((prev) => ({ ...prev, images: [...(prev.images || []), data.url] }));
      }
    } catch {
      setStatus('Upload failed');
    } finally {
      setUploadingEdit(false);
      if (e.target) e.target.value = '';
    }
  }

  function removeFormImage(url) {
    setForm((prev) => ({ ...prev, images: (prev.images || []).filter((img) => img !== url) }));
  }

  function removeEditImage(url) {
    setEdit((prev) => ({ ...prev, images: (prev.images || []).filter((img) => img !== url) }));
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
                    className={`admin-tab ${activeTab === 'reviews' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                  >
                    <i className="fa-solid fa-star"></i> Reviews
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
                              <th>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentOrders.length > 0 ? (
                              recentOrders.map(order => (
                                <tr key={order._id}>
                                  <td><code>{String(order._id).slice(-8)}</code></td>
                                  <td>{order.name}</td>
                                  <td>{order.phone}</td>
                                  <td>
                                    <strong>
                                      {order.metadata && order.metadata.requestType === 'custom-design' && Number(order.total || 0) <= 0
                                        ? 'Quote pending'
                                        : `PKR ${Number(order.total || 0).toLocaleString()}`}
                                    </strong>
                                  </td>
                                  <td>
                                    <span className={`order-status status-${order.paymentStatus}`}>
                                      {order.paymentStatus}
                                    </span>
                                  </td>
                                  <td>{formatOrderDate(order.createdAt)}</td>
                                  <td>{formatOrderTime(order.createdAt)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No orders yet</td></tr>
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
                            <th>Time</th>
                            <th>Details</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderGroups.length > 0 ? (
                            orderGroups.map((group, gi) => (
                              <Fragment key={'group-' + gi}>
                                <tr className="order-group-header">
                                  <td colSpan="16">
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
                                        {order.items && order.items.length > 0 ? (
                                          order.items.map((it, idx) => (
                                            <div key={idx} style={{ marginBottom: 6 }}>
                                              <div>{it.name} x {it.quantity || 1}</div>
                                              {order.metadata && order.metadata.requestType === 'custom-design' ? (
                                                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>
                                                  <div>Custom request</div>
                                                  {order.metadata.designNotes ? <div>Notes: {order.metadata.designNotes}</div> : null}
                                                  {order.metadata.budget ? <div>Budget: {order.metadata.budget}</div> : null}
                                                </div>
                                              ) : null}
                                            </div>
                                          ))
                                        ) : '—'}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="order-image" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        {order.items && order.items.length > 0 ? (
                                          order.items.map((it, idx) => (
                                            it.image ? (
                                              <a
                                                key={idx}
                                                href={imgUrl(it.image)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="order-image-link"
                                                title={`Open image${it.name ? `: ${it.name}` : ''}`}
                                              >
                                                <img src={imgUrl(it.image)} alt={it.name || ''} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                                              </a>
                                            ) : (
                                              <div key={idx} style={{ width: 48, height: 48, background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>—</div>
                                            )
                                          ))
                                        ) : (
                                          <span>—</span>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div>
                                        {order.items && order.items.length > 0 ? (
                                          order.items.map((it, idx) => <div key={idx}>{it.color || '—'}</div>)
                                        ) : '—'}
                                      </div>
                                    </td>
                                    <td>
                                      <div>
                                        {order.items && order.items.length > 0 ? (
                                          order.items.map((it, idx) => <div key={idx}>{it.size || '—'}</div>)
                                        ) : '—'}
                                      </div>
                                    </td>
                                    <td>
                                      {(() => {
                                        const paymentInfo = formatOrderPayment(order);
                                        const approvalBadge = getApprovalBadge(order);
                                        return (
                                          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                                            <div><strong>{paymentInfo.title}</strong></div>
                                            <div style={{ color: '#666' }}>{paymentInfo.detail}</div>
                                            {paymentInfo.sender ? <div style={{ color: '#666' }}>{paymentInfo.sender}</div> : null}
                                            {approvalBadge ? (
                                              <div
                                                style={{
                                                  marginTop: 6,
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  padding: '0.22rem 0.55rem',
                                                  borderRadius: 999,
                                                  fontSize: '0.72rem',
                                                  fontWeight: 700,
                                                  letterSpacing: '0.02em',
                                                  background: approvalBadge.background,
                                                  color: approvalBadge.color,
                                                  border: `1px solid ${approvalBadge.borderColor}`,
                                                }}
                                                title={getCustomApprovalBlockReason(order) || 'Custom order is ready for admin approval'}
                                              >
                                                {approvalBadge.label}
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td>
                                      <div className="order-items">
                                        {order.items && order.items.length > 0 && (
                                          <div>{order.items.length} item{order.items.length > 1 ? 's' : ''}</div>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <strong>{order.metadata && order.metadata.requestType === 'custom-design' && Number(order.total || 0) <= 0 ? 'Quote pending' : `PKR ${Number(order.total || 0).toLocaleString()}`}</strong>
                                    </td>
                                    <td>
                                      <select 
                                        className="order-status-select"
                                        value={order.paymentStatus}
                                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                                        disabled={updatingOrderStatus === order._id}
                                        title={getCustomApprovalBlockReason(order) || 'Update order status'}
                                      >
                                        <option value="pending">Pending</option>
                                        <option value="approved" disabled={order.paymentStatus !== 'approved' && !canApproveCustomOrder(order)}>Approved</option>
                                        <option value="completed">Completed</option>
                                        <option value="failed">Failed</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                      </select>
                                    </td>
                                    <td><small>{formatOrderDate(order.createdAt)}</small></td>
                                    <td><small>{formatOrderTime(order.createdAt)}</small></td>
                                    <td>
                                      <button
                                        className="admin-btn pdf"
                                        onClick={() => exportOrderPdf(order)}
                                        disabled={exportingOrderId === order._id}
                                        title="Open order PDF"
                                      >
                                        <i className="fa-solid fa-file-pdf"></i>
                                        <span>{exportingOrderId === order._id ? 'Preparing...' : 'Open PDF'}</span>
                                      </button>
                                    </td>
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
                            <tr><td colSpan="16" style={{ textAlign: 'center', padding: '20px' }}>
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
                        <div className="form-group">
                          <label>Gallery Images</label>
                          <input type="file" accept="image/*" multiple onChange={onUploadGalleryCreate} />
                          {uploadingCreate ? <div>Uploading...</div> : null}
                          {form.images && form.images.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                              {form.images.map((imgUrl, idx) => (
                                <div key={idx} style={{ position: 'relative' }}>
                                  <img src={imgUrl} alt={`Gallery ${idx + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                                  <button type="button" onClick={() => removeFormImage(imgUrl)} style={{ position: 'absolute', top: 4, right: 4, background: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="form-group"><label>Stock</label><input type="number" value={form.stock} onChange={e=>setForm({ ...form, stock: e.target.value })} /></div>
                        <div className="form-group"><label>Sale Discount (%)</label><input type="number" min="0" max="100" value={form.saleDiscount} onChange={e=>setForm({ ...form, saleDiscount: e.target.value })} placeholder="0-100" /></div>
                        
                        <div className="form-group">
                          <label>Colors</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                            {PRESET_COLORS.map(color => (
                              <label key={color} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <input type="checkbox" checked={formColorChecks[color] || false} onChange={e => setFormColorChecks({ ...formColorChecks, [color]: e.target.checked })} />
                                {color}
                              </label>
                            ))}
                          </div>
                          <input value={formCustomColors} onChange={e => setFormCustomColors(e.target.value)} placeholder="Custom colors (comma-separated)" />
                        </div>
                        
                        <div className="form-group">
                          <label>Sizes</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                            {PRESET_SIZES.map(size => (
                              <label key={size} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <input type="checkbox" checked={formSizeChecks[size] || false} onChange={e => setFormSizeChecks({ ...formSizeChecks, [size]: e.target.checked })} />
                                {size}
                              </label>
                            ))}
                          </div>
                          <input value={formCustomSizes} onChange={e => setFormCustomSizes(e.target.value)} placeholder="Custom (e.g., 10x10, 16x16, 20x20)" />
                        </div>
                        <div className="form-group"><label>Related Products</label><input value={form.relatedProductsText} onChange={e => setForm({ ...form, relatedProductsText: e.target.value })} placeholder="Enter related product IDs or slugs, comma-separated" /></div>
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
                                  <div className="form-group">
                                    <label>Gallery Images</label>
                                    <input type="file" accept="image/*" multiple onChange={onUploadGalleryEdit} />
                                    {uploadingEdit ? <div>Uploading...</div> : null}
                                    {edit.images && edit.images.length > 0 ? (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                        {edit.images.map((imgUrl, idx) => (
                                          <div key={idx} style={{ position: 'relative' }}>
                                            <img src={imgUrl} alt={`Gallery ${idx + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                                            <button type="button" onClick={() => removeEditImage(imgUrl)} style={{ position: 'absolute', top: 4, right: 4, background: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>×</button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="form-group"><label>Stock</label><input type="number" value={edit.stock} onChange={e => setEdit({ ...edit, stock: e.target.value })} /></div>
                                  <div className="form-group"><label>Sale Discount (%)</label><input type="number" min="0" max="100" value={edit.saleDiscount} onChange={e => setEdit({ ...edit, saleDiscount: e.target.value })} placeholder="0-100" /></div>
                                  
                                  <div className="form-group">
                                    <label>Colors</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                      {PRESET_COLORS.map(color => (
                                        <label key={color} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                          <input type="checkbox" checked={editColorChecks[color] || false} onChange={e => setEditColorChecks({ ...editColorChecks, [color]: e.target.checked })} />
                                          {color}
                                        </label>
                                      ))}
                                    </div>
                                    <input value={editCustomColors} onChange={e => setEditCustomColors(e.target.value)} placeholder="Custom colors (comma-separated)" />
                                  </div>
                                  
                                  <div className="form-group">
                                    <label>Sizes</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                      {PRESET_SIZES.map(size => (
                                        <label key={size} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                          <input type="checkbox" checked={editSizeChecks[size] || false} onChange={e => setEditSizeChecks({ ...editSizeChecks, [size]: e.target.checked })} />
                                          {size}
                                        </label>
                                      ))}
                                    </div>
                                    <input value={editCustomSizes} onChange={e => setEditCustomSizes(e.target.value)} placeholder="Custom (e.g., 10x10, 16x16, 20x20)" />
                                  </div>
                                  <div className="form-group"><label>Related Products</label><input value={edit.relatedProductsText} onChange={e => setEdit({ ...edit, relatedProductsText: e.target.value })} placeholder="Enter related product IDs or slugs, comma-separated" /></div>
                                  
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

                {/* REVIEWS TAB */}
                {activeTab === 'reviews' && (
                  <div className="admin-section">
                    <h3 className="admin-title">Review Management</h3>
                    <ReviewsManagement 
                      token={auth.token}
                      onReviewUpdate={() => {}}
                    />
                  </div>
                )}

                {/* REPORTS TAB */}
                {activeTab === 'reports' && (
                  <div className="admin-section">
                    <h3 className="admin-title">Order Analytics</h3>
                    <AnalyticsSummary 
                      dailyData={report.daily || []} 
                      monthlyData={report.monthly || []} 
                    />
                    <AnalyticsCharts 
                      dailyData={report.daily || []} 
                      monthlyData={report.monthly || []} 
                    />
                    <AnalyticsCalendar dailyData={report.daily || []} />
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
