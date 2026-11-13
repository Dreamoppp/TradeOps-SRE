import uuid
import time
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.order import TradingOrder
from app.schemas.order import (
    OrderCreate,
    OrderOut,
    OrderValidateRequest,
    OrderValidateResponse,
    FaultInjectionConfig
)
from app.services.simulator_service import SimulatorService, fault_state

logger = logging.getLogger("tradeops.simulator_api")
router = APIRouter(prefix="/api/simulator", tags=["Trading Simulator"])

@router.get("/health")
def simulator_health():
    """
    Simulated Order Gateway health endpoint.
    Subject to fault injection to test SRE monitoring & alerting.
    """
    if fault_state.enabled:
        # Check injected latency
        if fault_state.injected_latency_ms > 0:
            time.sleep(fault_state.injected_latency_ms / 1000.0)

        # Check injected 500 error / downtime
        if fault_state.fail_all_orders or fault_state.error_rate_percent >= 100:
            logger.error("Simulator Health: Injected 500 internal server error active")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "status": "down",
                    "error": "Exchange Gateway Service Unavailable: Connection to matching engine dropped",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )

    return {
        "status": "healthy",
        "service": "Simulated Order Gateway",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fault_injection_active": fault_state.enabled
    }

@router.get("/fault-injection", response_model=FaultInjectionConfig)
def get_fault_injection():
    return SimulatorService.get_fault_config()

@router.post("/fault-injection", response_model=FaultInjectionConfig)
def set_fault_injection(config: FaultInjectionConfig):
    return SimulatorService.set_fault_config(config)

@router.post("/orders/validate", response_model=OrderValidateResponse)
def validate_order(req: OrderValidateRequest):
    return SimulatorService.validate_order(req)

@router.post("/orders", response_model=OrderOut, status_code=201)
def place_order(
    payload: OrderCreate,
    x_correlation_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    correlation_id = x_correlation_id or f"corr-{uuid.uuid4().hex[:12]}"
    try:
        order, was_created = SimulatorService.process_order(db, payload, correlation_id)
        return OrderOut.model_validate(order)
    except ConnectionError as e:
        logger.error(f"Database error during order placement: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error processing order: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Order processing failed: {str(e)}")

@router.get("/orders", response_model=List[OrderOut])
def list_orders(
    status: Optional[str] = Query(None),
    symbol: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(TradingOrder)
    if status:
        query = query.filter(TradingOrder.status == status)
    if symbol:
        query = query.filter(TradingOrder.symbol == symbol.upper())
    
    orders = query.order_by(desc(TradingOrder.created_at)).offset(offset).limit(limit).all()
    return [OrderOut.model_validate(o) for o in orders]

@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(TradingOrder).filter(TradingOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderOut.model_validate(order)

@router.post("/orders/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    try:
        cancelled = SimulatorService.cancel_order(db, order_id)
        return OrderOut.model_validate(cancelled)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

