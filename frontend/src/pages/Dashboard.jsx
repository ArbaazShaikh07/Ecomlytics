import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      const response = await axios.get(`${API}/kpis`);
      setKpis(response.data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600" data-testid="no-data-message">No data available. Please upload data first.</p>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `$${kpis.total_revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-blue-500 to-cyan-500',
      testId: 'kpi-total-revenue'
    },
    {
      title: 'Total Orders',
      value: kpis.total_orders.toLocaleString(),
      icon: ShoppingCart,
      color: 'from-purple-500 to-pink-500',
      testId: 'kpi-total-orders'
    },
    {
      title: 'Avg Order Value',
      value: `$${kpis.avg_order_value.toFixed(2)}`,
      icon: TrendingUp,
      color: 'from-green-500 to-teal-500',
      testId: 'kpi-avg-order-value'
    },
    {
      title: 'Churn Rate',
      value: `${(kpis.churn_rate * 100).toFixed(1)}%`,
      icon: Users,
      color: 'from-orange-500 to-red-500',
      testId: 'kpi-churn-rate'
    },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-600 mt-2">Overview of your e-commerce performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-shadow duration-300" data-testid={kpi.testId}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{kpi.title}</p>
                    <p className="text-3xl font-bold text-slate-800">{kpi.value}</p>
                  </div>
                  <div className={`p-4 rounded-full bg-gradient-to-br ${kpi.color}`}>
                    <Icon className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card data-testid="top-products-chart">
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kpis.top_products}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="product_name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card data-testid="category-revenue-chart">
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={kpis.revenue_by_category}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.category}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {kpis.revenue_by_category.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;