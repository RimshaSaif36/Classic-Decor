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

  if (!loaded || !data.enabled || !data.text || closed) {
    return null;
  }

  const isInternalLink = data.link && (data.link.startsWith('/') || data.link.startsWith('#'));

  const content = (
    <span className="announcement-text">
      {data.text}
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
        {data.link ? (
          isInternalLink ? (
            <Link
              to={data.link}
              className="announcement-link"
              style={{ color: data.textColor || '#ffffff' }}
            >
              {content}
            </Link>
          ) : (
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="announcement-link"
              style={{ color: data.textColor || '#ffffff' }}
            >
              {content}
            </a>
          )
        ) : (
          <div className="announcement-content">{content}</div>
        )}
        <button
          type="button"
          className="announcement-close"
          onClick={() => setClosed(true)}
          aria-label="Close announcement"
          style={{ color: data.textColor || '#ffffff' }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    </aside>
  );
}
