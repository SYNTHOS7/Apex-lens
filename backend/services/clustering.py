import os
import json
import numpy as np
from sklearn.cluster import KMeans
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from services.gemini_service import GeminiService
from dotenv import load_dotenv

load_dotenv()

class ClusteringService:
    _model = None

    @classmethod
    def get_model(cls):
        """
        Lazy loads the SentenceTransformer model to optimize import speed.
        """
        if cls._model is None:
            cls._model = SentenceTransformer('all-MiniLM-L6-v2')
        return cls._model

    @classmethod
    def cluster_feedback(cls, items: list[str]) -> dict:
        """
        Clusters a list of customer feedback items using embeddings and KMeans.
        Falls back to pure Gemini analysis if item count is less than 20.
        
        Args:
            items (list[str]): The list of individual feedback comments.
            
        Returns:
            dict: The structured analysis result.
        """
        if len(items) < 20:
            # Fallback: If input is small, use pure LLM analysis on the combined text
            combined_text = "\n---\n".join(items)
            return GeminiService.analyze_feedback(combined_text)

        try:
            # 1. Compute embeddings
            model = cls.get_model()
            embeddings = model.encode(items)

            # 2. Perform KMeans clustering
            # Determine dynamic cluster count: 1 cluster per ~7 items, capped between 3 and 10
            num_clusters = max(3, min(10, len(items) // 7))
            kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(embeddings)

            # Group items by cluster label
            clusters = {i: [] for i in range(num_clusters)}
            for item, label in zip(items, cluster_labels):
                clusters[label].append(item)

            # Find representative items for each cluster (nearest to centroid)
            centroids = kmeans.cluster_centers_
            representatives = {}
            for label in range(num_clusters):
                cluster_emb = embeddings[cluster_labels == label]
                centroid = centroids[label]
                # Calculate Euclidean distance to centroid
                distances = np.linalg.norm(cluster_emb - centroid, axis=1)
                sorted_indices = np.argsort(distances)
                cluster_items = clusters[label]
                # Retrieve top 5 closest items
                rep_items = [cluster_items[idx] for idx in sorted_indices[:5]]
                representatives[label] = rep_items

            # 3. Call Gemini to analyze clusters
            prompt = cls._build_prompt(clusters, representatives)
            
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY is not set.")
                
            genai.configure(api_key=api_key)
            system_instruction = (
                "System: You are a customer feedback analyst. Always respond in valid JSON only. "
                "No explanation. No markdown."
            )
            gemini_model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_instruction,
                generation_config={"response_mime_type": "application/json"}
            )
            
            response = gemini_model.generate_content(prompt)
            raw_text = response.text.strip()
            
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()
            
            data = json.loads(raw_text)
            
            # Simple validation on response keys
            required_keys = ["sentiment_scores", "themes", "top_complaints", "feature_requests", "executive_summary"]
            for key in required_keys:
                if key not in data:
                    data[key] = [] if isinstance(required_keys, list) else {}
            
            # Ensure proper counts in themes are mapped correctly
            for theme_idx, theme in enumerate(data.get("themes", [])):
                # Map back the count of the corresponding cluster if Gemini didn't fill it correctly
                if theme_idx < num_clusters:
                    theme["count"] = len(clusters[theme_idx])
            
            return data

        except Exception as e:
            print(f"Clustering analysis failed: {str(e)}. Falling back to pure LLM analysis.")
            # Fallback to pure LLM analysis on a subset of items to avoid token overflow
            subset = items[:50]
            combined_text = "\n---\n".join(subset)
            return GeminiService.analyze_feedback(combined_text)

    @classmethod
    def _build_prompt(cls, clusters: dict, representatives: dict) -> str:
        clusters_info = []
        for label, items in clusters.items():
            rep_samples = representatives[label]
            samples_str = "\n".join([f"- {item}" for item in rep_samples])
            clusters_info.append(
                f"Cluster {label} (Total items in cluster: {len(items)}):\n"
                f"Representative Samples:\n{samples_str}"
            )
            
        clusters_payload = "\n\n".join(clusters_info)
        
        prompt = f"""User: We have clustered a large dataset of customer feedback comments. Here are the representative samples and sizes for each cluster:

{clusters_payload}

Analyse these clusters and return a JSON object with this exact structure:
{{
  "sentiment_scores": {{"positive": int, "neutral": int, "negative": int}},  // Overall sentiment percentage (must sum to 100)
  "themes": [
    {{
      "label": str, // Short descriptive theme name (e.g. "Slow Onboarding", "Pricing Feedback")
      "sentiment": "positive" | "neutral" | "negative" // General sentiment of this cluster
    }}
  ],
  "top_complaints": [str],  // max 5 key issues across the clusters
  "feature_requests": [str],  // max 5 key feature requests from the text
  "executive_summary": str  // 2-3 sentences overview of the findings
}}"""
        return prompt
