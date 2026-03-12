# 🏥 Medical AI Orientation

Système intelligent d'orientation médicale basé sur l'analyse sémantique et l'IA générative.

> ⚠️ **Disclaimer** : Ce projet est un outil d'orientation indicative uniquement. Il ne remplace en aucun cas un avis médical. En cas d'urgence, appelez le 15 (SAMU) ou le 112.

---

## 📌 Description

**Medical AI Orientation** est une application web permettant à un utilisateur de décrire ses symptômes en langage naturel et d'obtenir une orientation vers les spécialités médicales les plus adaptées.

Le système repose sur :
- Une **analyse sémantique contextuelle** via des embeddings SBERT
- Un **moteur de scoring pondéré** combinant similarité cosinus, localisation et signaux guidés
- Une **détection automatique de red flags** (signaux d'alerte urgents)
- Une **IA générative locale** (Llama via Ollama) pour produire une explication personnalisée

Ce projet a été réalisé dans le cadre du module **IA Générative** à l'EFREI (2025-2026), thématique : *Orientation vers un médecin selon les symptômes décrits*.

---

## 🗂️ Structure du projet

```
medical-ai-orientation/
│
├── backend/
│   ├── app/
│   │   ├── main.py                  # API FastAPI (point d'entrée)
│   │   ├── data/
│   │   │   └── medical_reference.csv  # Référentiel médical (40+ symptômes, 15+ spécialités)
│   │   └── core/
│   │       ├── dataset.py           # Chargement du CSV + embeddings SBERT
│   │       ├── scoring.py           # Calcul de similarité cosinus + scoring pondéré
│   │       ├── redflags.py          # Détection des signaux d'alerte
│   │       ├── genai.py             # Génération d'explication via Llama (Ollama)
│   │       └── specialties_knowledge.py
│   └── requirements.txt
│
└── frontend/
    └── medical-orient/              # Application Next.js
        ├── app/
        │   ├── page.tsx             # Page d'accueil / formulaire
        │   └── orient/
        │       └── page.tsx         # Page des résultats
        └── package.json
```

---

## ⚙️ Architecture technique

```
Utilisateur
    │
    ▼
[Frontend Next.js]
    │  POST /orient
    ▼
[Backend FastAPI]
    ├── detect_redflags()     → Détection d'urgences
    ├── orient_specialty()    → Scoring sémantique SBERT + cosinus
    │       └── build_user_text() + embeddings + bonus localisation/guided
    └── explain_orientation() → Génération texte via Llama (Ollama)
```

---

## 🚀 Installation et lancement

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

## 🧠 Fonctionnement du moteur sémantique

### Entrées utilisateur
| Champ | Type | Description |
|-------|------|-------------|
| `symptoms_text` | Texte libre | Description des symptômes en langage naturel |
| `intensity` | Échelle 1-5 (Likert) | Intensité ressentie |
| `duration_days` | Nombre | Durée des symptômes en jours |
| `location` | Texte guidé | Localisation (ex: poitrine, tête, ventre) |
| `guided` | Booléens | Signaux spécifiques (fièvre, douleur thoracique, etc.) |

### Pipeline de traitement

1. **Encodage** : Les entrées sont concaténées en un texte structuré et encodées via `all-MiniLM-L6-v2` (SBERT)
2. **Similarité cosinus** : Comparaison avec les embeddings du référentiel médical
3. **Bonus** : Ajustements pondérés selon la localisation (+0.05) et les signaux guidés (+0.06 à +0.08)
4. **Agrégation** : Score final = `0.7 × max_score + 0.3 × mean_score` par spécialité
5. **Top 3** : Les 3 spécialités avec le score le plus élevé sont retournées

### Seuils de scoring
| Score | Label |
|-------|-------|
| ≥ 0.60 | Orientation principale |
| ≥ 0.40 | Orientation secondaire |
| ≥ 0.30 | Faible correspondance |
| < 0.30 | Très faible correspondance |

---

## 🚨 Détection des Red Flags

Le système détecte automatiquement les signaux d'alerte urgents :
- Douleur thoracique / oppression
- Difficulté respiratoire
- Perte de connaissance
- Signes neurologiques aigus
- Saignement digestif ou urinaire
- Intensité maximale (5/5)

En cas de red flag détecté, le champ `urgency` passe à `"urgent"`.

---

## 📡 API Endpoints

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
    { "specialty": "Cardiologie", "score": 0.82, "score_label": "orientation principale" },
    { "specialty": "Pneumologie", "score": 0.71, "score_label": "orientation principale" },
    { "specialty": "Médecine générale", "score": 0.45, "score_label": "orientation secondaire" }
  ],
  "explanation": "..."
}
```

---

## 🛠️ Technologies utilisées

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.10+ |
| NLP / Embeddings | SBERT (`all-MiniLM-L6-v2`) via SentenceTransformers |
| IA Générative | Llama 3.2 (3B) via Ollama (local, coût zéro) |
| Similarité | Similarité cosinus (numpy) |
| Données | CSV structuré (40+ symptômes, 15+ spécialités) |

---

## 👥 Auteurs

Projet réalisé en binôme dans le cadre du cours **IA Générative** — EFREI Data Engineering & AI 2025-2026.

- Rebecca ABENA
- *[Prénom NOM du binôme]*

---

## 📄 Licence

Projet académique — EFREI 2025-2026. Usage éducatif uniquement.
