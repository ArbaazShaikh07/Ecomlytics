# Ecomlytics - E-commerce Analytics Platform

A full-stack web platform that helps e-commerce businesses analyze performance and make data-driven decisions.

## Features

### 1. **Dashboard**
- Real-time KPIs: Total Revenue, Orders, Avg Order Value, Churn Rate
- Top products by revenue (bar chart)
- Revenue by category (pie chart)

### 2. **Sales Forecasts**
- 7-day demand forecasting using linear regression
- Product-level and category-level predictions
- Interactive line charts and detailed forecast tables
- Filter by product

### 3. **Customer Churn Analysis**
- RFM-based churn probability scoring
- Risk segmentation (High/Medium/Low)
- Searchable customer table
- CSV export functionality

### 4. **Inventory Optimization**
- Current stock vs predicted demand comparison
- Reorder recommendations
- Alert system for low stock items
- CSV export functionality

### 5. **Data Upload**
- Drag-and-drop CSV upload
- Support for Orders, Customers, and Inventory data
- Sample data files for testing
- Automatic data cleaning and validation
- Background ML processing

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **ML Libraries**: scikit-learn, pandas, numpy
- **Data Processing**: pandas, python-multipart
- **Export**: reportlab (PDF), openpyxl (Excel)

### Frontend
- **Framework**: React 19
- **Routing**: React Router v7
- **Charts**: Recharts
- **UI Components**: Shadcn/UI (Radix UI)
- **Styling**: Tailwind CSS
- **File Upload**: react-dropzone
- **CSV Parsing**: papaparse
- **Notifications**: Sonner

## API Endpoints

### Data Management
- `POST /api/upload` - Upload CSV files (orders, customers, inventory)
- `GET /api/sample-data/{type}` - Download sample CSV files

### Analytics
- `GET /api/kpis` - Get business KPIs
- `GET /api/forecast` - Get sales forecasts
- `GET /api/churn` - Get customer churn predictions
- `GET /api/inventory` - Get inventory recommendations

### Simulation
- `POST /api/simulate` - Run what-if scenarios (price change, ad spend)

### Export
- `GET /api/export/csv/{type}` - Export reports as CSV

## Quick Start

1. **Upload Data**: Go to Upload page and use sample data or upload your own CSV files
2. **View Dashboard**: Check KPIs and charts
3. **Explore Analytics**: Navigate through Forecasts, Churn Analysis, and Inventory pages
4. **Export Reports**: Download CSV reports for further analysis

## Data Format

### Orders: `order_date, customer_id, product_id, product_name, category, quantity, price`
### Customers: `customer_id, name, email, join_date`
### Inventory: `product_id, product_name, category, current_stock, reorder_point, unit_cost`

## Machine Learning

- **Forecasting**: Linear regression for 7-day demand prediction
- **Churn**: RFM scoring (Recency 50%, Frequency 30%, Monetary 20%)
- **Inventory**: Forecast-based reorder recommendations
