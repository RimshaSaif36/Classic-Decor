import React from 'react';

// Stat Card Component - declared outside to avoid recreation on render
const StatCard = ({ icon, label, value, subtext, color }) => (
  <div className="stat-card">
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div className="stat-content">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {subtext && <p className="stat-subtext">{subtext}</p>}
    </div>
  </div>
);

const AnalyticsSummary = ({ dailyData = [], monthlyData = [] }) => {
  // Calculate metrics
  const calculateMetrics = () => {
    const totalOrders = dailyData.reduce((sum, d) => sum + (d.orders || 0), 0);
    const totalRevenue = dailyData.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    // Monthly comparison
    const monthlyOrders = monthlyData.reduce((sum, m) => sum + (m.orders || 0), 0);
    const monthlyRevenue = monthlyData.reduce((sum, m) => sum + (m.revenue || 0), 0);
    
    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      monthlyOrders,
      monthlyRevenue,
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="analytics-summary">
      <div className="summary-grid">
        <StatCard
          icon="📦"
          label="Total Orders (This Month)"
          value={metrics.totalOrders}
          color="gold"
        />
        <StatCard
          icon="💰"
          label="Total Revenue (This Month)"
          value={`PKR ${metrics.totalRevenue.toLocaleString()}`}
          color="green"
        />
        <StatCard
          icon="📊"
          label="Avg Order Value"
          value={`PKR ${metrics.avgOrderValue.toLocaleString()}`}
          color="blue"
        />
        <StatCard
          icon="📈"
          label="All Time Orders"
          value={metrics.monthlyOrders}
          color="purple"
        />
      </div>
    </div>
  );
};

export default AnalyticsSummary;
