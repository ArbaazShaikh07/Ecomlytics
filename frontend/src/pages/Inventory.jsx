import { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API}/inventory`);
      setInventory(response.data.inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/export/csv/inventory`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="space-y-8" data-testid="inventory-page">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Inventory Optimization</h1>
          <p className="text-slate-600 mt-2">Manage stock levels and reorder points</p>
        </div>
        <div className="text-center py-12">
          <p className="text-slate-600" data-testid="no-inventory-message">No inventory data available. Please upload inventory data first.</p>
        </div>
      </div>
    );
  }

  const needsReorder = inventory.filter(item => item.needs_reorder).length;
  const inStock = inventory.filter(item => !item.needs_reorder).length;

  return (
    <div className="space-y-8" data-testid="inventory-page">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Inventory Optimization</h1>
          <p className="text-slate-600 mt-2">Manage stock levels and reorder points</p>
        </div>
        <Button 
          data-testid="export-inventory-btn"
          onClick={handleExport} 
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
        >
          <Download size={20} className="mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="stat-needs-reorder">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Needs Reorder</p>
                <p className="text-3xl font-bold text-red-600">{needsReorder}</p>
              </div>
              <div className="p-4 rounded-full bg-red-100">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-in-stock">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">In Stock</p>
                <p className="text-3xl font-bold text-green-600">{inStock}</p>
              </div>
              <div className="p-4 rounded-full bg-green-100">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card data-testid="inventory-table">
        <CardHeader>
          <CardTitle>Inventory Status & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Category</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Current Stock</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Reorder Point</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Predicted Demand</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Unit Cost</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Recommended Order</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, index) => (
                  <tr key={index} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    item.needs_reorder ? 'bg-red-50' : ''
                  }`}>
                    <td className="p-4 text-sm text-slate-700 font-medium">{item.product_name}</td>
                    <td className="p-4 text-sm text-slate-600">{item.category}</td>
                    <td className="p-4 text-sm text-slate-800 font-semibold">{item.current_stock}</td>
                    <td className="p-4 text-sm text-slate-600">{item.reorder_point}</td>
                    <td className="p-4 text-sm text-slate-700">{Math.round(item.predicted_demand)}</td>
                    <td className="p-4 text-sm text-slate-600">${item.unit_cost.toFixed(2)}</td>
                    <td className="p-4 text-sm font-semibold text-blue-600">
                      {item.recommended_order_qty > 0 ? item.recommended_order_qty : '-'}
                    </td>
                    <td className="p-4">
                      {item.needs_reorder ? (
                        <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 w-fit">
                          <AlertTriangle size={14} />
                          Reorder Now
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 w-fit">
                          <CheckCircle size={14} />
                          In Stock
                        </span>
                      )}
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

export default Inventory;