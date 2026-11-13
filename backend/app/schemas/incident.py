from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class IncidentEventOut(BaseModel):
    id: int
    incident_id: int
    event_type: str
    description: str
    actor: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=160)
    service_name: str
    severity: str = Field("P2", pattern="^(P1|P2|P3|P4)$")
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class IncidentUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(OPEN|ACKNOWLEDGED|INVESTIGATING|RESOLVED|CLOSED)$")
    severity: Optional[str] = Field(None, pattern="^(P1|P2|P3|P4)$")
    assigned_to: Optional[str] = None
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    notes: Optional[str] = None

class IncidentOut(BaseModel):
    id: int
    incident_number: str
    title: str
    service_name: str
    severity: str
    status: str
    assigned_to: Optional[str] = None
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    mttd_seconds: Optional[float] = None
    mttr_seconds: Optional[float] = None
    events: List[IncidentEventOut] = []

    model_config = ConfigDict(from_attributes=True)

class IncidentMetricsOut(BaseModel):
    total_incidents: int
    active_incidents: int
    p1_count: int
    p2_count: int
    p3_count: int
    p4_count: int
    mttr_avg_minutes: float
    mttd_avg_minutes: float
