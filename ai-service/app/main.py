"""
Multilingual NLP Triage - AI Service
=====================================
This is a PLACEHOLDER service. The real AI model (IndicBERT or similar)
will be integrated here once the trained model files are provided.

Current behavior: Returns a 503 "Model not integrated" response so the
backend can gracefully fall back and still process complaints without AI.

Future integration:
  1. Place your model files in ./models/
  2. Load the model in the lifespan handler below
  3. Replace the placeholder logic in /predict with your inference code
  4. Update the response schema as needed
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="MGRS AI Classification Service",
    description="Multilingual complaint classification using NLP (integration pending)",
    version="0.1.0-placeholder",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model State ──────────────────────────────────────────────────────────────
MODEL_LOADED = False
model = None


# ─── Schemas ──────────────────────────────────────────────────────────────────
class PredictionRequest(BaseModel):
    """
    Request schema for complaint classification.

    Fields:
        text: The complaint text in the original language.
        language: BCP-47 language code (e.g., 'en', 'hi', 'ta', 'te').
    """
    text: str
    language: str = "en"


class PredictionResponse(BaseModel):
    """
    Response schema for complaint classification.

    Fields:
        category: Predicted complaint category (e.g., 'Sanitation', 'Water Supply').
        department: Suggested department name.
        urgency: Predicted urgency level ('LOW', 'MEDIUM', 'HIGH').
        confidence: Model confidence score (0.0 – 1.0).
        model_version: Identifier of the model used.
        ai_pending: True when no real model is loaded.
    """
    category: Optional[str] = None
    department: Optional[str] = None
    urgency: Optional[str] = None
    confidence: Optional[float] = None
    model_version: str = "placeholder-0.1"
    ai_pending: bool = True


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": MODEL_LOADED,
        "ai_pending": not MODEL_LOADED,
        "message": "AI model integration pending. Service is running as placeholder.",
    }


# ─── Prediction Endpoint ──────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    """
    Classify a municipal complaint.

    When a trained model is integrated:
      1. Tokenize `request.text` using the model's tokenizer.
      2. Run inference.
      3. Map output logits to category/department/urgency labels.
      4. Return a populated PredictionResponse.

    Until the model is integrated, this endpoint raises 503 so the
    backend falls back to unclassified complaint processing.
    """
    if not MODEL_LOADED:
        raise HTTPException(
            status_code=503,
            detail={
                "ai_pending": True,
                "message": (
                    "AI model is not yet integrated. "
                    "Complaint will be processed without AI classification. "
                    "Provide trained model files to enable this feature."
                ),
            },
        )

    # ── Future model inference code goes here ──────────────────────────────
    # tokens = tokenizer(request.text, return_tensors="pt", truncation=True, max_length=512)
    # with torch.no_grad():
    #     outputs = model(**tokens)
    # category = CATEGORY_LABELS[outputs.logits[0].argmax().item()]
    # urgency = URGENCY_LABELS[outputs.logits[1].argmax().item()]
    # department = CATEGORY_TO_DEPT.get(category, "General Administration")
    # confidence = float(outputs.logits[0].softmax(dim=-1).max())
    # return PredictionResponse(
    #     category=category,
    #     department=department,
    #     urgency=urgency,
    #     confidence=confidence,
    #     model_version="indicbert-v1",
    #     ai_pending=False,
    # )
    # ── End future code ───────────────────────────────────────────────────

    raise HTTPException(status_code=503, detail="Model not loaded")


# ─── Model Info ───────────────────────────────────────────────────────────────
@app.get("/model-info")
def model_info():
    """
    Returns expected model integration details for documentation.
    """
    return {
        "expected_model": "IndicBERT or similar multilingual transformer",
        "supported_languages": [
            "en", "hi", "ta", "te", "mr", "bn", "gu", "kn", "ml", "pa"
        ],
        "expected_categories": [
            "Sanitation",
            "Water Supply",
            "Street Lighting",
            "Roads & Maintenance",
            "Parks & Recreation",
            "Electrical",
            "Health",
            "General",
        ],
        "urgency_levels": ["LOW", "MEDIUM", "HIGH"],
        "integration_status": "PENDING",
        "integration_guide": "See README.md -> AI Model Integration section",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
