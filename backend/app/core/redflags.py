import re
from typing import Dict, List

# Red flags simple (à étendre)
PATTERNS = [
    (r"\b(douleur thoracique|oppression|poitrine)\b", "Douleur thoracique / oppression"),
    (r"\b(essoufflement|difficulté à respirer|respirer)\b", "Difficulté respiratoire"),
    (r"\b(perte de connaissance|syncope|évanouissement)\b", "Perte de connaissance"),
    (r"\b(paralysie|faiblesse d'un côté|troubles de la parole)\b", "Signes neurologiques aigus"),
    (r"\b(sang dans les urines|hématurie)\b", "Sang dans les urines"),
    (r"\b(sang dans les selles|vomissements sanglants)\b", "Saignement digestif"),
]

def detect_redflags(symptoms_text: str, guided: Dict[str, bool], intensity: int, duration_days: int) -> List[str]:
    flags = []
    txt = (symptoms_text or "").lower()

    for pattern, label in PATTERNS:
        if re.search(pattern, txt):
            flags.append(label)

    # guided flags
    if guided.get("chest_pain", False):
        flags.append("Douleur thoracique (question guidée)")
    if guided.get("severe_breathing", False):
        flags.append("Détresse respiratoire (question guidée)")
    if guided.get("fainting", False):
        flags.append("Perte de connaissance (question guidée)")

    # Intensité très élevée
    if intensity >= 5:
        flags.append("Intensité très élevée (5/5)")

    return sorted(list(set(flags)))