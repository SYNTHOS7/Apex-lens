from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from db.supabase_client import supabase

router = APIRouter(prefix="/api/batches", tags=["batches"])

@router.get("")
def get_batches(current_user: dict = Depends(get_current_user)):
    """
    List all feedback batches and their associated analysis results for the current user.
    """
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase client is not configured.")
        
    try:
        response = supabase.table("feedback_batches") \
            .select("*, analysis_results(*)") \
            .eq("user_id", current_user["id"]) \
            .order("created_at", desc=True) \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch batches: {str(e)}")

@router.get("/trends")
def get_trends(current_user: dict = Depends(get_current_user)):
    """
    Retrieve historical sentiment trend data across all batches for the current user.
    """
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase client is not configured.")
        
    try:
        response = supabase.table("feedback_batches") \
            .select("id, label, created_at, analysis_results(sentiment_json)") \
            .eq("user_id", current_user["id"]) \
            .order("created_at", desc=False) \
            .execute()
            
        trends = []
        for item in response.data:
            analysis = item.get("analysis_results")
            # Ensure analysis results exist for the batch
            if analysis and isinstance(analysis, list) and len(analysis) > 0:
                trends.append({
                    "batch_id": item["id"],
                    "label": item["label"],
                    "created_at": item["created_at"],
                    "sentiment_scores": analysis[0].get("sentiment_json")
                })
            elif analysis and isinstance(analysis, dict):
                trends.append({
                    "batch_id": item["id"],
                    "label": item["label"],
                    "created_at": item["created_at"],
                    "sentiment_scores": analysis.get("sentiment_json")
                })
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trends: {str(e)}")

@router.get("/{batch_id}")
def get_batch(batch_id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieve full details of a specific feedback batch, including nested results and themes.
    """
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase client is not configured.")
        
    try:
        response = supabase.table("feedback_batches") \
            .select("*, analysis_results(*), themes(*)") \
            .eq("id", batch_id) \
            .eq("user_id", current_user["id"]) \
            .execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="Batch not found or unauthorized.")
            
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch batch details: {str(e)}")

@router.delete("/{batch_id}")
def delete_batch(batch_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a feedback batch and all cascading records (analysis, themes).
    """
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase client is not configured.")
        
    try:
        response = supabase.table("feedback_batches") \
            .delete() \
            .eq("id", batch_id) \
            .eq("user_id", current_user["id"]) \
            .execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="Batch not found or unauthorized.")
            
        return {
            "status": "success",
            "message": f"Batch {batch_id} successfully deleted."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete batch: {str(e)}")
