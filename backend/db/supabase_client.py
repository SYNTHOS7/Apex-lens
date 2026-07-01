import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize client only if credentials are provided to prevent crash on module import
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase client: {str(e)}")

def db_save_analysis_run(label: str, raw_text: str, source_type: str, analysis_result: dict) -> dict:
    """
    Saves a feedback batch, its corresponding analysis results, and individual themes
    to the Supabase database. Uses a hardcoded test_user_id.
    
    Args:
        label (str): The name/label of the batch.
        raw_text (str): The raw input text analyzed.
        source_type (str): The format ('text', 'csv', 'pdf', 'docx').
        analysis_result (dict): The output dict from Gemini analysis.
        
    Returns:
        dict: A dictionary containing the generated batch_id.
    """
    if supabase is None:
        raise ValueError(
            "Supabase client is not initialized. "
            "Please ensure SUPABASE_URL and SUPABASE_KEY are set in your environment variables."
        )

    # Use the hardcoded test user UUID as requested
    test_user_id = "00000000-0000-0000-0000-000000000001"

    try:
        # 1. Insert into feedback_batches table
        batch_payload = {
            "user_id": test_user_id,
            "label": label,
            "raw_text": raw_text,
            "source_type": source_type
        }
        
        batch_insert = supabase.table("feedback_batches").insert(batch_payload).execute()
        if not batch_insert.data:
            raise Exception("Failed to insert feedback batch.")
            
        batch_id = batch_insert.data[0]["id"]

        # 2. Insert into analysis_results table
        analysis_payload = {
            "batch_id": batch_id,
            "sentiment_json": analysis_result.get("sentiment_scores", {}),
            "themes_json": {
                "themes": analysis_result.get("themes", []),
                "top_complaints": analysis_result.get("top_complaints", []),
                "feature_requests": analysis_result.get("feature_requests", [])
            },
            "summary_text": analysis_result.get("executive_summary", "")
        }
        
        result_insert = supabase.table("analysis_results").insert(analysis_payload).execute()
        if not result_insert.data:
            raise Exception("Failed to insert analysis results.")

        # 3. Insert individual themes into themes table
        themes = analysis_result.get("themes", [])
        if themes:
            themes_payload = []
            for theme in themes:
                themes_payload.append({
                    "batch_id": batch_id,
                    "label": theme.get("label", "Unknown"),
                    "count": theme.get("count", 0),
                    "sentiment": theme.get("sentiment", "neutral")
                })
            
            themes_insert = supabase.table("themes").insert(themes_payload).execute()
            if not themes_insert.data:
                # Log warning but do not fail the overall request since the main batch/results are saved
                print("Warning: Failed to insert individual theme records.")

        return {"batch_id": batch_id}

    except Exception as e:
        # Re-raise with a clear database error message
        raise Exception(f"Database operation failed: {str(e)}") from e
