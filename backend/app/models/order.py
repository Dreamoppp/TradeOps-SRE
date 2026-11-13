from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index
from app.database import Base

class TradingOrder(Base):
    """
    Simulated Trading Order Entity
    State machine:
    PENDING -> VALIDATED -> EXECUTED
    PENDING -> REJECTED (e.g. invalid price/qty or risk check failure)
    PENDING / VALIDATED -> CANCELLED
    PENDING / VALIDATED -> FAILED (e.g. simulated exchange matching timeout or fault)
    """
    __tablename__ = "trading_orders"

    id = Column(Integer, primary_key=True, index=True)
    client_order_id = Column(String(100), unique=True, index=True, nullable=False) # Idempotency key
    symbol = Column(String(20), index=True, nullable=False) # e.g. AAPL, MSFT, BTC-USD
    side = Column(String(10), nullable=False) # BUY, SELL
    order_type = Column(String(20), nullable=False) # LIMIT, MARKET
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=True) # None for MARKET orders
    status = Column(String(30), default="PENDING", index=True, nullable=False) # PENDING, VALIDATED, REJECTED, EXECUTED, CANCELLED, FAILED
    failure_reason = Column(String(255), nullable=True)
    correlation_id = Column(String(100), index=True, nullable=True)
    execution_delay_ms = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_order_symbol_status", "symbol", "status"),
    )

