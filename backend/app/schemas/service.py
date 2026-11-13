from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ServiceBase(BaseModel):
    name: str
    service_type: str
    url: Optional[str] = None
    check_interval_seconds: int = 10
    timeout_seconds: float = 3.0
    failure_threshold: int = 2
    recovery_threshold: int = 2

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    check_interval_seconds: Optional[int] = None
    timeout_seconds: Optional[float] = None
    failure_threshold: Optional[int] = None
    recovery_threshold: Optional[int] = None
    is_active: Optional[bool] = None

class HealthCheckOut(BaseModel):
    id: int
    service_id: int
    timestamp: datetime
    status: str
    latency_ms: float
    status_code: Optional[int] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ServiceOut(ServiceBase):
    id: int
    status: str
    consecutive_failures: int
    consecutive_successes: int
    last_check_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    recent_checks: Optional[List[HealthCheckOut]] = []

    model_config = ConfigDict(from_attributes=True)
