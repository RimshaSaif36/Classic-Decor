import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const AnalyticsCharts = ({ dailyData = [], monthlyData = [] }) => {
  // Prepare data for daily chart (last 15 days)
  const last15Days = dailyData.slice(-15);

  // Prepare data for monthly chart
  const monthlyChartData = monthlyData.map(item => ({
    ...item,
    month: item.month ? item.month.substring(5) : item.month, // Show only MM
  }));

  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{data.date || data.month}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-charts-container">
      {/* Daily Orders & Revenue Trend */}
      <div className="chart-card">
        <h4 className="chart-title">📈 Daily Orders & Revenue (Last 15 Days)</h4>
        {last15Days.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={last15Days}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22b14c" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22b14c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis
                dataKey="date"
                stroke="#999"
                style={{ fontSize: '0.8rem' }}
                tick={{ angle: -45, textAnchor: 'end', height: 80 }}
              />
              <YAxis stroke="#999" style={{ fontSize: '0.8rem' }} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#d4af37"
                strokeWidth={2}
                name="Orders"
                dot={{ fill: '#d4af37', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#22b14c"
                strokeWidth={2}
                name="Revenue (PKR)"
                dot={{ fill: '#22b14c', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="chart-no-data">No data available</p>
        )}
      </div>

      {/* Monthly Orders Bar Chart */}
      <div className="chart-card">
        <h4 className="chart-title">📊 Monthly Orders Distribution</h4>
        {monthlyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4af37" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#e6c550" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis dataKey="month" stroke="#999" style={{ fontSize: '0.8rem' }} />
              <YAxis stroke="#999" style={{ fontSize: '0.8rem' }} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar
                dataKey="orders"
                fill="url(#barGradient)"
                name="Orders"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="chart-no-data">No data available</p>
        )}
      </div>

      {/* Monthly Revenue Bar Chart */}
      <div className="chart-card">
        <h4 className="chart-title">💰 Monthly Revenue Distribution</h4>
        {monthlyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22b14c" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#5fc96f" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis dataKey="month" stroke="#999" style={{ fontSize: '0.8rem' }} />
              <YAxis stroke="#999" style={{ fontSize: '0.8rem' }} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar
                dataKey="revenue"
                fill="url(#revenueGradient)"
                name="Revenue (PKR)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="chart-no-data">No data available</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsCharts;
