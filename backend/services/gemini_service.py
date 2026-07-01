import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure the Gemini API key
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class GeminiService:
    @staticmethod
    def analyze_feedback(feedback_text: str) -> dict:
        """
        Sends customer feedback text to the Gemini API and returns a structured JSON object.
        
        Args:
            feedback_text (str): The raw customer feedback to analyze.
            
        Returns:
            dict: The structured analysis result containing sentiment, themes, complaints,
                  feature requests, and executive summary.
        """
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in environment variables.")

        # Initialize the gemini-1.5-flash model for cost efficiency
        system_instruction = (
            "System: You are a customer feedback analyst. Always respond in valid JSON only. "
            "No explanation. No markdown."
        )
        
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction,
            generation_config={"response_mime_type": "application/json"}
        )
        
        prompt = f"""User: Analyse the following customer feedback and return this exact JSON structure:
{{
  "sentiment_scores": {{"positive": int, "neutral": int, "negative": int}},
  "themes": [{{"label": str, "count": int, "sentiment": "positive" | "neutral" | "negative"}}],
  "top_complaints": [str],  // max 5
  "feature_requests": [str],  // max 5
  "executive_summary": str  // 2-3 sentences, plain English
}}

Feedback to analyse:
{feedback_text}"""

        try:
            response = model.generate_content(prompt)
            text_response = response.text.strip()
            
            # Clean up potential markdown formatting if returned despite instructions
            if text_response.startswith("```json"):
                text_response = text_response[7:]
            if text_response.endswith("```"):
                text_response = text_response[:-3]
            text_response = text_response.strip()
            
            # Parse response as JSON
            data = json.loads(text_response)
            
            # Perform basic key validation and normalize keys if missing
            required_keys = ["sentiment_scores", "themes", "top_complaints", "feature_requests", "executive_summary"]
            for key in required_keys:
                if key not in data:
                    data[key] = [] if isinstance(required_keys, list) else {}
                    
            if not isinstance(data.get("sentiment_scores"), dict):
                data["sentiment_scores"] = {"positive": 0, "neutral": 0, "negative": 0}
            else:
                for score_key in ["positive", "neutral", "negative"]:
                    if score_key not in data["sentiment_scores"]:
                        data["sentiment_scores"][score_key] = 0
            
            if not isinstance(data.get("themes"), list):
                data["themes"] = []
                
            if not isinstance(data.get("top_complaints"), list):
                data["top_complaints"] = []
                
            if not isinstance(data.get("feature_requests"), list):
                data["feature_requests"] = []
                
            if not isinstance(data.get("executive_summary"), str):
                data["executive_summary"] = ""
                
            return data
            
        except json.JSONDecodeError as jde:
            raise ValueError(f"Gemini API did not return valid JSON. Raw output: {response.text if 'response' in locals() else 'No response'}") from jde
        except Exception as e:
            raise Exception(f"Error communicating with Gemini API: {str(e)}") from e
