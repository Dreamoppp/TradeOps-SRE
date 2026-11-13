from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class OrderCreate(BaseModel):
    client_order_id: str = Field(..., description="Idempotency key / unique order reference")
    symbol: str = Field(..., pattern="^[A-Z0-9.-]{1,10}$", description="e.g. AAPL, MSFT, BTC-USD")
    side: str = Field(..., pattern="^(BUY|SELL)$")
    order_type: str = Field(..., pattern="^(LIMIT|MARKET)$")
    quantity: float = Field(..., gt=0)
    price: Optional[float] = Field(None, gt=0)

class OrderValidateRequest(BaseModel):
    symbol: str
    side: str
    order_type: str
    quantity: float
    price: Optional[float] = None

class OrderValidateResponse(BaseModel):
    is_valid: bool
    rejection_reason: Optional[str] = None
    estimated_notional: float

class OrderOut(BaseModel):
    id: int
    client_order_id: str
    symbol: str
    side: str
    order_type: str
    quantity: float
    price: Optional[float] = None
    status: str
    failure_reason: Optional[str] = None
    correlation_id: Optional[str] = None
    execution_delay_ms: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FaultInjectionConfig(BaseModel):
    enabled: bool = False
    fail_all_orders: bool = False
    injected_latency_ms: int = 0
    fail_database: bool = False
    error_rate_percent: int = 0
    high_cpu_simulation: bool = False
