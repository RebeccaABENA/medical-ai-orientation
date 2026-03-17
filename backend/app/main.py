from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from app.core.dataset import load_reference
from app.core.scoring import orient_specialty
from app.core.redflags import detect_redflags
from app.core.genai import explain_orientation, enrich_if_short
from fastapi.middleware.cors import CORSMiddleware
import json
import datetime
import pathlib

app = FastAPI(title="Medical Orientation API", version="1.0")

# Load dataset + embeddings at startup
ref = load_reference()

# Fichier de sessions (EF1.2)
SESSIONS_FILE = pathlib.Path("sessions.jsonl")


class OrientRequest(BaseModel):
    symptoms_text: str = Field(..., min_length=3)
    intensity: int = Field(..., ge=1, le=5)
    duration_days: int = Field(..., ge=0, le=3650)
    location: str = Field(..., min_length=2)  # e.g. "poitrine", "tête", "ventre"
    guided: Dict[str, bool] = Field(default_factory=dict)  # e.g. {"fever": true, "chest_pain": false}

class Recommendation(BaseModel):
    specialty: str
    score: float
    score_label: str
    med_id: int
    matched_signals: List[str] = []

class OrientResponse(BaseModel):
    disclaimer: str
    red_flags: List[str]
    urgency: str
    top3: List[Recommendation]
    explanation: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/orient", response_model=OrientResponse)
def orient(req: OrientRequest):
    # EF4.1 — Enrichissement conditionnel si < 5 mots
    enriched_text = enrich_if_short(req.symptoms_text)

    red_flags = detect_redflags(enriched_text, req.guided, req.intensity, req.duration_days)
    urgency = "urgent" if red_flags else "non_urgent"

    top3 = orient_specialty(ref, enriched_text, req.location, req.duration_days, req.intensity, req.guided)

    explanation = explain_orientation(
        symptoms_text=enriched_text,
        location=req.location,
        duration_days=req.duration_days,
        intensity=req.intensity,
        guided=req.guided,
        top3=top3,
        red_flags=red_flags
    )

    response = OrientResponse(
        disclaimer="Orientation indicative uniquement. Ceci ne remplace pas un avis médical. En cas d'urgence ou de doute, appelez les services d'urgence.",
        red_flags=red_flags,
        urgency=urgency,
        top3=top3,
        explanation=explanation
    )

    # EF1.2 — Sauvegarde de la session avec horodatage
    session_entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "request": {
            "symptoms_text": req.symptoms_text,
            "enriched_text": enriched_text if enriched_text != req.symptoms_text else None,
            "intensity": req.intensity,
            "duration_days": req.duration_days,
            "location": req.location,
            "guided": req.guided,
        },
        "response": {
            "urgency": urgency,
            "red_flags": red_flags,
            "top3": [
                {"specialty": r.specialty, "score": r.score, "score_label": r.score_label}
                for r in response.top3
            ],
        }
    }
    try:
        with open(SESSIONS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(session_entry, ensure_ascii=False) + "\n")
    except Exception:
        pass  # Ne pas faire échouer la requête si la sauvegarde échoue

    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Restreint au frontend local
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)