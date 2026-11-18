# MGRS AI service - model files

ai-service/
  app/main.py                  FastAPI app (POST /predict, GET /health)
  app/mgrs_inference.py        language detection + translation + classifier + lookups
  models/mgrs-classifier/      fine-tuned encoder, heads.pt, tokenizer, meta.json (metrics inside)
  requirements.txt

Run:   pip install -r requirements.txt
       uvicorn app.main:app --host 0.0.0.0 --port 8000
Test:  curl -X POST http://localhost:8000/predict -H "Content-Type: application/json" \
            -d '{"text": "कचरा तीन दिनों से नहीं उठाया गया है", "language": "hi"}'

Env vars: MGRS_TRANSLATE=0 (skip the English translation), MGRS_MODEL_DIR=/path/to/mgrs-classifier
The first translated request downloads the NLLB-200 model (about 2.4 GB) once.
