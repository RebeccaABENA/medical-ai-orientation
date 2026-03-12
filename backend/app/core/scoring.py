import numpy as np
from typing import Dict, List


def build_user_text(
    symptoms_text: str,
    location: str,
    duration_days: int,
    intensity: int,
    guided: Dict[str, bool],
) -> str:
    guided_true = [k for k, v in guided.items() if v]

    return (
        f"Symptômes: {symptoms_text}. "
        f"Localisation: {location}. "
        f"Durée: {duration_days} jours. "
        f"Intensité: {intensity}/5. "
        f"Signaux associés: {', '.join(guided_true) if guided_true else 'aucun'}."
    )


def score_label(score: float) -> str:
    if score >= 0.60:
        return "orientation principale"
    elif score >= 0.40:
        return "orientation secondaire"
    elif score >= 0.30:
        return "faible correspondance"
    else:
        return "très faible correspondance"


def orient_specialty(
    ref,
    symptoms_text: str,
    location: str,
    duration_days: int,
    intensity: int,
    guided: Dict[str, bool],
) -> List[dict]:
    """
    Retourne un top 3 de spécialités uniques.
    Le score final d'une spécialité combine :
    - le max des similarités de ses lignes
    - la moyenne de ses similarités
    """

    user_text = build_user_text(
        symptoms_text=symptoms_text,
        location=location,
        duration_days=duration_days,
        intensity=intensity,
        guided=guided,
    )

    # Embedding utilisateur
    user_emb = ref.model.encode([user_text], normalize_embeddings=True)[0]

    # Similarité cosinus (embeddings normalisés => dot product)
    sims = np.dot(ref.emb, user_emb)

    df = ref.df.copy()
    df["sim"] = sims
    df["sim"] = df["sim"].clip(lower=0.0, upper=1.0)

    # Bonus légers basés sur la localisation
    location_lower = (location or "").lower()

    def location_bonus(specialite: str) -> float:
        s = specialite.lower()

        mapping = {
            "poitrine": ["cardiologie", "pneumologie"],
            "tête": ["neurologie", "ophtalmologie", "orl"],
            "ventre": ["gastro-entérologie", "infectiologie"],
            "dos": ["rhumatologie", "néphrologie", "urologie"],
            "gorge": ["orl", "infectiologie"],
            "peau": ["dermatologie"],
            "yeux": ["ophtalmologie"],
            "urinaire": ["urologie", "néphrologie"],
            "pelvien": ["gynécologie", "urologie"],
        }

        for loc, specs in mapping.items():
            if loc == location_lower and any(spec in s for spec in specs):
                return 0.05
        return 0.0

    df["loc_bonus"] = df["Specialite"].apply(location_bonus)

    # Bonus légers basés sur certains guided flags
    def guided_bonus(specialite: str) -> float:
        s = specialite.lower()
        bonus = 0.0

        if guided.get("chest_pain", False):
            if "cardiologie" in s or "pneumologie" in s:
                bonus += 0.06

        if guided.get("severe_breathing", False):
            if "pneumologie" in s or "cardiologie" in s:
                bonus += 0.06

        if guided.get("neuro_signs", False):
            if "neurologie" in s:
                bonus += 0.08

        if guided.get("severe_abdominal_pain", False):
            if "gastro-entérologie" in s or "urologie" in s:
                bonus += 0.06

        if guided.get("blood_in_stool", False):
            if "gastro-entérologie" in s:
                bonus += 0.08

        if guided.get("blood_in_urine", False):
            if "urologie" in s or "néphrologie" in s:
                bonus += 0.08

        if guided.get("fever", False):
            if "infectiologie" in s:
                bonus += 0.05

        return min(bonus, 0.12)

    df["guided_bonus"] = df["Specialite"].apply(guided_bonus)

    # Score ligne
    df["line_score"] = (df["sim"] + df["loc_bonus"] + df["guided_bonus"]).clip(lower=0.0, upper=1.0)

    # Agrégation par spécialité
    grouped = (
        df.groupby("Specialite", as_index=False)
        .agg(
            max_score=("line_score", "max"),
            mean_score=("line_score", "mean"),
            med_id=("MedID", "first"),
        )
    )

    # Score final spécialité
    grouped["score"] = (0.7 * grouped["max_score"] + 0.3 * grouped["mean_score"]).clip(lower=0.0, upper=1.0)

    # Tri décroissant
    grouped = grouped.sort_values("score", ascending=False).reset_index(drop=True)

    # Top 3 spécialités uniques
    top3 = grouped.head(3).copy()

    results = []
    for _, r in top3.iterrows():
        score_value = float(r["score"])
        results.append({
            "specialty": str(r["Specialite"]),
            "score": score_value,
            "score_label": score_label(score_value),
            "med_id": int(r["med_id"]),
            "matched_signals": [],
        })

    return results