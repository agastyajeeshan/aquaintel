import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, AuditLog
from ..schemas import Token, UserLogin, UserRegister, PasswordResetRequest, PasswordResetConfirm
from ..core.security import (
    hash_password, verify_password, create_access_token,
    create_password_reset_token, verify_password_reset_token,
    get_current_user
)

logger = logging.getLogger("aquaintel.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token({
        "sub": user.username,
        "role": user.role,
        "user_id": user.id
    })
    
    # Log successful login
    db.add(AuditLog(
        user_id=user.id,
        username=user.username,
        action="USER_LOGIN",
        resource_type="USER",
        resource_id=str(user.id),
        details={"role": user.role}
    ))
    db.commit()

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
    
    hashed = hash_password(user_in.password)
    
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
    
    db.add(AuditLog(
        user_id=new_user.id,
        username=new_user.username,
        action="USER_REGISTER",
        resource_type="USER",
        resource_id=str(new_user.id),
        details={"role": new_user.role, "email": new_user.email}
    ))
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": new_user.role,
        "username": new_user.username,
        "full_name": new_user.full_name
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="USER_LOGOUT",
        resource_type="USER",
        resource_id=str(current_user.id),
        details={"username": current_user.username}
    ))
    db.commit()
    return {"status": "SUCCESS", "message": "Successfully logged out"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "phone": current_user.phone
    }

@router.post("/password-reset/request")
def request_password_reset(req: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    # Always return success to avoid user enumeration
    if not user:
        return {
            "status": "SENT",
            "message": "If this email is registered, a password reset link has been dispatched."
        }
    
    reset_token = create_password_reset_token(user.email)
    
    # Development mock email delivery
    logger.info(
        f"[MOCK_EMAIL] Password reset requested for {user.email}. "
        f"Reset Token: {reset_token} (expires in 15 minutes)"
    )

    db.add(AuditLog(
        user_id=user.id,
        username=user.username,
        action="PASSWORD_RESET_REQUESTED",
        resource_type="USER",
        resource_id=str(user.id),
        details={"email": user.email}
    ))
    db.commit()

    return {
        "status": "SENT",
        "message": "If this email is registered, a password reset link has been dispatched.",
        "debug_token": reset_token  # Provided for local testing
    }

@router.post("/password-reset/confirm")
def confirm_password_reset(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    email = verify_password_reset_token(req.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.hashed_password = hash_password(req.new_password)
    db.add(AuditLog(
        user_id=user.id,
        username=user.username,
        action="PASSWORD_RESET_COMPLETED",
        resource_type="USER",
        resource_id=str(user.id),
        details={"email": user.email}
    ))
    db.commit()
    
    return {
        "status": "SUCCESS",
        "message": "Password successfully updated. You may now log in with your new credentials."
    }
