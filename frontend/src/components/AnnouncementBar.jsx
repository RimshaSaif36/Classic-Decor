import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../lib/config';

export default function AnnouncementBar() {
  const [data, setData] = useState({
    enabled: false,
    text: '',
    link: '',
    bgColor: '#1a1a1a',
    textColor: '#ffffff',
  });
  const [closed, setClosed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchAnnouncement = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/announcement`);
      if (res.ok) {
        const json = await res.json();
        setData({
          enabled: Boolean(json.enabled),
          text: json.text || '',
          link: json.link || '',
          bgColor: json.bgColor || '#1a1a1a',
          textColor: json.textColor || '#ffffff',
        });
      }
    } catch {
      // ignore network errors
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchAnnouncement();

    const handleUpdate = (e) => {
      if (e && e.detail) {
        setData({
          enabled: Boolean(e.detail.enabled),
          text: e.detail.text || '',
          link: e.detail.link || '',
          bgColor: e.detail.bgColor || '#1a1a1a',
          textColor: e.detail.textColor || '#ffffff',
        });
        setClosed(false);
      } else {
        fetchAnnouncement();
      }
    };

    window.addEventListener('announcement-updated', handleUpdate);
    return () => {
      window.removeEventListener('announcement-updated', handleUpdate);
    };
  }, []);

  if (!loaded || !data.enabled) {
    return null;
  }

  // Minimal local messages array (RIGHT->LEFT marquee). Use fetched `data.text` as first message if available,
  // then append a couple of local messages. This keeps changes local to this file only.
  const base = data.text && data.text.trim() ? data.text.trim() : 'EXCLUSIVE OFFERS UP TO 47% OFF';
  const messages = [
    base,
    'FREE DELIVERY on orders over PKR 3,000',
    'NEW ARRIVALS — Shop the latest collection',
    'LIMITED TIME: 10% OFF SITEWIDE',
    'SHOP NOW — Easy Returns & Secure Payment',
  ];

  const isInternalLink = data.link && (data.link.startsWith('/') || data.link.startsWith('#'));

  const contentForText = (text) => (
    <span className="announcement-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span>{text}</span>
    </span>
  );

  return (
    <aside
      className="announcement-bar"
      style={{
        backgroundColor: data.bgColor || '#1a1a1a',
        color: data.textColor || '#ffffff',
      }}
      aria-label="Store Announcement"
    >
      <div className="announcement-container">
        {messages.length > 0 ? (
          // Smooth CSS marquee: duplicate the messages so animation can loop seamlessly
          <div style={{ width: '100%', overflow: 'hidden' }}>
            <style>{`
              .cd-announcement-marquee { overflow: hidden; width: 100%; }
              .cd-announcement-marquee-track { display: flex; align-items: center; }
              @keyframes cd-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            `}</style>
            <div className="cd-announcement-marquee" aria-hidden="false">
              <div
                  className="cd-announcement-marquee-track"
                  style={{
                    color: data.textColor || '#ffffff',
                      // Fixed duration for visible smooth motion (right -> left). Adjust if needed.
                      animation: `cd-marquee 22s linear infinite`,
                    whiteSpace: 'nowrap',
                    // force items to be on a single line
                  }}
                >
                {/* Render messages twice for seamless loop */}
                  {messages.map((m, i) => (
                    <div key={`m1-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginRight: 80 }}>{contentForText(m)}</div>
                  ))}
                  {messages.map((m, i) => (
                    <div key={`m2-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginRight: 80 }}>{contentForText(m)}</div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          // Static display: render first message (or nothing)
          <div className="announcement-content">{messages.length ? contentForText(messages[0]) : null}</div>
        )}
        {/* Close button removed: announcement cannot be dismissed from storefront (admin-only control) */}
      </div>
    </aside>
  );
}
