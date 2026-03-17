import requests
from typing import Dict, List

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:3b"   # ou "llama3.1:8b"


def enrich_if_short(symptoms_text: str) -> str:
    """
    EF4.1 — Enrichissement conditionnel GenAI.
    Si la description fait moins de 5 mots, appelle Llama pour l'enrichir
    avant embedding SBERT. Un seul appel API conditionnel.
    """
    if len(symptoms_text.strip().split()) >= 5:
        return symptoms_text  # Pas besoin d'enrichissement

    prompt = f"""Tu es un assistant medical.
L'utilisateur a decrit ses symptomes en peu de mots : "{symptoms_text}"
Reformule en une phrase complete et descriptive (15-25 mots) pour mieux orienter vers une specialite medicale.
Reponds uniquement avec la phrase reformulee, sans explication."""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False},
            timeout=60
        )
        response.raise_for_status()
        enriched = response.json().get("response", "").strip()
        return enriched if enriched else symptoms_text
    except Exception:
        # En cas d'erreur Ollama, on utilise le texte original
        return symptoms_text


def explain_orientation(
    symptoms_text: str,
    location: str,
    duration_days: int,
    intensity: int,
    guided: Dict[str, bool],
    top3: List[dict],
    red_flags: List[str]
) -> str:
    guided_true = [k for k, v in guided.items() if v]
    top_lines = "\n".join([f"- {x['specialty']} (score {x['score']:.2f})" for x in top3])

    prompt = f"""
Tu es un assistant d orientation medicale.
Tu ne poses jamais de diagnostic.
Tu aides seulement a orienter vers une specialite medicale.

Donnees utilisateur:
- Symptomes: {symptoms_text}
- Localisation: {location}
- Duree: {duration_days} jours
- Intensite: {intensity}/5
- Signaux guides positifs: {', '.join(guided_true) if guided_true else 'aucun'}
- Red flags detectes: {', '.join(red_flags) if red_flags else 'aucun'}

Top recommandations:
{top_lines}

Reponds en francais clair avec exactement ces sections:

Resume
Resume court des symptomes.

Orientation proposee
Pour chaque specialite du top 3:
- definition courte
- pourquoi elle correspond aux symptomes

Symptomes reperes
Liste courte des symptomes importants.

Signaux d alerte
Explique s il y a une urgence potentielle.

Prochaines etapes
Donne 3 conseils concrets.

Termine par:
Ceci ne remplace pas un avis medical.
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()
    except requests.exceptions.ConnectionError:
        return "⚠️ Le service IA local (Ollama) n'est pas disponible. Lancez 'ollama serve' puis réessayez."
    except requests.exceptions.Timeout:
        return "⚠️ La génération IA a dépassé le délai imparti (120s). Réessayez."
    except Exception as e:
        return f"⚠️ Erreur lors de la génération IA : {str(e)}"