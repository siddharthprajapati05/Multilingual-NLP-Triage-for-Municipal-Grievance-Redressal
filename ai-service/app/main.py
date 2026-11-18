# ai-service/app/main.py  -  MGRS AI service (replaces the placeholder that returned HTTP 503)
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .mgrs_inference import MGRSPredictor

log = logging.getLogger("mgrs-ai")
MODEL_DIR = Path(os.getenv("MGRS_MODEL_DIR", Path(__file__).resolve().parent.parent / "models" / "mgrs-classifier"))
TRANSLATE = os.getenv("MGRS_TRANSLATE", "0") == "1"   # Default to fast mode (0) so inference takes 0.1s instead of 60s CPU translation

MODEL_LOADED = False
predictor: Optional[MGRSPredictor] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor, MODEL_LOADED
    try:
        predictor = MGRSPredictor(str(MODEL_DIR), translate=TRANSLATE)
        MODEL_LOADED = True
        log.info("MGRS model loaded: %s", predictor.version)
    except Exception:
        log.exception("Could not load the MGRS model from %s", MODEL_DIR)
        MODEL_LOADED = False
    yield


app = FastAPI(title="MGRS AI Service", lifespan=lifespan)


class PredictRequest(BaseModel):
    text: str
    language: Optional[str] = "en"


class PredictionResponse(BaseModel):
    category: Optional[str] = None
    department: Optional[str] = None
    urgency: Optional[str] = None
    confidence: Optional[float] = None
    translated_text: Optional[str] = None
    detected_language: Optional[str] = None
    estimated_resolution_days: Optional[int] = None
    model_version: str = "mgrs-v1"
    ai_pending: bool = False


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL_LOADED,
            "model_version": predictor.version if predictor else None}


@app.post("/predict", response_model=PredictionResponse)
def predict(req: PredictRequest):
    if not MODEL_LOADED or predictor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")   # backend already handles this
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty")
    return predictor.predict(req.text, req.language)
