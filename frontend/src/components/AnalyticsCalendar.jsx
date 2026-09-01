import React, { useState, useMemo } from 'react';

const AnalyticsCalendar = ({ dailyData = [] }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const dataMap = useMemo(() => {
    const map = new Map();
    dailyData.forEach(item => {
      map.set(item.date, item);
    });
    return map;
  }, [dailyData]);

  const getDayData = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dataMap.get(dateStr);
  };

  const getDayColor = (day) => {
    const data = getDayData(day);
    if (!data) return 'transparent';
    if (data.orders > 5) return '#d4af37'; // Gold - High traffic
    if (data.orders > 2) return '#ffc107'; // Yellow - Medium
    if (data.orders > 0) return '#90ee90'; // Light green - Low
    return 'transparent';
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const selectedData = selectedDate ? dataMap.get(selectedDate) : null;

  const days = [];
  const totalDays = daysInMonth(currentMonth);
  const startDay = firstDayOfMonth(currentMonth);

  // Empty cells for days before month starts
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-empty"></div>);
  }

  // Days of the month
  for (let day = 1; day <= totalDays; day++) {
    const data = getDayData(day);
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = selectedDate === dateStr;
    
    days.push(
      <div
        key={day}
        className={`calendar-day ${isSelected ? 'selected' : ''} ${data?.orders > 0 ? 'has-data' : ''}`}
        onClick={() => handleDateClick(day)}
        style={{
          backgroundColor: isSelected ? '#d4af37' : getDayColor(day)
        }}
      >
        <div className="calendar-day-number">{day}</div>
        {data && data.orders > 0 && (
          <div className="calendar-day-info">
            <div className="calendar-orders">{data.orders}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="analytics-calendar-wrapper">
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={handlePrevMonth}>←</button>
          <h3 className="calendar-month-year">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button className="calendar-nav-btn" onClick={handleNextMonth}>→</button>
        </div>

        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>

        <div className="calendar-days">
          {days}
        </div>

        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#d4af37' }}></div>
            <span>High (5+ orders)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ffc107' }}></div>
            <span>Medium (2-4 orders)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#90ee90' }}></div>
            <span>Low (1 order)</span>
          </div>
        </div>
      </div>

      {selectedData && (
        <div className="selected-date-info">
          <h4 className="info-title">📅 {selectedDate}</h4>
          <div className="info-grid">
            <div className="info-card">
              <span className="info-label">Total Orders</span>
              <span className="info-value orders">{selectedData.orders}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Revenue</span>
              <span className="info-value revenue">PKR {Number(selectedData.revenue || 0).toLocaleString()}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Avg Order Value</span>
              <span className="info-value average">
                PKR {selectedData.orders > 0 ? Math.round(selectedData.revenue / selectedData.orders).toLocaleString() : '0'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsCalendar;
