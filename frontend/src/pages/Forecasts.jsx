import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];

const Forecasts = () => {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchForecasts();
  }, []);

  const fetchForecasts = async () => {
    try {
      const response = await axios.get(`${API}/forecast`);
      setForecasts(response.data.forecasts);
      
      const uniqueProducts = [...new Set(response.data.forecasts.map(f => f.product_id))];
      setProducts(uniqueProducts);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
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

  if (forecasts.length === 0) {
    return (
      <div className="space-y-8" data-testid="forecasts-page">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Sales Forecasts</h1>
          <p className="text-slate-600 mt-2">Predict future demand for your products</p>
        </div>
        <div className="text-center py-12">
          <p className="text-slate-600" data-testid="no-forecast-message">No forecast data available. Please upload order data first.</p>
        </div>
      </div>
    );
  }

  const filteredForecasts = selectedProduct === 'all' 
    ? forecasts 
    : forecasts.filter(f => f.product_id === selectedProduct);

  // Group by product for multi-line chart
  const chartData = {};
  filteredForecasts.forEach(forecast => {
    if (!chartData[forecast.forecast_date]) {
      chartData[forecast.forecast_date] = { date: forecast.forecast_date };
    }
    chartData[forecast.forecast_date][forecast.product_name] = forecast.predicted_quantity;
  });

  const chartDataArray = Object.values(chartData).sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const productNames = [...new Set(filteredForecasts.map(f => f.product_name))];

  return (
    <div className="space-y-8" data-testid="forecasts-page">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Sales Forecasts</h1>
          <p className="text-slate-600 mt-2">Predict future demand for your products</p>
        </div>
        <div className="w-64">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger data-testid="product-filter-select">
              <SelectValue placeholder="Select Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product} value={product}>
                  {product}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Forecast Chart */}
      <Card data-testid="forecast-chart">
        <CardHeader>
          <CardTitle>7-Day Demand Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartDataArray}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {productNames.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecast Table */}
      <Card data-testid="forecast-table">
        <CardHeader>
          <CardTitle>Detailed Forecasts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Category</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Predicted Quantity</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredForecasts.slice(0, 20).map((forecast, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-700">{forecast.product_name}</td>
                    <td className="p-4 text-sm text-slate-600">{forecast.category}</td>
                    <td className="p-4 text-sm text-slate-600">{forecast.forecast_date}</td>
                    <td className="p-4 text-sm font-semibold text-slate-800">{Math.round(forecast.predicted_quantity)}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {forecast.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Forecasts;