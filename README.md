# Medical AI Orientation

## Objectif du projet

Ce projet est un prototype d’orientation médicale assistée par intelligence artificielle.

L’utilisateur décrit librement ses symptômes, indique leur intensité, leur durée, leur localisation, puis répond à quelques questions guidées. Le système analyse ensuite ces informations afin de proposer la spécialité médicale la plus pertinente.

Ce projet ne fournit **pas de diagnostic médical**.  
Il s’agit uniquement d’un outil d’orientation indicative vers un professionnel de santé adapté.

## Fonctionnalités principales

- saisie libre des symptômes
- prise en compte de l’intensité, de la durée et de la localisation
- questions guidées pour détecter certains signaux d’alerte
- scoring sémantique basé sur un référentiel médical
- recommandation des spécialités médicales les plus pertinentes
- synthèse générée par un modèle LLM local
- interface web moderne en Next.js
- backend API en FastAPI

## Technologies utilisées

### Backend
- Python
- FastAPI
- Pandas
- Sentence Transformers
- Scikit-learn
- Ollama
- Llama

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React

## Structure du projet

```text
medical-orient/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── data/
│   │   │   └── medical_reference.csv
│   │   └── core/
│   │       ├── dataset.py
│   │       ├── scoring.py
│   │       ├── redflags.py
│   │       ├── genai.py
│   │       
│   ├── requirements.txt
│   └── ia_env/
│
├── frontend/
│   └── medical-orient/
│       ├── app/
│       │   ├── page.tsx
│       │   └── orient/
│       │       └── page.tsx
│       ├── package.json
│       └── ...
│
└── README.md

Installation
1. Installer Python

Ce projet fonctionne de préférence avec Python 3.11.

Vérifier l’installation :

python --version
2. Créer et activer un environnement virtuel

Depuis le dossier backend :

cd backend
python -m venv ia_env
ia_env\Scripts\activate
3. Installer les dépendances backend
pip install -r requirements.txt
4. Installer Node.js

Installer Node.js depuis le site officiel :

https://nodejs.org

Vérifier l’installation :

node -v
npm -v
5. Installer les dépendances frontend

Depuis le dossier frontend :

cd frontend/medical-orient
npm install
6. Installer Ollama

Installer Ollama depuis :

https://ollama.com
7. Télécharger le modèle Llama

Après installation d’Ollama, lancer :

ollama pull llama3.2:3b

Tu peux aussi utiliser un autre modèle si ta machine le permet, par exemple :

ollama pull llama3.1:8b
Lancer le projet

Le projet nécessite de lancer séparément :

le backend FastAPI

le frontend Next.js

Ollama avec le modèle Llama

1. Lancer Ollama

Assure-toi qu’Ollama est bien actif sur ta machine.

Tu peux tester avec :

ollama run llama3.2:3b
2. Lancer le backend

Depuis le dossier backend :

cd backend
ia_env\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000

Le backend sera accessible à l’adresse :

http://localhost:8000
3. Lancer le frontend

Depuis le dossier frontend/medical-orient :

cd frontend/medical-orient
npm run dev

Le frontend sera accessible à l’adresse :

http://localhost:3000
Utilisation

Ouvrir l’application dans le navigateur

Décrire les symptômes

Renseigner la localisation, la durée et l’intensité

Répondre aux questions guidées

Lancer l’analyse

Consulter les spécialités médicales proposées et la synthèse générée

Exemples de déclarations de symptômes pour tester le projet
Exemple 1 — Cas orienté pneumologie

Description libre :

Depuis environ une semaine j’ai une toux persistante avec une gêne respiratoire surtout la nuit. Je ressens une oppression dans la poitrine et parfois un sifflement quand je respire. Quand je fais un effort comme monter les escaliers je suis essoufflée beaucoup plus vite que d’habitude. J’ai aussi une sensation de fatigue générale.

Localisation :
Poitrine

Durée :
7 jours

Intensité :
4/5

Questions guidées suggérées :

fièvre : non

douleur thoracique : oui

difficulté respiratoire importante : oui

perte de connaissance : non

trouble neurologique : non

douleur abdominale très intense : non

sang dans les selles : non

sang dans les urines : non

Résultat attendu :

Pneumologie en orientation principale

Cardiologie peut apparaître en orientation secondaire

Exemple 2 — Cas orienté gynécologie

Description libre :

Depuis plusieurs jours j’ai des douleurs pelviennes importantes avec des règles beaucoup plus abondantes que d’habitude. J’ai également des saignements en dehors de ma période normale et une sensation de lourdeur dans le bas du ventre. Les douleurs augmentent pendant les rapports et je ressens une fatigue importante depuis quelques jours.

Localisation :
Pelvien

Durée :
5 jours

Intensité :
4/5

Questions guidées suggérées :

fièvre : non

douleur thoracique : non

difficulté respiratoire importante : non

perte de connaissance : non

trouble neurologique : non

douleur abdominale très intense : oui

sang dans les selles : non

sang dans les urines : non

Résultat attendu :

Gynécologie en orientation principale

Remarques importantes

Le modèle Llama doit être disponible localement via Ollama pour générer la synthèse.

Le backend doit être lancé avant le frontend.

Ce projet dépend fortement de la qualité de la description des symptômes par l’utilisateur.

Plus l’utilisateur est précis, plus l’orientation sera pertinente.
