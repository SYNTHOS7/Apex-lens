from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.supabase_client import supabase
from typing import Optional

security = HTTPBearer(auto_error=False)

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    FastAPI dependency to extract and verify the JWT authorization token.
    Falls back to a mock test user in development or when auth header is missing/matches 'test-token'.
    """
    test_user = {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "test@example.com",
        "role": "authenticated"
    }

    if not credentials:
        # Return test user if no credentials provided (local development fallback)
        return test_user

    token = credentials.credentials
    if token == "test-token":
        return test_user

    if supabase is None:
        # Return test user if Supabase is not configured yet
        return test_user

    try:
        # Verify token using Supabase Auth Client
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid session token.")
        return {
            "id": response.user.id,
            "email": response.user.email,
            "role": response.user.role
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Session verification failed: {str(e)}")
