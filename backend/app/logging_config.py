import json
import logging
import sys
from datetime import datetime, timezone
from contextvars import ContextVar
from typing import Optional, Dict, Any

# Context variables for correlation tracking across async requests
correlation_id_ctx: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)

# In-memory circular log buffer for live frontend streaming and search
LOG_BUFFER: list = []
MAX_BUFFER_SIZE = 2000

class StructuredJsonFormatter(logging.Formatter):
    """
    Format logs as JSON conforming to Module D requirements:
    timestamp, service_name, severity, message, request_id, correlation_id, details
    """
    def __init__(self, service_name: str = "tradeops-api"):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service_name": getattr(record, "service_name", self.service_name),
            "severity": record.levelname,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", request_id_ctx.get()),
            "correlation_id": getattr(record, "correlation_id", correlation_id_ctx.get()),
            "logger": record.name,
        }

        if record.exc_info:
            log_obj["error_details"] = self.formatException(record.exc_info)
        elif hasattr(record, "error_details"):
            log_obj["error_details"] = getattr(record, "error_details")

        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_obj["details"] = record.extra_data
        elif hasattr(record, "details"):
            log_obj["details"] = getattr(record, "details")

        # Save to buffer for fast search API
        if len(LOG_BUFFER) >= MAX_BUFFER_SIZE:
            LOG_BUFFER.pop(0)
        LOG_BUFFER.append(log_obj)

        return json.dumps(log_obj)

def setup_logging(service_name: str = "tradeops-api", log_level: int = logging.INFO):
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)
        
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredJsonFormatter(service_name=service_name))
    root_logger.addHandler(handler)
    
    # Silence noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    return root_logger

