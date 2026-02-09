from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBasic()

# Get admin password from env
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# ============= MODELS =============

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    quantity: int  # Current available quantity
    max_quantity: int  # Maximum quantity (for sell-out tracking)
    image_url: str
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    quantity: int
    max_quantity: int
    image_url: str
    active: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    max_quantity: Optional[int] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    customer_name: str
    email: EmailStr
    phone: str
    notes: Optional[str] = ""
    items: List[OrderItem]

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    email: str
    phone: str
    notes: str
    items: List[OrderItem]
    total: float
    status: str = "pending"
    archived: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShopSettings(BaseModel):
    id: str = "shop_settings"
    shop_name: str = "Weekly Bakery"
    pickup_info: str = "Pickup available Saturday 10am-2pm at 123 Main Street"
    payment_info: str = "Payment via Venmo @bakery or cash at pickup"
    email_message: str = "Thank you for your order! We look forward to seeing you."
    weekly_date: str = ""

class ShopSettingsUpdate(BaseModel):
    shop_name: Optional[str] = None
    pickup_info: Optional[str] = None
    payment_info: Optional[str] = None
    email_message: Optional[str] = None
    weekly_date: Optional[str] = None

# ============= AUTH =============

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not correct_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return True

# Simple password check endpoint
@api_router.post("/admin/login")
async def admin_login(password: str):
    if password == ADMIN_PASSWORD:
        return {"success": True}
    raise HTTPException(status_code=401, detail="Invalid password")

# ============= PRODUCTS =============

@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find({}, {"_id": 0}).to_list(100)
    return products

@api_router.get("/products/active", response_model=List[Product])
async def get_active_products():
    products = await db.products.find({"active": True}, {"_id": 0}).to_list(100)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    product_obj = Product(**product.model_dump())
    doc = product_obj.model_dump()
    await db.products.insert_one(doc)
    return product_obj

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductUpdate):
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated_product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ============= ORDERS =============

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    # Check product availability and update quantities
    total = 0.0
    for item in order.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product["quantity"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"{product['name']} is sold out or insufficient quantity")
        total += item.price * item.quantity
    
    # Reduce quantities
    for item in order.items:
        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"quantity": -item.quantity}}
        )
    
    # Create order
    order_obj = Order(
        customer_name=order.customer_name,
        email=order.email,
        phone=order.phone,
        notes=order.notes or "",
        items=[item.model_dump() for item in order.items],
        total=total
    )
    
    doc = order_obj.model_dump()
    await db.orders.insert_one(doc)
    
    # Send confirmation email
    await send_order_confirmation(order_obj)
    
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders(archived: bool = False):
    orders = await db.orders.find({"archived": archived}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/orders/all", response_model=List[Order])
async def get_all_orders():
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str):
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Status updated"}

@api_router.put("/orders/{order_id}/archive")
async def archive_order(order_id: str):
    result = await db.orders.update_one({"id": order_id}, {"$set": {"archived": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order archived"}

@api_router.put("/orders/{order_id}/unarchive")
async def unarchive_order(order_id: str):
    result = await db.orders.update_one({"id": order_id}, {"$set": {"archived": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order unarchived"}

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}

@api_router.get("/orders/stats")
async def get_order_stats():
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    
    # Calculate week boundaries
    # Current week: Monday to Sunday
    days_since_monday = now.weekday()
    current_week_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Previous week
    previous_week_start = current_week_start - timedelta(days=7)
    previous_week_end = current_week_start
    
    # Get all orders
    all_orders = await db.orders.find({}, {"_id": 0}).to_list(10000)
    
    # Process orders into stats
    stats = {
        "current_week": {
            "start": current_week_start.isoformat(),
            "end": now.isoformat(),
            "total_orders": 0,
            "completed_orders": 0,
            "cancelled_orders": 0,
            "pending_orders": 0,
            "total_revenue": 0.0,
            "completed_revenue": 0.0,
            "orders_by_date": {}
        },
        "previous_week": {
            "start": previous_week_start.isoformat(),
            "end": previous_week_end.isoformat(),
            "total_orders": 0,
            "completed_orders": 0,
            "cancelled_orders": 0,
            "pending_orders": 0,
            "total_revenue": 0.0,
            "completed_revenue": 0.0,
            "orders_by_date": {}
        },
        "all_time": {
            "total_orders": 0,
            "completed_orders": 0,
            "cancelled_orders": 0,
            "total_revenue": 0.0,
            "completed_revenue": 0.0
        }
    }
    
    for order in all_orders:
        order_date = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
        date_key = order_date.strftime("%Y-%m-%d")
        total = order.get("total", 0)
        status = order.get("status", "pending")
        
        # All time stats
        stats["all_time"]["total_orders"] += 1
        stats["all_time"]["total_revenue"] += total
        if status == "completed":
            stats["all_time"]["completed_orders"] += 1
            stats["all_time"]["completed_revenue"] += total
        elif status == "cancelled":
            stats["all_time"]["cancelled_orders"] += 1
        
        # Current week
        if order_date >= current_week_start:
            stats["current_week"]["total_orders"] += 1
            stats["current_week"]["total_revenue"] += total
            if status == "completed":
                stats["current_week"]["completed_orders"] += 1
                stats["current_week"]["completed_revenue"] += total
            elif status == "cancelled":
                stats["current_week"]["cancelled_orders"] += 1
            else:
                stats["current_week"]["pending_orders"] += 1
            
            if date_key not in stats["current_week"]["orders_by_date"]:
                stats["current_week"]["orders_by_date"][date_key] = {"count": 0, "revenue": 0.0}
            stats["current_week"]["orders_by_date"][date_key]["count"] += 1
            if status != "cancelled":
                stats["current_week"]["orders_by_date"][date_key]["revenue"] += total
        
        # Previous week
        elif previous_week_start <= order_date < previous_week_end:
            stats["previous_week"]["total_orders"] += 1
            stats["previous_week"]["total_revenue"] += total
            if status == "completed":
                stats["previous_week"]["completed_orders"] += 1
                stats["previous_week"]["completed_revenue"] += total
            elif status == "cancelled":
                stats["previous_week"]["cancelled_orders"] += 1
            else:
                stats["previous_week"]["pending_orders"] += 1
            
            if date_key not in stats["previous_week"]["orders_by_date"]:
                stats["previous_week"]["orders_by_date"][date_key] = {"count": 0, "revenue": 0.0}
            stats["previous_week"]["orders_by_date"][date_key]["count"] += 1
            if status != "cancelled":
                stats["previous_week"]["orders_by_date"][date_key]["revenue"] += total
    
    return stats

# ============= SETTINGS =============

@api_router.get("/settings", response_model=ShopSettings)
async def get_settings():
    settings = await db.settings.find_one({"id": "shop_settings"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = ShopSettings()
        await db.settings.insert_one(default_settings.model_dump())
        return default_settings
    return settings

@api_router.put("/settings", response_model=ShopSettings)
async def update_settings(settings: ShopSettingsUpdate):
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.settings.update_one(
        {"id": "shop_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    updated_settings = await db.settings.find_one({"id": "shop_settings"}, {"_id": 0})
    return updated_settings

# ============= EMAIL =============

async def send_order_confirmation(order: Order):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        settings = await db.settings.find_one({"id": "shop_settings"}, {"_id": 0})
        if not settings:
            settings = ShopSettings().model_dump()
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            logger.warning("No EMERGENT_LLM_KEY found, skipping email")
            return
        
        # Build order items list
        items_text = "\n".join([f"- {item['product_name']} x{item['quantity']} - ${item['price'] * item['quantity']:.2f}" for item in order.items])
        
        # Use LLM to generate personalized email
        chat = LlmChat(
            api_key=api_key,
            session_id=f"order-email-{order.id}",
            system_message="You are a friendly bakery assistant. Generate a warm, personalized order confirmation email. Keep it concise and friendly."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Generate a brief, warm order confirmation email for:

Customer: {order.customer_name}
Order Items:
{items_text}
Total: ${order.total:.2f}

Include this pickup information: {settings.get('pickup_info', 'Pickup details coming soon')}
Include this payment information: {settings.get('payment_info', 'Payment details coming soon')}
Additional message from bakery: {settings.get('email_message', 'Thank you!')}

Keep it short, warm, and personal. Don't use emojis excessively."""

        user_message = UserMessage(text=prompt)
        email_content = await chat.send_message(user_message)
        
        # Log the email (in production, integrate with actual email service)
        logger.info(f"Order confirmation email for {order.email}:\n{email_content}")
        
        # Store email in database for reference
        await db.emails.insert_one({
            "id": str(uuid.uuid4()),
            "order_id": order.id,
            "to": order.email,
            "subject": f"Order Confirmation - {settings.get('shop_name', 'Bakery')}",
            "content": email_content,
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error sending email: {e}")

# ============= HEALTH CHECK =============

@api_router.get("/")
async def root():
    return {"message": "Bakery Shop API", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
