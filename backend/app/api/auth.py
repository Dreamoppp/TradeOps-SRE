import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserLogin, Token, UserOut, UserCreate
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role
)
from app.config import settings

logger = logging.getLogger("tradeops.auth")
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "name": user.full_name},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(access_token=access_token, token_type="bearer", user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.post("/seed-users")
def seed_default_users(db: Session = Depends(get_db)):
    """Seed initial development users: admin and engineer"""
    admin_email = "admin@tradeops.io"
    engineer_email = "engineer@tradeops.io"

    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            hashed_password=hash_password("AdminPass123!"),
            full_name="Admin Lead",
            role="admin",
            is_active=True
        )
        db.add(admin)

    engineer = db.query(User).filter(User.email == engineer_email).first()
    if not engineer:
        engineer = User(
            email=engineer_email,
            hashed_password=hash_password("EngineerPass123!"),
            full_name="Production Support Engineer",
            role="engineer",
            is_active=True
        )
        db.add(engineer)

    db.commit()
    return {"message": "Default users initialized (admin@tradeops.io / engineer@tradeops.io)"}

