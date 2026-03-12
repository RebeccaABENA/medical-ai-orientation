import pandas as pd
from sentence_transformers import SentenceTransformer
import numpy as np

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

class Reference:
    def __init__(self, df: pd.DataFrame, emb: np.ndarray, model: SentenceTransformer):
        self.df = df
        self.emb = emb
        self.model = model

def load_reference(path: str = "app/data/medical_reference.csv") -> Reference:
    
    try:
        df = pd.read_csv(
        path,
        encoding="utf-8",
        sep=",",
        engine="python",
        quotechar='"',
        escapechar="\\",
        on_bad_lines="skip",
    )
    except UnicodeDecodeError:
        df = pd.read_csv(
        path,
        encoding="cp1252",
        sep=",",
        engine="python",
        quotechar='"',
        escapechar="\\",
        on_bad_lines="skip",
    )
    # Texte riche par ligne pour SBERT
    df["ref_text"] = (
        "Spécialité: " + df["Specialite"].astype(str) + ". "
        "Symptômes: " + df["Symptomes_associes"].astype(str) + ". "
        "Indications: " + df["Indications"].astype(str) + ". "
        "Organes/Contexte: " + df.get("Organes", pd.Series([""] * len(df))).astype(str)
    )

    model = SentenceTransformer(MODEL_NAME)
    emb = model.encode(df["ref_text"].tolist(), normalize_embeddings=True)
    return Reference(df=df, emb=emb, model=model)