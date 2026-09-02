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
      const url = `${API_BASE}/api/settings/announcement`;
      console.log('[AnnouncementBar] fetching announcement from:', url);
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        console.log('[AnnouncementBar] announcement response JSON:', json);
        setData({
          enabled: Boolean(json.enabled),
          text: json.text || '',
          link: json.link || '',
          bgColor: json.bgColor || '#1a1a1a',
          textColor: json.textColor || '#ffffff',
          // include messages from server so render uses them (avoid falling back to local hardcoded messages)
          messages: Array.isArray(json.messages) && json.messages.length > 0 ? json.messages : undefined,
        });
        console.log('[AnnouncementBar] state set to:', {
          enabled: Boolean(json.enabled),
          text: json.text || '',
          messages: json.messages || undefined,
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
        console.log('[AnnouncementBar] announcement-updated event detail:', e.detail);
        setData({
          enabled: Boolean(e.detail.enabled),
          text: e.detail.text || '',
          link: e.detail.link || '',
          bgColor: e.detail.bgColor || '#1a1a1a',
          textColor: e.detail.textColor || '#ffffff',
          messages: e.detail.messages || undefined,
        });
        setClosed(false);
      } else {
        fetchAnnouncement();
      }
    };

    // Listen for announcement-updated events (same-tab admin save)
    window.addEventListener('announcement-updated', handleUpdate);
    // Also refetch when the window/tab gains focus (covers cross-tab updates)
    window.addEventListener('focus', fetchAnnouncement);
    // Also refetch on storage changes (if another tab writes a key)
    window.addEventListener('storage', fetchAnnouncement);

    return () => {
      window.removeEventListener('announcement-updated', handleUpdate);
      window.removeEventListener('focus', fetchAnnouncement);
      window.removeEventListener('storage', fetchAnnouncement);
    };
  }, []);

  if (!loaded || !data.enabled) {
    return null;
  }

  // Use server-provided messages when available; otherwise use a small local set.
  const base = data.text && data.text.trim() ? data.text.trim() : 'EXCLUSIVE OFFERS UP TO 47% OFF';
  const localMessages = [
    base,
    'FREE DELIVERY on orders over PKR 3,000',
    'NEW ARRIVALS — Shop the latest collection',
    'LIMITED TIME: 10% OFF SITEWIDE',
  ];
  const messages = Array.isArray(data.messages) && data.messages.length > 0 ? data.messages : localMessages;
  console.log('[AnnouncementBar] messages used for render:', messages);

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
