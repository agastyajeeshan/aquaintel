from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt
import bcrypt

from ..database import get_db
from ..models import User
from ..schemas import Token, UserLogin, UserRegister
from ..config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def verify_pw(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not verify_pw(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token({
        "sub": user.username,
        "role": user.role,
        "user_id": user.id
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "full_name": user.full_name
    }

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(user_in.password.encode('utf-8'), salt).decode('utf-8')
    
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed,
        full_name=user_in.full_name or user_in.username.title(),
        role=user_in.role or "OPERATOR"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token({
        "sub": new_user.username,
        "role": new_user.role,
        "user_id": new_user.id
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": new_user.role,
        "username": new_user.username,
        "full_name": new_user.full_name
    }

@router.get("/me")
def get_me(username: str = "admin", db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "phone": user.phone
    }
