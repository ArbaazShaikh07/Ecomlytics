import { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChurnAnalysis = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChurnData();
  }, []);

  const fetchChurnData = async () => {
    try {
      const response = await axios.get(`${API}/churn`);
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Error fetching churn data:', error);
      toast.error('Failed to fetch churn data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/export/csv/churn`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'churn_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export report');
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getChurnRiskLevel = (probability) => {
    if (probability >= 0.7) return { label: 'High', color: 'bg-red-100 text-red-700' };
    if (probability >= 0.4) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Low', color: 'bg-green-100 text-green-700' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="space-y-8" data-testid="churn-page">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Customer Churn Analysis</h1>
          <p className="text-slate-600 mt-2">Identify at-risk customers</p>
        </div>
        <div className="text-center py-12">
          <p className="text-slate-600" data-testid="no-churn-message">No customer data available. Please upload customer and order data first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="churn-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-800">Customer Churn Analysis</h1>
        <p className="text-slate-600 mt-2">Identify at-risk customers and take action</p>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <Input
                data-testid="search-customers-input"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              data-testid="export-churn-btn"
              onClick={handleExport} 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              <Download size={20} className="mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="stat-high-risk">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">High Risk</p>
            <p className="text-3xl font-bold text-red-600">
              {customers.filter(c => c.churn_probability >= 0.7).length}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="stat-medium-risk">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Medium Risk</p>
            <p className="text-3xl font-bold text-yellow-600">
              {customers.filter(c => c.churn_probability >= 0.4 && c.churn_probability < 0.7).length}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="stat-low-risk">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Low Risk</p>
            <p className="text-3xl font-bold text-green-600">
              {customers.filter(c => c.churn_probability < 0.4).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Table */}
      <Card data-testid="customer-churn-table">
        <CardHeader>
          <CardTitle>Customer Churn Risk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Customer ID</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Email</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Last Purchase</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Total Spent</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Orders</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Churn Risk</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Probability</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => {
                  const riskLevel = getChurnRiskLevel(customer.churn_probability);
                  return (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm text-slate-700">{customer.customer_id}</td>
                      <td className="p-4 text-sm text-slate-700">{customer.name}</td>
                      <td className="p-4 text-sm text-slate-600">{customer.email}</td>
                      <td className="p-4 text-sm text-slate-600">{customer.last_purchase_date || 'N/A'}</td>
                      <td className="p-4 text-sm font-semibold text-slate-800">${customer.total_spent?.toFixed(2) || '0.00'}</td>
                      <td className="p-4 text-sm text-slate-600">{customer.order_count || 0}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${riskLevel.color}`}>
                          {riskLevel.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-800">
                        {(customer.churn_probability * 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChurnAnalysis;