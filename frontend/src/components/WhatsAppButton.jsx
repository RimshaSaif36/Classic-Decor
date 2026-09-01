import { useState, useEffect } from 'react';

export default function WhatsAppButton() {
  const [showNotification, setShowNotification] = useState(false);
  const phoneNumber = '923110721400'; // WhatsApp format with country code
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
          viewBox="0 0 24 24"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.15-1.739-.861-2.008-.96-.268-.098-.461-.147-.655.147-.194.294-.759.954-.929 1.149-.168.194-.337.21-.633.066-.297-.147-1.254-.462-2.387-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.297.297-.495.099-.198.05-.371-.025-.52-.075-.148-.655-1.611-.898-2.206-.237-.586-.474-.507-.655-.516-.17-.009-.363-.01-.556-.01-.193 0-.507.073-.772.366-.265.293-1.004 1.002-1.004 2.441 0 1.438 1.028 2.837 1.171 3.031.143.194 2.01 3.124 4.872 4.368.68.295 1.211.468 1.624.599.682.216 1.304.186 1.794.112.547-.083 1.739-.71 1.982-1.395.243-.686.243-1.273.17-1.395-.073-.122-.27-.195-.566-.342z"/>
          <path d="M20.52 3.449C18.24 1.245 15.589 0 12.612 0 6.502 0 1.493 5.148 1.493 11.75c0 2.05.549 4.063 1.595 5.821L0 24l6.514-2.183c1.681.921 3.646 1.426 5.629 1.426 6.112 0 11.121-5.147 11.121-11.75 0-3.15-1.231-6.116-3.464-8.354zm-7.908 18.3c-1.76 0-3.476-.471-4.988-1.364l-.358-.214-3.71 1.243 1.265-3.72-.214-.359A9.75 9.75 0 0 1 2.794 11.75c0-5.411 4.41-9.823 9.823-9.823 2.62 0 5.093 1.025 6.952 2.882 1.859 1.859 2.883 4.331 2.883 6.951 0 5.411-4.41 9.823-9.823 9.823z"/>
        </svg>
      </a>
    </>
  );
}
