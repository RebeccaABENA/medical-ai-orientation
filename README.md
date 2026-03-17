# Medical AI Orientation

Système intelligent d'orientation médicale basé sur l'analyse sémantique et l'IA générative.

---

## Description

**Medical AI Orientation** est une application web permettant à un utilisateur de décrire ses symptômes en langage naturel et d'obtenir une orientation vers les spécialités médicales les plus adaptées.

Le système repose sur :
- Une **analyse sémantique contextuelle** via des embeddings SBERT
- Un **moteur de scoring pondéré** combinant similarité cosinus, localisation et signaux guidés
- Une **détection automatique de red flags** (signaux d'alerte urgents)
- Un **enrichissement conditionnel** des descriptions courtes (< 5 mots) via Llama
- Une **IA générative locale** (Llama via Ollama) pour produire une explication structurée personnalisée
- Une **sauvegarde locale** de chaque session (`sessions.jsonl`)

Ce projet a été réalisé dans le cadre du module **IA Générative** à l'EFREI (2025-2026), thématique : *Orientation vers un médecin selon les symptômes décrits*.

---

## Structure du projet

```
medical-ai-orientation/
│
├── backend/
│   ├── app/
│   │   ├── main.py                    # API FastAPI (point d'entrée)
│   │   ├── data/
│   │   │   └── medical_reference.csv  # Référentiel médical (100 entrées, 15 spécialités)
│   │   └── core/
│   │       ├── dataset.py             # Chargement du CSV + embeddings SBERT
│   │       ├── scoring.py             # Scoring cosinus + pondération localisation/guided
│   │       ├── redflags.py            # Détection des signaux d'alerte
│   │       └── genai.py               # Enrichissement conditionnel + explication Llama (Ollama)
│   └── requirements.txt
│
├── frontend/
│   └── medical-orient/                # Application Next.js
│       ├── app/
│       │   ├── layout.tsx             # Layout global (lang="fr", métadonnées)
│       │   ├── page.tsx               # Page principale : formulaire 3 étapes + résultats
│       │   └── globals.css
│       └── package.json
│
├── sessions.jsonl                     # Sauvegarde locale des sessions (généré au runtime)
├── .gitignore
└── README.md
```

---

## Architecture technique

```
Utilisateur
    │
    ▼
[Frontend Next.js — page.tsx]
    │  POST /orient
    ▼
[Backend FastAPI]
    ├── enrich_if_short()     → Enrichissement conditionnel si < 5 mots (Llama)
    ├── detect_redflags()     → Détection d'urgences (regex + guided + intensité)
    ├── orient_specialty()    → Scoring sémantique SBERT + cosinus + bonus
    │       └── build_user_text() + embeddings + bonus localisation/guided
    └── explain_orientation() → Explication structurée via Llama (Ollama)
    │
    ▼
[sessions.jsonl]              → Sauvegarde horodatée de chaque session
```

---

## Installation et lancement

### Prérequis

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installé avec le modèle `llama3.2:3b`

---

### 1. Cloner le repo

```bash
git clone https://github.com/RebeccaABENA/medical-ai-orientation.git
cd medical-ai-orientation
```

---

### 2. Backend (FastAPI)

```bash
cd backend

# Créer et activer l'environnement virtuel
python -m venv ia_env
ia_env\Scripts\activate        # Windows
# source ia_env/bin/activate   # Mac/Linux

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
uvicorn app.main:app --reload
```

L'API sera disponible sur `http://localhost:8000`  
Documentation interactive : `http://localhost:8000/docs`

---

### 3. Modèle IA générative (Ollama)

```bash
# Installer Ollama : https://ollama.com/download
# Puis télécharger le modèle
ollama pull llama3.2:3b

# Lancer Ollama (dans un terminal séparé)
ollama serve
```

---

### 4. Frontend (Next.js)

```bash
cd frontend/medical-orient

# Installer les dépendances
npm install

# Lancer l'application
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

---

## Fonctionnement du moteur sémantique

### Entrées utilisateur

| Champ | Type | Description |
|-------|------|-------------|
| `symptoms_text` | Texte libre | Description des symptômes en langage naturel |
| `intensity` | Échelle 1-5 (Likert) | Intensité ressentie |
| `duration_days` | Nombre | Durée des symptômes en jours |
| `location` | Texte guidé | Localisation (poitrine, tête, ventre, dos, gorge, peau, yeux, urinaire, pelvien) |
| `guided` | Booléens | Signaux spécifiques (fièvre, douleur thoracique, détresse respiratoire, etc.) |

### Pipeline de traitement

1. **Enrichissement conditionnel** : si `symptoms_text` < 5 mots → appel Llama pour reformuler
2. **Encodage** : texte structuré encodé via `all-MiniLM-L6-v2` (SBERT)
3. **Similarité cosinus** : comparaison avec les embeddings du référentiel médical (100 entrées)
4. **Bonus** : ajustements selon la localisation (+0.05) et les signaux guidés (+0.06 à +0.08)
5. **Agrégation** : Score final = `0.7 × max_score + 0.3 × mean_score` par spécialité
6. **Top 3** : les 3 spécialités avec le score le plus élevé sont retournées

### Seuils de scoring

| Score | Label | Couleur |
|-------|-------|---------|
| ≥ 0.60 | Orientation principale | 🟢 Vert |
| ≥ 0.40 | Orientation secondaire | 🟠 Orange |
| ≥ 0.30 | Faible correspondance | ⚪ Gris |
| < 0.30 | Très faible correspondance | ⚪ Gris clair |

---

## Détection des Red Flags

Le système détecte automatiquement les signaux d'alerte urgents :
- Douleur thoracique / oppression
- Difficulté respiratoire
- Perte de connaissance
- Signes neurologiques aigus
- Saignement digestif ou urinaire
- Intensité maximale (5/5)

En cas de red flag détecté, le champ `urgency` passe à `"urgent"` et un bloc rouge apparaît dans l'interface.

---

## API Endpoints

### `GET /health`
Vérifie que l'API est opérationnelle.

### `POST /orient`
Retourne l'orientation médicale.

**Body (JSON) :**
```json
{
  "symptoms_text": "J'ai des douleurs à la poitrine depuis 2 jours",
  "intensity": 4,
  "duration_days": 2,
  "location": "poitrine",
  "guided": {
    "chest_pain": true,
    "fever": false,
    "fainting": false
  }
}
```

**Réponse :**
```json
{
  "disclaimer": "Orientation indicative uniquement...",
  "red_flags": ["Douleur thoracique / oppression"],
  "urgency": "urgent",
  "top3": [
    { "specialty": "Cardiologie", "score": 0.82, "score_label": "orientation principale", "med_id": 1, "matched_signals": [] },
    { "specialty": "Pneumologie", "score": 0.71, "score_label": "orientation principale", "med_id": 7, "matched_signals": [] },
    { "specialty": "Médecine générale", "score": 0.45, "score_label": "orientation secondaire", "med_id": 27, "matched_signals": [] }
  ],
  "explanation": "..."
}
```

---

## Technologies utilisées

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| NLP / Embeddings | SBERT (`all-MiniLM-L6-v2`) via SentenceTransformers |
| IA Générative | Llama 3.2 (3B) via Ollama (local, coût zéro) |
| Similarité | Similarité cosinus (numpy) |
| Données | CSV structuré (100 entrées, 15 spécialités, colonnes : MedID, BlockID, Specialite, Symptomes_associes, Indications, Organes, RedFlags) |
| Sessions | `sessions.jsonl` (sauvegarde locale horodatée) |

---

## Scénarios de démonstration recommandés

| Scénario | Description | Résultat attendu |
|----------|-------------|------------------|
| **Urgent** | "douleur poitrine essoufflement depuis hier" + chest_pain coché | Red flag détecté, Cardiologie #1 |
| **Simple** | "j'ai mal à la gorge depuis 3 jours avec une légère fièvre" | ORL ou Infectiologie, non urgent |
| **Ambigu** | "fatigue depuis 2 semaines" | Médecine générale + enrichissement si < 5 mots |
