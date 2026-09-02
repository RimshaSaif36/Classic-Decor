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

  // Support multiple messages; fall back to single text for backward compatibility
  const messages = Array.isArray(data.messages) && data.messages.length > 0
    ? data.messages
    : (data.text ? [data.text] : []);

  const isInternalLink = data.link && (data.link.startsWith('/') || data.link.startsWith('#'));

  const contentForText = (text) => (
    <span className="announcement-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span>{text}</span>
      {data.link && (
        <span className="announcement-cta">
          <i className="fa-solid fa-arrow-right-long announcement-arrow"></i>
        </span>
      )}
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
        {data.scroll && messages.length > 0 ? (
          // Smooth CSS marquee: duplicate the messages so animation can loop seamlessly
          <div style={{ width: '100%', overflow: 'hidden' }}>
            <style>{`
              .cd-announcement-marquee-track { display: flex; gap: 48px; align-items: center; }
              .cd-announcement-marquee { overflow: hidden; width: 100%; }
              @keyframes cd-marquee { from { transform: translateX(0%);} to { transform: translateX(-50%);} }
            `}</style>
            <div className="cd-announcement-marquee" aria-hidden="false">
              <div
                className="cd-announcement-marquee-track"
                style={{
                  color: data.textColor || '#ffffff',
                  animation: `cd-marquee ${Math.max(12, messages.join(' ').length / 8 * 6)}s linear infinite`,
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Render messages twice for seamless loop */}
                {messages.map((m, i) => (
                  <div key={`m1-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{contentForText(m)}</div>
                ))}
                {messages.map((m, i) => (
                  <div key={`m2-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{contentForText(m)}</div>
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
