from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from app.core.dataset import load_reference
from app.core.scoring import orient_specialty
from app.core.redflags import detect_redflags
from app.core.genai import explain_orientation
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Medical Orientation API", version="1.0")

# Load dataset + embeddings at startup
ref = load_reference()

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
    red_flags = detect_redflags(req.symptoms_text, req.guided, req.intensity, req.duration_days)
    urgency = "urgent" if red_flags else "non_urgent"

    top3 = orient_specialty(ref, req.symptoms_text, req.location, req.duration_days, req.intensity, req.guided)

    explanation = explain_orientation(
        symptoms_text=req.symptoms_text,
        location=req.location,
        duration_days=req.duration_days,
        intensity=req.intensity,
        guided=req.guided,
        top3=top3,
        red_flags=red_flags
    )

    return OrientResponse(
        disclaimer="Orientation indicative uniquement. Ceci ne remplace pas un avis médical. En cas d'urgence ou de doute, appelez les services d'urgence.",
        red_flags=red_flags,
        urgency=urgency,
        top3=top3,
        explanation=explanation
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # DEV ONLY
    allow_credentials=False,  # doit être False si allow_origins=["*"]
    allow_methods=["*"],      # inclut OPTIONS
    allow_headers=["*"],
)