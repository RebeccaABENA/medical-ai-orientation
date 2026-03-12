"use client";

import { useMemo, useState } from "react";
import {
  Stethoscope, HeartPulse, Brain, Eye, ShieldAlert, Pill,
  Activity, Thermometer, Droplets, Bone, UserRound, Hospital
} from "lucide-react";

type Guided = {
  fever?: boolean;
  chest_pain?: boolean;
  severe_breathing?: boolean;
  fainting?: boolean;
  neuro_signs?: boolean;
  severe_abdominal_pain?: boolean;
  blood_in_stool?: boolean;
  blood_in_urine?: boolean;
};

type Recommendation = {
  specialty: string;
  score: number;
  score_label: string;
  med_id: number;
};

type ApiResponse = {
  disclaimer: string;
  red_flags: string[];
  urgency: "urgent" | "non_urgent";
  top3: Recommendation[];
  explanation: string;
  specialty_cards?: Array<{
    specialty: string;
    definition: string;
    typical_reasons: string[];
    matched_symptoms: string[];
    next_steps: string[];
  }>;
};

function specialtyIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("cardio")) return <HeartPulse className="h-5 w-5" />;
  if (n.includes("neuro")) return <Brain className="h-5 w-5" />;
  if (n.includes("opht")) return <Eye className="h-5 w-5" />;
  if (n.includes("pneumo")) return <Activity className="h-5 w-5" />;
  if (n.includes("derm")) return <Droplets className="h-5 w-5" />;
  if (n.includes("orl")) return <Stethoscope className="h-5 w-5" />;
  if (n.includes("rhum")) return <Bone className="h-5 w-5" />;
  if (n.includes("endo")) return <Thermometer className="h-5 w-5" />;
  if (n.includes("uro")) return <Pill className="h-5 w-5" />;
  if (n.includes("gyne")) return <UserRound className="h-5 w-5" />;
  if (n.includes("infect")) return <ShieldAlert className="h-5 w-5" />;
  return <Hospital className="h-5 w-5" />;
}

export default function OrientPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [symptomsText, setSymptomsText] = useState("");
  const [location, setLocation] = useState("poitrine");
  const [durationDays, setDurationDays] = useState(1);
  const [intensity, setIntensity] = useState(3);

  const [guided, setGuided] = useState<Guided>({
    fever: false,
    chest_pain: false,
    severe_breathing: false,
    fainting: false,
    neuro_signs: false,
    severe_abdominal_pain: false,
    blood_in_stool: false,
    blood_in_urine: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => symptomsText.trim().length >= 8, [symptomsText]);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/orient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms_text: symptomsText,
          intensity,
          duration_days: durationDays,
          location,
          guided,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? "Erreur API");
      setResult(data);
      setStep(3);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-sky-100">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-sky-600 flex items-center justify-center text-white">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Orientation médicale</h1>
              <p className="text-sm text-slate-600">
                Il s'agit d'une indication uniquement et non un diagnostic. En cas de doute, contactez un professionnel.
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-2 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
            EFREI'lib
          </span>
        </header>

        {/* Steps */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {step !== 3 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-sky-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {step === 1 ? "1) Décrire les symptômes" : "2) Questions guidées"}
                  </h2>
                  <div className="text-xs text-slate-500">Étape {step}/3</div>
                </div>

                {step === 1 && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium">Description libre</label>
                      <textarea
                        className="mt-2 w-full rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-sky-300"
                        rows={6}
                        placeholder="Ex: douleur dans la poitrine depuis 2 jours avec essoufflement et fatigue…"
                        value={symptomsText}
                        onChange={(e) => setSymptomsText(e.target.value)}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Écris comme tu parlerais à un médecin: où, depuis quand, et ce que tu ressens.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">Localisation</label>
                        <select
                          className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        >
                          <option value="tête">Tête</option>
                          <option value="poitrine">Poitrine</option>
                          <option value="ventre">Ventre</option>
                          <option value="dos">Dos</option>
                          <option value="gorge">Gorge</option>
                          <option value="peau">Peau</option>
                          <option value="yeux">Yeux</option>
                          <option value="urinaire">Urinaire</option>
                          <option value="pelvien">Pelvien</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Durée (jours)</label>
                        <input
                          className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                          type="number"
                          min={0}
                          max={3650}
                          value={durationDays}
                          onChange={(e) => setDurationDays(parseInt(e.target.value || "0", 10))}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Intensité (1–5)</label>
                        <input
                          className="mt-3 w-full"
                          type="range"
                          min={1}
                          max={5}
                          value={intensity}
                          onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
                        />
                        <div className="text-sm text-slate-600">Intensité: {intensity}/5</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        className="rounded-xl bg-sky-600 px-4 py-3 text-white font-medium disabled:opacity-50"
                        disabled={!canContinue}
                        onClick={() => setStep(2)}
                      >
                        Continuer
                      </button>
                      <button
                        className="rounded-xl border border-slate-200 px-4 py-3 text-slate-700"
                        onClick={() => {
                          setSymptomsText("");
                          setIntensity(3);
                          setDurationDays(1);
                          setLocation("poitrine");
                        }}
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm text-slate-600">
                      Ces questions aident à détecter des signaux d’alerte potentiels.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        ["chest_pain", "Douleur thoracique importante"],
                        ["severe_breathing", "Difficulté respiratoire importante"],
                        ["fainting", "Malaise ou perte de connaissance"],
                        ["neuro_signs", "Trouble de la parole ou faiblesse d’un côté"],
                        ["fever", "Fièvre"],
                        ["severe_abdominal_pain", "Douleur abdominale très intense"],
                        ["blood_in_stool", "Sang dans les selles ou vomissements sanglants"],
                        ["blood_in_urine", "Sang dans les urines"],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                          <input
                            type="checkbox"
                            checked={Boolean((guided as any)[key])}
                            onChange={(e) => setGuided((g) => ({ ...g, [key]: e.target.checked }))}
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button className="rounded-xl border border-slate-200 px-4 py-3" onClick={() => setStep(1)}>
                        Retour
                      </button>
                      <button
                        className="rounded-xl bg-sky-600 px-4 py-3 text-white font-medium disabled:opacity-50"
                        disabled={loading}
                        onClick={submit}
                      >
                        {loading ? "Analyse en cours..." : "Obtenir l’orientation"}
                      </button>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}
                  </div>
                )}
              </div>
            )}

            {step === 3 && result && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-sky-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Bilan</h2>
                  <button
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
                    onClick={() => {
                      setResult(null);
                      setStep(1);
                    }}
                  >
                    Recommencer
                  </button>
                </div>

                {/* Alert */}
                {result.red_flags?.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-700 font-semibold">
                      <ShieldAlert className="h-5 w-5" />
                      Signaux d’alerte détectés
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                      {result.red_flags.map((rf) => (
                        <li key={rf}>{rf}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm text-red-700">
                      Si les symptômes sont sévères ou s’aggravent, demande une aide médicale urgente.
                    </p>
                  </div>
                )}

                {/* Top 3 */}
                <h3 className="mt-5 text-sm font-semibold text-slate-700">Top 3 spécialités</h3>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {result.top3.map((r) => (
  <div key={r.med_id} className="rounded-2xl border border-slate-200 p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sky-700">{specialtyIcon(r.specialty)}</span>
        <div>
          <div className="font-semibold">{r.specialty}</div>
          <div className="mt-1 text-xs text-slate-500">{r.score_label}</div>
        </div>
      </div>
      <span className="text-xs rounded-full bg-sky-100 text-sky-700 px-2 py-1">
        {Math.round(r.score * 100)}%
      </span>
    </div>
  </div>
))}
                </div>

                {/* Enriched cards from backend (recommended) */}
                {result.specialty_cards?.length ? (
                  <div className="mt-6 space-y-4">
                    {result.specialty_cards.map((c) => (
                      <div key={c.specialty} className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2">
                          <span className="text-sky-700">{specialtyIcon(c.specialty)}</span>
                          <h4 className="text-base font-semibold">{c.specialty}</h4>
                        </div>

                        <p className="mt-2 text-sm text-slate-600">{c.definition}</p>

                        {c.matched_symptoms?.length > 0 && (
                          <>
                            <h5 className="mt-3 text-sm font-semibold text-slate-700">Symptômes repérés</h5>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {c.matched_symptoms.map((s) => (
                                <span key={s} className="text-xs rounded-full bg-slate-100 px-3 py-1">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </>
                        )}

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <h5 className="text-sm font-semibold text-slate-700">Raisons fréquentes</h5>
                            <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                              {c.typical_reasons.map((x) => <li key={x}>{x}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold text-slate-700">Prochaines étapes</h5>
                            <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                              {c.next_steps.map((x) => <li key={x}>{x}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* GenAI explanation */}
                <h3 className="mt-6 text-sm font-semibold text-slate-700">Synthèse IA</h3>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap">
                  {result.explanation}
                </div>

                <p className="mt-4 text-xs text-slate-500">{result.disclaimer}</p>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="rounded-2xl bg-white p-6 shadow-sm border border-sky-100 h-fit">
            <h3 className="text-sm font-semibold text-slate-700">Conseils pour une bonne description</h3>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>Où se situe la douleur ou la gêne</li>
              <li>Depuis quand et comment ça évolue</li>
              <li>Ce qui aggrave ou soulage</li>
              <li>Symptômes associés: fièvre, nausées, essoufflement</li>
            </ul>

            <div className="mt-5 rounded-2xl bg-sky-50 border border-sky-100 p-4">
              <div className="text-sm font-semibold text-sky-800">Rappel</div>
              <p className="mt-1 text-sm text-sky-800">
                Orientation indicative uniquement. En cas d’urgence, appelez les services d’urgence.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}