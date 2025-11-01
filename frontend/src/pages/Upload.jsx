import { useState } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, FileText, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Upload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dataType, setDataType] = useState('orders');
  const [uploading, setUploading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
      }
    }
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('collection', dataType);

    try {
      const response = await axios.post(`${API}/upload?collection=${dataType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(`Successfully uploaded ${response.data.records_processed} records`);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = async (type) => {
    try {
      const response = await axios.get(`${API}/sample-data/${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sample_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Sample file downloaded');
    } catch (error) {
      console.error('Error downloading sample:', error);
      toast.error('Failed to download sample file');
    }
  };

  return (
    <div className="space-y-8" data-testid="upload-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-800">Upload Data</h1>
        <p className="text-slate-600 mt-2">Import your e-commerce data for analysis</p>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="upload-card">
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data Type Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Type</label>
              <Select value={dataType} onValueChange={setDataType}>
                <SelectTrigger data-testid="data-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              data-testid="file-dropzone"
              className={`
                border-2 border-dashed rounded-lg p-12
                transition-all duration-200 cursor-pointer
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      {isDragActive ? 'Drop the file here' : 'Drag & drop a CSV file'}
                    </p>
                    <p className="text-xs text-slate-500">or click to browse</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <Button
              data-testid="upload-submit-btn"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white disabled:opacity-50"
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UploadIcon size={20} />
                  Upload File
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Sample Data Section */}
        <Card data-testid="sample-data-card">
          <CardHeader>
            <CardTitle>Sample Data Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              Download sample CSV files to see the expected format for each data type.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-500" size={24} />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Orders Sample</p>
                    <p className="text-xs text-slate-500">Transaction history data</p>
                  </div>
                </div>
                <Button
                  data-testid="download-orders-sample-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSample('orders')}
                >
                  <Download size={16} className="mr-2" />
                  Download
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="text-purple-500" size={24} />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Customers Sample</p>
                    <p className="text-xs text-slate-500">Customer information data</p>
                  </div>
                </div>
                <Button
                  data-testid="download-customers-sample-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSample('customers')}
                >
                  <Download size={16} className="mr-2" />
                  Download
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="text-green-500" size={24} />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Inventory Sample</p>
                    <p className="text-xs text-slate-500">Stock levels data</p>
                  </div>
                </div>
                <Button
                  data-testid="download-inventory-sample-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSample('inventory')}
                >
                  <Download size={16} className="mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card data-testid="instructions-card">
        <CardHeader>
          <CardTitle>Data Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Orders Data</h4>
              <p>Include columns: order_date, customer_id, product_id, product_name, category, quantity, price</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Customers Data</h4>
              <p>Include columns: customer_id, name, email, join_date</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Inventory Data</h4>
              <p>Include columns: product_id, product_name, category, current_stock, reorder_point, unit_cost</p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Note: After uploading orders data, the system will automatically generate forecasts and calculate churn probabilities.
                This process may take a few moments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Upload;