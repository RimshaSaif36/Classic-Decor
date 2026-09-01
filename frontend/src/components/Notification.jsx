import { useState, useEffect } from 'react';

export default function Notification({ message, type = 'info', duration = 4000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration === 0) return;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColor = {
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    success: 'bg-green-500',
    info: 'bg-blue-500'
  }[type] || 'bg-blue-500';

  const icon = {
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
    success: 'fa-circle-check',
    info: 'fa-circle-info'
  }[type] || 'fa-circle-info';

  return (
    <div className={`fixed top-6 right-6 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slideInRight`}>
      <i className={`fa-solid ${icon}`}></i>
      <span className="font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="ml-2 opacity-80 hover:opacity-100"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
