from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from db.supabase_client import supabase

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/metrics")
def get_admin_metrics(current_user: dict = Depends(get_current_user)):
    """
    Retrieve global usage statistics for the admin dashboard.
    Restricted to admin emails (admin@apexlens.com, admin@example.com) or the default test user.
    """
    # Allow admin access to admin emails and the default testing email
    allowed_admins = ["admin@apexlens.com", "admin@example.com", "test@example.com"]
    user_email = current_user.get("email", "")
    
    if user_email not in allowed_admins:
        raise HTTPException(
            status_code=403, 
            detail="Forbidden. Access restricted to administrator accounts."
        )

    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase client is not configured.")

    try:
        # 1. Fetch all batches to compute counts and unique users
        batches_response = supabase.table("feedback_batches") \
            .select("id, created_at, source_type, user_id, label") \
            .order("created_at", desc=True) \
            .execute()
            
        batches_data = batches_response.data or []
        total_batches = len(batches_data)
        
        # Determine number of unique user IDs
        unique_users = len(list(set(batch["user_id"] for batch in batches_data)))

        # 2. Fetch all analysis results to calculate overall sentiment averages
        results_response = supabase.table("analysis_results") \
            .select("sentiment_json") \
            .execute()
            
        results_data = results_response.data or []
        total_results = len(results_data)

        positive_total = 0
        neutral_total = 0
        negative_total = 0

        for record in results_data:
            scores = record.get("sentiment_json") or {}
            positive_total += scores.get("positive", 0)
            neutral_total += scores.get("neutral", 0)
            negative_total += scores.get("negative", 0)

        avg_sentiment = {
            "positive": round(positive_total / total_results) if total_results > 0 else 0,
            "neutral": round(neutral_total / total_results) if total_results > 0 else 0,
            "negative": round(negative_total / total_results) if total_results > 0 else 0
        }

        return {
            "total_batches": total_batches,
            "total_users": unique_users,
            "average_sentiment": avg_sentiment,
            "recent_batches": batches_data[:10]  # Return last 10 uploads
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to gather admin metrics: {str(e)}")
