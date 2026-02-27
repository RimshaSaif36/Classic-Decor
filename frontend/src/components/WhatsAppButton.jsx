import { useState, useEffect } from 'react';

export default function WhatsAppButton() {
  const [showNotification, setShowNotification] = useState(false);
  const phoneNumber = '923184642255'; // WhatsApp format with country code
  const message = 'Hi, I am interested in your products';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  useEffect(() => {
    // Show notification every 8 seconds (visible for 2 seconds)
    const interval = setInterval(() => {
      setShowNotification(true);
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 2500);
      return () => clearTimeout(timer);
    }, 8000);

    // Show first notification after 3 seconds
    const initialTimer = setTimeout(() => {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2500);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, []);

  return (
    <>
      {/* Notification popup */}
      {showNotification && (
        <div className="whatsapp-notification">
          <span className="notification-text">Chat with us</span>
          <span className="notification-badge">1</span>
        </div>
      )}

      {/* WhatsApp button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-button"
        title="Chat on WhatsApp"
        aria-label="Chat with us on WhatsApp"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 256 256"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M128 0C57.307 0 0 57.309 0 128c0 22.519 5.758 43.866 15.925 62.531L2.169 255.831l67.885-21.756C106.134 250.242 127.481 256 128 256c70.693 0 128-57.309 128-128S198.693 0 128 0zm0 234.667c-19.146 0-39.215-4.992-57.339-13.984l-41.666 13.464 13.722-41.864C22.097 159.295 21.334 143.801 21.334 128c0-59.143 48.192-107.333 107.333-107.333 59.341 0 107.333 48.192 107.333 107.333S187.141 234.667 128 234.667z"/>
          <path d="M195.2 155.733c-3.2-1.6-18.934-9.334-21.867-10.4-2.667-1.067-4.667-1.6-6.667 1.6-2 2.933-7.467 9.334-9.066 11.334-1.867 1.867-3.733 2.133-7.067 0.533-3.2-1.6-13.867-5.067-26.4-16.267-9.734-8.667-16.4-19.333-18.267-22.667-1.867-3.333-0.2-5.067 1.6-6.933 1.6-1.6 3.733-4.267 5.6-6.4 1.867-2 2.4-3.467 3.733-5.333 1.067-1.867 0.533-3.333-0.267-4.8-0.8-1.6-6.667-16.267-9.2-22.4-2.4-5.867-5.067-5.067-6.933-5.067-1.867 0-3.733-0.267-5.6-0.267-2 0-5.067 0.8-8 3.733-2.933 2.933-10.933 10.4-10.933 25.333 0 15.067 11.2 29.333 12.8 31.2 1.867 1.867 26.4 40.533 64 57.067 9.067 3.733 16.267 5.867 21.867 7.733 9.067 2.933 17.333 2.4 23.733 1.467 7.333-1.067 22.933-9.334 26.133-18.267 3.2-9.067 3.2-16.533 2.133-18.4-0.8-1.867-2.933-2.933-6.133-4.533z"/>
        </svg>
      </a>
    </>
  );
}
