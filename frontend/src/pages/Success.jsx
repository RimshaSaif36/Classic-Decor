import { useEffect, useRef, useState } from 'react'
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

function fmtOrderItems(items) {
  if (!Array.isArray(items)) return []

  return items.map((item, index) => {
    const name = item?.name || item?.title || item?.id || `Item ${index + 1}`
    const quantity = item?.quantity || 1
    return `${name} x ${quantity}`
  })
}

export default function Success() {
  const initialOrder = (() => {
    try {
      return JSON.parse(localStorage.getItem('lastOrder') || 'null')
    } catch (e) {
      void e
      return null
    }
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
    } catch (e) {
      void e
    }
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

    try {
      window.history.replaceState(null, '', window.location.pathname)
    } catch (e) {
      void e
    }
  }, [params])

  function renderSummary(currentOrder) {
    if (!currentOrder) return null

    const items = fmtOrderItems(currentOrder.items)

    return (
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{ textAlign: 'center', padding: '1.25rem 0 0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '2.45rem', color: '#1f1f1f', lineHeight: 1.15 }}>Thank You For Your Order</h2>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #eee3c5',
            borderRadius: 18,
            padding: '1.5rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#2a2a2a', textAlign: 'center' }}>Order Summary</h3>
            <div style={{ display: 'grid', gap: '0.9rem', textAlign: 'center' }}>
              <p style={{ margin: 0 }}><strong>Name:</strong> {currentOrder.name || ''}</p>
              <p style={{ margin: 0 }}><strong>Phone:</strong> {currentOrder.phone || ''}</p>
              <p style={{ margin: 0 }}><strong>Address:</strong> {[currentOrder.address, currentOrder.city].filter(Boolean).join(', ')}</p>
              <div>
                <strong>Items:</strong>
                <div style={{ marginTop: '0.45rem', display: 'grid', gap: '0.4rem' }}>
                  {items.map((item) => (
                    <div
                      key={item}
                      style={{
                        padding: '0.7rem 0.9rem',
                        background: '#faf7ef',
                        borderRadius: 12,
                        color: '#4a4a4a'
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f0eadc', display: 'grid', gap: '0.55rem' }}>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><strong>{fmtCurrency(currentOrder.subtotal)}</strong></p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}><span>Shipping</span><strong>{fmtCurrency(currentOrder.shipping)}</strong></p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', fontSize: '1.08rem', color: '#b8860b' }}><span>Total</span><strong>{fmtCurrency(currentOrder.total)}</strong></p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header />
      <main>
        <section className="shop-products" style={{ padding: '2rem 1rem' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {order ? renderSummary(order) : <p>{message}</p>}
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link className="shop-btn" to="/shop">Continue Shopping</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
