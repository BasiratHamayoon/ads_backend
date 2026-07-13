// Format response
const formatResponse = (success, message, data = null, meta = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return response;
};

// Calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return (((current - previous) / previous) * 100).toFixed(1);
};

// Get date ranges for dashboard
const getDateRanges = () => {
  const now = new Date();
  
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const last30DaysStart = new Date(now);
  last30DaysStart.setDate(now.getDate() - 30);

  const last7DaysStart = new Date(now);
  last7DaysStart.setDate(now.getDate() - 7);

  return {
    todayStart,
    todayEnd,
    thisWeekStart,
    thisMonthStart,
    lastMonthStart,
    lastMonthEnd,
    last30DaysStart,
    last7DaysStart
  };
};

module.exports = {
  formatResponse,
  calculatePercentageChange,
  getDateRanges
};