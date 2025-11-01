from fastapi import FastAPI, APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import csv
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import json
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pydantic Models
class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_date: str
    customer_id: str
    product_id: str
    product_name: str
    category: str
    quantity: int
    price: float
    total: float
    status: str = "completed"

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    name: str
    email: str
    join_date: str
    last_purchase_date: Optional[str] = None
    total_spent: float = 0
    order_count: int = 0
    churn_probability: float = 0

class Inventory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    category: str
    current_stock: int
    reorder_point: int
    unit_cost: float

class Forecast(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    category: str
    forecast_date: str
    predicted_quantity: float
    confidence: str

class UploadResponse(BaseModel):
    message: str
    records_processed: int
    collection: str

class KPIResponse(BaseModel):
    total_revenue: float
    total_orders: int
    avg_order_value: float
    churn_rate: float
    top_products: List[Dict[str, Any]]
    revenue_by_category: List[Dict[str, Any]]

class SimulationRequest(BaseModel):
    scenario: str
    parameter: str
    value: float

# Helper Functions
async def clean_and_transform_orders(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and validate order data"""
    df = df.drop_duplicates()
    df = df.dropna(subset=['order_date', 'customer_id', 'product_id'])
    df['order_date'] = pd.to_datetime(df['order_date']).dt.strftime('%Y-%m-%d')
    df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce').fillna(0).astype(int)
    df['price'] = pd.to_numeric(df['price'], errors='coerce').fillna(0)
    df['total'] = df['quantity'] * df['price']
    return df

async def clean_and_transform_customers(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and validate customer data"""
    df = df.drop_duplicates(subset=['customer_id'])
    df = df.dropna(subset=['customer_id', 'name', 'email'])
    df['join_date'] = pd.to_datetime(df['join_date']).dt.strftime('%Y-%m-%d')
    if 'last_purchase_date' in df.columns:
        df['last_purchase_date'] = pd.to_datetime(df['last_purchase_date'], errors='coerce').dt.strftime('%Y-%m-%d')
    return df

async def clean_and_transform_inventory(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and validate inventory data"""
    df = df.drop_duplicates(subset=['product_id'])
    df = df.dropna(subset=['product_id', 'product_name'])
    df['current_stock'] = pd.to_numeric(df['current_stock'], errors='coerce').fillna(0).astype(int)
    df['reorder_point'] = pd.to_numeric(df['reorder_point'], errors='coerce').fillna(10).astype(int)
    df['unit_cost'] = pd.to_numeric(df['unit_cost'], errors='coerce').fillna(0)
    return df

async def generate_forecasts():
    """Generate demand forecasts using simple linear regression"""
    orders = await db.orders.find({}, {"_id": 0}).to_list(10000)
    if not orders:
        return
    
    df = pd.DataFrame(orders)
    df['order_date'] = pd.to_datetime(df['order_date'])
    
    forecasts = []
    for product_id in df['product_id'].unique():
        product_df = df[df['product_id'] == product_id]
        daily_sales = product_df.groupby('order_date')['quantity'].sum().reset_index()
        daily_sales = daily_sales.sort_values('order_date')
        
        if len(daily_sales) < 3:
            continue
        
        X = np.arange(len(daily_sales)).reshape(-1, 1)
        y = daily_sales['quantity'].values
        
        model = LinearRegression()
        model.fit(X, y)
        
        # Predict next 7 days
        future_X = np.arange(len(daily_sales), len(daily_sales) + 7).reshape(-1, 1)
        predictions = model.predict(future_X)
        
        last_date = daily_sales['order_date'].max()
        product_name = product_df['product_name'].iloc[0]
        category = product_df['category'].iloc[0]
        
        for i, pred in enumerate(predictions):
            forecast_date = last_date + timedelta(days=i+1)
            forecast = {
                "id": str(uuid.uuid4()),
                "product_id": product_id,
                "product_name": product_name,
                "category": category,
                "forecast_date": forecast_date.strftime('%Y-%m-%d'),
                "predicted_quantity": max(0, float(pred)),
                "confidence": "medium"
            }
            forecasts.append(forecast)
    
    if forecasts:
        await db.forecasts.delete_many({})
        await db.forecasts.insert_many(forecasts)

async def calculate_churn_probability():
    """Calculate churn probability for customers"""
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    orders = await db.orders.find({}, {"_id": 0}).to_list(10000)
    
    if not customers or not orders:
        return
    
    orders_df = pd.DataFrame(orders)
    orders_df['order_date'] = pd.to_datetime(orders_df['order_date'])
    
    current_date = orders_df['order_date'].max()
    
    for customer in customers:
        customer_orders = orders_df[orders_df['customer_id'] == customer['customer_id']]
        
        if len(customer_orders) == 0:
            churn_prob = 0.8
        else:
            last_order_date = customer_orders['order_date'].max()
            days_since_last_order = (current_date - last_order_date).days
            order_frequency = len(customer_orders)
            total_spent = customer_orders['total'].sum()
            
            # Simple churn score based on RFM
            recency_score = min(days_since_last_order / 180, 1.0)
            frequency_score = 1 - min(order_frequency / 20, 1.0)
            monetary_score = 1 - min(total_spent / 10000, 1.0)
            
            churn_prob = (recency_score * 0.5 + frequency_score * 0.3 + monetary_score * 0.2)
        
        await db.customers.update_one(
            {"customer_id": customer['customer_id']},
            {"$set": {
                "churn_probability": round(churn_prob, 2),
                "total_spent": float(customer_orders['total'].sum()) if len(customer_orders) > 0 else 0,
                "order_count": len(customer_orders),
                "last_purchase_date": customer_orders['order_date'].max().strftime('%Y-%m-%d') if len(customer_orders) > 0 else None
            }}
        )

async def process_uploaded_data(collection: str, data: List[Dict]):
    """Background task to process uploaded data"""
    await db[collection].insert_many(data)
    
    if collection == 'orders':
        await generate_forecasts()
        await calculate_churn_probability()
    elif collection == 'customers':
        await calculate_churn_probability()

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Ecomlytics API"}

@api_router.post("/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...), collection: str = "orders", background_tasks: BackgroundTasks = None):
    """Upload and process CSV files"""
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        if collection == 'orders':
            df = await clean_and_transform_orders(df)
        elif collection == 'customers':
            df = await clean_and_transform_customers(df)
        elif collection == 'inventory':
            df = await clean_and_transform_inventory(df)
        else:
            raise HTTPException(status_code=400, detail="Invalid collection type")
        
        data = df.to_dict('records')
        
        # Clear existing data
        await db[collection].delete_many({})
        
        # Process in background
        background_tasks.add_task(process_uploaded_data, collection, data)
        
        return UploadResponse(
            message=f"Successfully uploaded {collection}",
            records_processed=len(data),
            collection=collection
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/kpis", response_model=KPIResponse)
async def get_kpis():
    """Calculate and return business KPIs"""
    orders = await db.orders.find({}, {"_id": 0}).to_list(10000)
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    
    if not orders:
        return KPIResponse(
            total_revenue=0,
            total_orders=0,
            avg_order_value=0,
            churn_rate=0,
            top_products=[],
            revenue_by_category=[]
        )
    
    df = pd.DataFrame(orders)
    
    total_revenue = df['total'].sum()
    total_orders = len(df)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    
    # Calculate churn rate
    churn_count = sum(1 for c in customers if c.get('churn_probability', 0) > 0.5)
    churn_rate = churn_count / len(customers) if customers else 0
    
    # Top products
    top_products = df.groupby(['product_id', 'product_name'])['total'].sum().reset_index()
    top_products = top_products.sort_values('total', ascending=False).head(5)
    top_products_list = top_products.to_dict('records')
    
    # Revenue by category
    revenue_by_category = df.groupby('category')['total'].sum().reset_index()
    revenue_by_category_list = revenue_by_category.to_dict('records')
    
    return KPIResponse(
        total_revenue=float(total_revenue),
        total_orders=total_orders,
        avg_order_value=float(avg_order_value),
        churn_rate=float(churn_rate),
        top_products=top_products_list,
        revenue_by_category=revenue_by_category_list
    )

@api_router.get("/forecast")
async def get_forecasts():
    """Get sales forecasts"""
    forecasts = await db.forecasts.find({}, {"_id": 0}).to_list(1000)
    return {"forecasts": forecasts}

@api_router.get("/churn")
async def get_churn_customers():
    """Get customers with churn risk"""
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    sorted_customers = sorted(customers, key=lambda x: x.get('churn_probability', 0), reverse=True)
    return {"customers": sorted_customers}

@api_router.get("/inventory")
async def get_inventory_recommendations():
    """Get inventory reorder recommendations"""
    inventory = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    forecasts = await db.forecasts.find({}, {"_id": 0}).to_list(1000)
    
    forecast_df = pd.DataFrame(forecasts) if forecasts else pd.DataFrame()
    
    recommendations = []
    for item in inventory:
        predicted_demand = 0
        if not forecast_df.empty and item['product_id'] in forecast_df['product_id'].values:
            product_forecasts = forecast_df[forecast_df['product_id'] == item['product_id']]
            predicted_demand = product_forecasts['predicted_quantity'].sum()
        
        needs_reorder = item['current_stock'] < item['reorder_point']
        recommended_order_qty = max(0, int(predicted_demand - item['current_stock']))
        
        recommendations.append({
            **item,
            "predicted_demand": float(predicted_demand),
            "needs_reorder": needs_reorder,
            "recommended_order_qty": recommended_order_qty
        })
    
    return {"inventory": recommendations}

@api_router.post("/simulate")
async def run_simulation(request: SimulationRequest):
    """Run what-if scenarios"""
    orders = await db.orders.find({}, {"_id": 0}).to_list(10000)
    
    if not orders:
        return {"error": "No order data available"}
    
    df = pd.DataFrame(orders)
    current_revenue = df['total'].sum()
    
    if request.scenario == "price_change":
        # Simulate price change
        multiplier = 1 + (request.value / 100)
        simulated_revenue = current_revenue * multiplier
        # Assume 10% volume decrease for every 5% price increase
        volume_impact = 1 - (abs(request.value) * 0.02)
        simulated_revenue *= volume_impact
        
        return {
            "scenario": request.scenario,
            "current_revenue": float(current_revenue),
            "simulated_revenue": float(simulated_revenue),
            "change": float(simulated_revenue - current_revenue),
            "change_percent": float((simulated_revenue - current_revenue) / current_revenue * 100)
        }
    elif request.scenario == "ad_spend":
        # Simulate increased ad spend impact
        # Assume $100 ad spend increases revenue by 2%
        revenue_increase = (request.value / 100) * 0.02
        simulated_revenue = current_revenue * (1 + revenue_increase)
        
        return {
            "scenario": request.scenario,
            "current_revenue": float(current_revenue),
            "simulated_revenue": float(simulated_revenue),
            "change": float(simulated_revenue - current_revenue),
            "change_percent": float((simulated_revenue - current_revenue) / current_revenue * 100),
            "roi": float((simulated_revenue - current_revenue) / request.value) if request.value > 0 else 0
        }
    
    return {"error": "Unknown scenario"}

@api_router.get("/export/csv/{report_type}")
async def export_csv(report_type: str):
    """Export data as CSV"""
    if report_type == "churn":
        data = await db.customers.find({}, {"_id": 0}).to_list(10000)
    elif report_type == "forecast":
        data = await db.forecasts.find({}, {"_id": 0}).to_list(10000)
    elif report_type == "inventory":
        inventory = await db.inventory.find({}, {"_id": 0}).to_list(1000)
        forecasts = await db.forecasts.find({}, {"_id": 0}).to_list(1000)
        forecast_df = pd.DataFrame(forecasts) if forecasts else pd.DataFrame()
        
        data = []
        for item in inventory:
            predicted_demand = 0
            if not forecast_df.empty and item['product_id'] in forecast_df['product_id'].values:
                product_forecasts = forecast_df[forecast_df['product_id'] == item['product_id']]
                predicted_demand = product_forecasts['predicted_quantity'].sum()
            
            data.append({
                **item,
                "predicted_demand": float(predicted_demand),
                "needs_reorder": item['current_stock'] < item['reorder_point']
            })
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    if not data:
        raise HTTPException(status_code=404, detail="No data available")
    
    df = pd.DataFrame(data)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.csv"}
    )

@api_router.get("/sample-data/{data_type}")
async def get_sample_data(data_type: str):
    """Get sample CSV data for testing"""
    if data_type == "orders":
        sample_data = [
            ["order_date", "customer_id", "product_id", "product_name", "category", "quantity", "price"],
            ["2024-01-15", "C001", "P001", "Laptop", "Electronics", "1", "1200"],
            ["2024-01-16", "C002", "P002", "Mouse", "Electronics", "2", "25"],
            ["2024-01-17", "C001", "P003", "Keyboard", "Electronics", "1", "75"],
            ["2024-01-18", "C003", "P004", "Monitor", "Electronics", "1", "300"],
            ["2024-01-19", "C004", "P001", "Laptop", "Electronics", "1", "1200"],
        ]
    elif data_type == "customers":
        sample_data = [
            ["customer_id", "name", "email", "join_date"],
            ["C001", "John Doe", "john@example.com", "2023-06-15"],
            ["C002", "Jane Smith", "jane@example.com", "2023-08-22"],
            ["C003", "Bob Johnson", "bob@example.com", "2023-09-10"],
            ["C004", "Alice Brown", "alice@example.com", "2023-10-05"],
        ]
    elif data_type == "inventory":
        sample_data = [
            ["product_id", "product_name", "category", "current_stock", "reorder_point", "unit_cost"],
            ["P001", "Laptop", "Electronics", "15", "10", "800"],
            ["P002", "Mouse", "Electronics", "50", "20", "10"],
            ["P003", "Keyboard", "Electronics", "30", "15", "35"],
            ["P004", "Monitor", "Electronics", "8", "10", "180"],
        ]
    else:
        raise HTTPException(status_code=400, detail="Invalid data type")
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(sample_data)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sample_{data_type}.csv"}
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()