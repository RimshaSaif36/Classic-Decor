import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

function fmtCurrency(n) {
  try {
    return 'PKR ' + Number(n).toFixed(0)
  } catch (e) {
    void e
    return n
  }
}

export default function Success() {
  const initialOrder = (() => {
    try {
      return JSON.parse(localStorage.getItem('lastOrder') || 'null')
    } catch (e) { void e; return null }
  })()
  const initialOrderRef = useRef(initialOrder)
  const [order, setOrder] = useState(initialOrder)
  const [message, setMessage] = useState(initialOrder ? '' : 'Fetching order details...')
  const [params] = useSearchParams()
  function clearCart() {
    try {
      localStorage.setItem('cart', JSON.stringify([]))
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { total: 0 } }))
      if (window.showMessage) window.showMessage('Order placed successfully!', 'success')
    } catch (e) { void e }
  }

  useEffect(() => {
    const cancel = params.get('cancel')
    const pfReturn = params.get('pf_return')
    const mPaymentId = params.get('m_payment_id')
    if (cancel) {
      setTimeout(() => {
        setOrder(null)
        setMessage('Payment cancelled. No charge was made.')
      }, 0)
    } else if (pfReturn || mPaymentId) {
      setTimeout(() => {
        setOrder(initialOrderRef.current)
        clearCart()
      }, 0)
    } else if (initialOrderRef.current) {
      setTimeout(() => {
        clearCart()
      }, 0)
    } else {
      setTimeout(() => setMessage('Order details unavailable.'), 0)
    }
    // remove session id from URL
    try { window.history.replaceState(null, '', window.location.pathname) } catch (e) { void e }
  }, [params])
  

  function renderSummary(o) {
    if (!o) return null
    const fmtItems = (it) => {
      if (!it) return ''
      if (typeof it === 'string') return it
      if (Array.isArray(it)) {
        return it
          .map((x) => {
            try {
              if (typeof x === 'string') return x
              return `${x.name || x.title || x.id || 'item'} x ${x.quantity || 1}`
            } catch (e) { void e; return String(x) }
          })
          .join(', ')
      }
      // object
      try {
        return Object.keys(it)
          .map((k) => `${k}: ${String(it[k])}`)
          .join(', ')
      } catch (e) { void e; return String(it) }
    }
    return (
      <div className="order-card">
        <p><strong>Name:</strong> {o.name || ''}</p>
        <p><strong>Phone:</strong> {o.phone || ''}</p>
        <p><strong>Address:</strong> {o.address || ''}</p>
        <p><strong>Items:</strong> {fmtItems(o.items)}</p>
        {o.sizes ? <p><strong>Sizes:</strong> {fmtItems(o.sizes)}</p> : null}
        {o.colors ? <p><strong>Colors:</strong> {fmtItems(o.colors)}</p> : null}
        <p><strong>Subtotal:</strong> {fmtCurrency(o.subtotal)}</p>
        <p><strong>Shipping:</strong> {fmtCurrency(o.shipping)}</p>
        <p><strong>Total:</strong> {fmtCurrency(o.total)}</p>
      </div>
    )
  }

  return (
    <div>
      <Header />
      <main>
        <section className="shop-products" style={{ padding: '2rem 1rem' }}>
          <h2>{order ? 'Order Placed Successfully' : 'Payment Status'}</h2>
          <div style={{ maxWidth: 800, margin: '1rem auto', background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1rem 1.25rem' }}>
            {order ? renderSummary(order) : <p>{message}</p>}
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link className="shop-btn" to="/shop">Continue Shopping</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
