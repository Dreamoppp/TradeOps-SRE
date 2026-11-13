import time
import random
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.order import TradingOrder
from app.schemas.order import OrderCreate, FaultInjectionConfig, OrderValidateRequest, OrderValidateResponse
from app.core.metrics import TRADING_ORDERS_TOTAL, TRADING_ORDER_EXECUTION_LATENCY_SECONDS

logger = logging.getLogger("tradeops.simulator")

class FaultState:
    enabled: bool = False
    fail_all_orders: bool = False
    injected_latency_ms: int = 0
    fail_database: bool = False
    error_rate_percent: int = 0
    high_cpu_simulation: bool = False

fault_state = FaultState()

SUPPORTED_SYMBOLS = {
    "AAPL": 182.50,
    "MSFT": 420.10,
    "NVDA": 128.75,
    "AMZN": 186.40,
    "GOOGL": 175.20,
    "BTC-USD": 88500.0,
    "ETH-USD": 3150.0
}

VALID_STATUS_TRANSITIONS = {
    "PENDING": ["VALIDATED", "REJECTED", "CANCELLED", "FAILED"],
    "VALIDATED": ["EXECUTED", "CANCELLED", "FAILED"],
    "REJECTED": [],
    "EXECUTED": [],
    "CANCELLED": [],
    "FAILED": []
}

class SimulatorService:
    @staticmethod
    def get_fault_config() -> FaultInjectionConfig:
        return FaultInjectionConfig(
            enabled=fault_state.enabled,
            fail_all_orders=fault_state.fail_all_orders,
            injected_latency_ms=fault_state.injected_latency_ms,
            fail_database=fault_state.fail_database,
            error_rate_percent=fault_state.error_rate_percent,
            high_cpu_simulation=fault_state.high_cpu_simulation
        )

    @staticmethod
    def set_fault_config(config: FaultInjectionConfig) -> FaultInjectionConfig:
        fault_state.enabled = config.enabled
        fault_state.fail_all_orders = config.fail_all_orders if config.enabled else False
        fault_state.injected_latency_ms = config.injected_latency_ms if config.enabled else 0
        fault_state.fail_database = config.fail_database if config.enabled else False
        fault_state.error_rate_percent = config.error_rate_percent if config.enabled else 0
        fault_state.high_cpu_simulation = config.high_cpu_simulation if config.enabled else False
        logger.warning(f"Fault injection updated: enabled={fault_state.enabled}, latency={fault_state.injected_latency_ms}ms, fail_orders={fault_state.fail_all_orders}")
        return SimulatorService.get_fault_config()

    @staticmethod
    def validate_order(req: OrderValidateRequest) -> OrderValidateResponse:
        symbol = req.symbol.upper()
        if symbol not in SUPPORTED_SYMBOLS:
            return OrderValidateResponse(
                is_valid=False,
                rejection_reason=f"Unsupported trading symbol: {symbol}. Supported: {list(SUPPORTED_SYMBOLS.keys())}",
                estimated_notional=0.0
            )
        
        ref_price = SUPPORTED_SYMBOLS[symbol]
        price = req.price if req.price and req.price > 0 else ref_price
        
        if req.quantity <= 0:
            return OrderValidateResponse(
                is_valid=False,
                rejection_reason="Quantity must be greater than zero",
                estimated_notional=0.0
            )

        if req.order_type == "LIMIT" and (not req.price or req.price <= 0):
            return OrderValidateResponse(
                is_valid=False,
                rejection_reason="Limit price required for LIMIT order type",
                estimated_notional=0.0
            )

        estimated_notional = round(req.quantity * price, 2)
        if estimated_notional > 5_000_000.0:
            return OrderValidateResponse(
                is_valid=False,
                rejection_reason=f"Risk limit exceeded: order notional (${estimated_notional:,.2f}) exceeds maximum single ticket limit of $5,000,000",
                estimated_notional=estimated_notional
            )

        return OrderValidateResponse(
            is_valid=True,
            rejection_reason=None,
            estimated_notional=estimated_notional
        )

    @staticmethod
    def process_order(db: Session, order_in: OrderCreate, correlation_id: str) -> Tuple[TradingOrder, bool]:
        """
        Processes simulated order with transaction safety, idempotency, and realistic matching execution.
        Returns: (order, was_created_new)
        """
        # 1. Idempotency Check
        existing = db.query(TradingOrder).filter(TradingOrder.client_order_id == order_in.client_order_id).first()
        if existing:
            logger.info(f"Duplicate order request detected for client_order_id {order_in.client_order_id}. Returning existing record.")
            return existing, False

        # 2. Check for Injected Database Failure
        if fault_state.enabled and fault_state.fail_database:
            logger.error("Fault Injection: Database connection failure simulated")
            raise ConnectionError("Simulated database cluster timeout: Connection lost during order commit")

        # 3. Validation stage
        val_res = SimulatorService.validate_order(OrderValidateRequest(
            symbol=order_in.symbol,
            side=order_in.side,
            order_type=order_in.order_type,
            quantity=order_in.quantity,
            price=order_in.price
        ))

        # Determine reference price if market order
        symbol_upper = order_in.symbol.upper()
        ref_price = SUPPORTED_SYMBOLS.get(symbol_upper, 100.0)
        exec_price = order_in.price if order_in.price and order_in.price > 0 else ref_price

        order = TradingOrder(
            client_order_id=order_in.client_order_id,
            symbol=symbol_upper,
            side=order_in.side,
            order_type=order_in.order_type,
            quantity=order_in.quantity,
            price=exec_price,
            status="PENDING",
            correlation_id=correlation_id,
            execution_delay_ms=0.0
        )
        db.add(order)
        db.flush()

        # Fault Injection: Random error rate or fail all
        should_fail_by_fault = False
        if fault_state.enabled:
            if fault_state.fail_all_orders:
                should_fail_by_fault = True
            elif fault_state.error_rate_percent > 0:
                if random.randint(1, 100) <= fault_state.error_rate_percent:
                    should_fail_by_fault = True

        # Process State Transitions
        if not val_res.is_valid:
            order.status = "REJECTED"
            order.failure_reason = val_res.rejection_reason
            TRADING_ORDERS_TOTAL.labels(status="REJECTED", symbol=order.symbol, side=order.side).inc()
            db.commit()
            db.refresh(order)
            return order, True

        order.status = "VALIDATED"
        db.flush()

        # Simulated Matching Delay & Injected Latency
        simulated_delay = random.uniform(0.04, 0.15) # 40-150ms default matching delay
        if fault_state.enabled and fault_state.injected_latency_ms > 0:
            simulated_delay += (fault_state.injected_latency_ms / 1000.0)

        time.sleep(min(simulated_delay, 3.0)) # safety cap
        order.execution_delay_ms = round(simulated_delay * 1000, 2)

        if should_fail_by_fault:
            order.status = "FAILED"
            order.failure_reason = "Simulated Exchange Matching Engine Timeout: Gateway rejected transaction"
            TRADING_ORDERS_TOTAL.labels(status="FAILED", symbol=order.symbol, side=order.side).inc()
        else:
            order.status = "EXECUTED"
            TRADING_ORDERS_TOTAL.labels(status="EXECUTED", symbol=order.symbol, side=order.side).inc()
            TRADING_ORDER_EXECUTION_LATENCY_SECONDS.labels(symbol=order.symbol).observe(simulated_delay)

        db.commit()
        db.refresh(order)
        logger.info(f"Order {order.client_order_id} {order.status} for {order.symbol} {order.side} {order.quantity}@{order.price} in {order.execution_delay_ms}ms")
        return order, True

    @staticmethod
    def cancel_order(db: Session, order_id: int) -> TradingOrder:
        order = db.query(TradingOrder).filter(TradingOrder.id == order_id).first()
        if not order:
            raise ValueError(f"Order #{order_id} not found")

        if order.status not in ["PENDING", "VALIDATED"]:
            raise ValueError(f"Cannot cancel order in status '{order.status}'. Allowed transitions: {VALID_STATUS_TRANSITIONS.get(order.status, [])}")

        order.status = "CANCELLED"
        order.failure_reason = "Cancelled by user / client request"
        db.commit()
        db.refresh(order)
        TRADING_ORDERS_TOTAL.labels(status="CANCELLED", symbol=order.symbol, side=order.side).inc()
        return order

