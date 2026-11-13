from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class AlertItem(BaseModel):
    status: str
    labels: Dict[str, str]
    annotations: Dict[str, str]
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None

class AlertmanagerWebhook(BaseModel):
    version: Optional[str] = "4"
    status: str # firing, resolved
    receiver: Optional[str] = None
    alerts: List[AlertItem] = []
    commonLabels: Optional[Dict[str, str]] = {}
    commonAnnotations: Optional[Dict[str, str]] = {}

class AlertOut(BaseModel):
    id: int
    alert_name: str
    service_name: str
    severity: str
    status: str
    description: str
    starts_at: datetime
    ends_at: Optional[datetime] = None
    incident_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
