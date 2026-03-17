"use client";

import { useMemo, useState } from "react";
import {
  Stethoscope, HeartPulse, Brain, Eye, ShieldAlert, Pill,
  Activity, Thermometer, Droplets, Bone, UserRound, Hospital,
  BarChart2
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
};

// ──────────────────────────────────────────────
// EF4.2 — Parser sections GenAI
// ──────────────────────────────────────────────
const SECTION_DEFS = [
  { key: "resume",      titles: ["Resume", "Résumé"],                             icon: "📋", color: "sky" },
  { key: "orientation", titles: ["Orientation proposee", "Orientation proposée"],  icon: "🧭", color: "violet" },
  { key: "symptomes",   titles: ["Symptomes reperes", "Symptômes repérés"],        icon: "🔍", color: "amber" },
  { key: "alertes",     titles: ["Signaux d alerte", "Signaux d'alerte"],           icon: "⚠️", color: "red" },
  { key: "etapes",      titles: ["Prochaines etapes", "Prochaines étapes"],        icon: "✅", color: "emerald" },
];

type GenAISection = { key: string; title: string; icon: string; color: string; content: string };

function parseGenAISections(text: string): GenAISection[] {
  if (!text) return [];

  // Construire un regex qui matchera tous les titres connus
  const allTitles = SECTION_DEFS.flatMap((s) => s.titles);
  // Escape special chars pour regex
  const escaped = allTitles.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const splitRegex = new RegExp(`(${escaped.join("|")})`, "gi");

  const parts = text.split(splitRegex).map((p) => p.trim()).filter(Boolean);

  const sections: GenAISection[] = [];
  let i = 0;
  while (i < parts.length) {
    const chunk = parts[i];
    const def = SECTION_DEFS.find((s) =>
      s.titles.some((t) => t.toLowerCase() === chunk.toLowerCase())
    );
    if (def && i + 1 < parts.length) {
      sections.push({
        key: def.key,
        title: def.titles[0],
        icon: def.icon,
        color: def.color,
        content: parts[i + 1],
      });
      i += 2;
    } else {
      // Texte avant les sections → intro flottante
      if (sections.length === 0 && chunk.length > 10) {
        sections.push({ key: "intro", title: "Introduction", icon: "💬", color: "slate", content: chunk });
      }
      i++;
    }
  }

  // Si aucune section reconnue, retourner le texte brut dans un seul bloc
  if (sections.length === 0) {
    sections.push({ key: "raw", title: "Synthèse", icon: "🤖", color: "slate", content: text });
  }

  return sections;
}

const sectionColors: Record<string, { bg: string; border: string; title: string; icon: string }> = {
  sky:     { bg: "bg-sky-50",     border: "border-sky-200",     title: "text-sky-800",     icon: "bg-sky-100" },
  violet:  { bg: "bg-violet-50",  border: "border-violet-200",  title: "text-violet-800",  icon: "bg-violet-100" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   title: "text-amber-800",   icon: "bg-amber-100" },
  red:     { bg: "bg-red-50",     border: "border-red-200",     title: "text-red-800",     icon: "bg-red-100" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", title: "text-emerald-800", icon: "bg-emerald-100" },
  slate:   { bg: "bg-slate-50",   border: "border-slate-200",   title: "text-slate-700",   icon: "bg-slate-100" },
};

function GenAIExplanation({ explanation }: { explanation: string }) {
  const sections = parseGenAISections(explanation);
  return (
    <div className="mt-2 space-y-3">
      {sections.map((s) => {
        const c = sectionColors[s.color] ?? sectionColors.slate;
        return (
          <div key={s.key} className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
            <div className={`flex items-center gap-2 font-semibold text-sm mb-2 ${c.title}`}>
              <span className={`flex items-center justify-center h-7 w-7 rounded-lg text-base ${c.icon}`}>
                {s.icon}
              </span>
              {s.title}
            </div>
            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${c.title} opacity-90`}>
              {s.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// EF6 — Code couleur selon le score label
// ──────────────────────────────────────────────
function scoreMeta(score: number): { color: string; bg: string; border: string; label: string } {
  if (score >= 0.6)
    return {
      color: "text-emerald-700",
      bg: "bg-emerald-500",
      border: "border-emerald-200",
      label: "Orientation principale",
    };
  if (score >= 0.4)
    return {
      color: "text-orange-600",
      bg: "bg-orange-400",
      border: "border-orange-200",
      label: "Orientation secondaire",
    };
  if (score >= 0.3)
    return {
      color: "text-slate-500",
      bg: "bg-slate-400",
      border: "border-slate-200",
      label: "Faible correspondance",
    };
  return {
    color: "text-slate-400",
    bg: "bg-slate-300",
    border: "border-slate-100",
    label: "Très faible correspondance",
  };
}

// ──────────────────────────────────────────────
// EF6 — Graphique barres horizontales
// ──────────────────────────────────────────────
function ScoreChart({ top3 }: { top3: Recommendation[] }) {
  return (
    <div className="mt-5 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="h-5 w-5 text-sky-600" />
        <h3 className="text-sm font-semibold text-slate-700">Scores de correspondance</h3>
      </div>

      <div className="space-y-4">
        {top3.map((r, i) => {
          const meta = scoreMeta(r.score);
          const pct = Math.round(r.score * 100);
          return (
            <div key={r.med_id}>
              {/* Ligne label + % */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${meta.color}`}>#{i + 1}</span>
                  <span className="text-sm font-medium text-slate-700">{r.specialty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.color} ${meta.border} bg-white font-medium`}>
                    {meta.label}
                  </span>
                  <span className={`text-sm font-bold ${meta.color}`}>{pct}%</span>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ease-out ${meta.bg}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
          <span className="text-xs text-slate-500">≥ 60% — Principale</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-orange-400 inline-block" />
          <span className="text-xs text-slate-500">≥ 40% — Secondaire</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-slate-400 inline-block" />
          <span className="text-xs text-slate-500">&lt; 40% — Faible</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Icônes par spécialité
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// Page principale
// ──────────────────────────────────────────────
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
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
                Il s&apos;agit d&apos;une indication uniquement et non un diagnostic. En cas de doute, contactez un professionnel.
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-2 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
            EFREI&apos;lib
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

                {/* ─── ÉTAPE 1 ─── */}
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
                        Écris comme tu parlerais à un médecin : où, depuis quand, et ce que tu ressens.
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
                          className="mt-3 w-full accent-sky-600"
                          type="range"
                          min={1}
                          max={5}
                          value={intensity}
                          onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>Légère</span>
                          <span className="font-semibold text-sky-600">{intensity}/5</span>
                          <span>Sévère</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        className="rounded-xl bg-sky-600 px-4 py-3 text-white font-medium disabled:opacity-50 hover:bg-sky-700 transition-colors"
                        disabled={!canContinue}
                        onClick={() => setStep(2)}
                      >
                        Continuer →
                      </button>
                      <button
                        className="rounded-xl border border-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-colors"
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

                {/* ─── ÉTAPE 2 ─── */}
                {step === 2 && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm text-slate-600">
                      Ces questions aident à détecter des signaux d&apos;alerte potentiels.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        ["chest_pain", "Douleur thoracique importante"],
                        ["severe_breathing", "Difficulté respiratoire importante"],
                        ["fainting", "Malaise ou perte de connaissance"],
                        ["neuro_signs", "Trouble de la parole ou faiblesse d'un côté"],
                        ["fever", "Fièvre"],
                        ["severe_abdominal_pain", "Douleur abdominale très intense"],
                        ["blood_in_stool", "Sang dans les selles ou vomissements sanglants"],
                        ["blood_in_urine", "Sang dans les urines"],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            className="accent-sky-600 h-4 w-4"
                            checked={Boolean((guided as Record<string, boolean>)[key])}
                            onChange={(e) => setGuided((g) => ({ ...g, [key]: e.target.checked }))}
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button className="rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors" onClick={() => setStep(1)}>
                        ← Retour
                      </button>
                      <button
                        className="rounded-xl bg-sky-600 px-4 py-3 text-white font-medium disabled:opacity-50 hover:bg-sky-700 transition-colors flex items-center gap-2"
                        disabled={loading}
                        onClick={submit}
                      >
                        {loading ? (
                          <>
                            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Analyse en cours…
                          </>
                        ) : (
                          "Obtenir l'orientation"
                        )}
                      </button>
                    </div>

                    {error && <p className="text-sm text-red-600 rounded-xl bg-red-50 p-3 border border-red-200">{error}</p>}
                  </div>
                )}
              </div>
            )}

            {/* ─── ÉTAPE 3 : RÉSULTATS ─── */}
            {step === 3 && result && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-sky-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Bilan d&apos;orientation</h2>
                  <button
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                    onClick={() => { setResult(null); setStep(1); }}
                  >
                    ↩ Recommencer
                  </button>
                </div>

                {/* ── Bloc red flags ── */}
                {result.red_flags?.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-700 font-semibold">
                      <ShieldAlert className="h-5 w-5" />
                      Signaux d&apos;alerte détectés
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                      {result.red_flags.map((rf) => (
                        <li key={rf}>{rf}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm text-red-700 font-medium">
                      ⚠️ Si les symptômes sont sévères ou s&apos;aggravent, demande une aide médicale urgente.
                    </p>
                  </div>
                )}

                {/* ── EF6 — Graphique des scores ── */}
                <ScoreChart top3={result.top3} />

                {/* ── Top 3 cartes spécialités ── */}
                <h3 className="mt-5 text-sm font-semibold text-slate-700">Détail des spécialités recommandées</h3>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {result.top3.map((r) => {
                    const meta = scoreMeta(r.score);
                    return (
                      <div key={r.med_id} className={`rounded-2xl border p-4 ${meta.border}`}>
                        <div className="flex items-center gap-2">
                          <span className={meta.color}>{specialtyIcon(r.specialty)}</span>
                          <div>
                            <div className="font-semibold text-sm">{r.specialty}</div>
                            <div className={`mt-0.5 text-xs font-medium ${meta.color}`}>{meta.label}</div>
                          </div>
                        </div>
                        <div className={`mt-2 text-lg font-bold ${meta.color}`}>
                          {Math.round(r.score * 100)}%
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── EF4.2 — Synthèse IA structurée ── */}
                <div className="mt-6 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-700">Synthèse IA</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">Généré par Llama 3.2</span>
                </div>
                <GenAIExplanation explanation={result.explanation} />

                <p className="mt-4 text-xs text-slate-500">{result.disclaimer}</p>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="rounded-2xl bg-white p-6 shadow-sm border border-sky-100 h-fit">
            <h3 className="text-sm font-semibold text-slate-700">Conseils pour une bonne description</h3>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>Où se situe la douleur ou la gêne</li>
              <li>Depuis quand et comment ça évolue</li>
              <li>Ce qui aggrave ou soulage</li>
              <li>Symptômes associés : fièvre, nausées, essoufflement</li>
            </ul>

            <div className="mt-5 rounded-2xl bg-sky-50 border border-sky-100 p-4">
              <div className="text-sm font-semibold text-sky-800">Rappel important</div>
              <p className="mt-1 text-sm text-sky-800">
                Orientation indicative uniquement. En cas d&apos;urgence, appelez le 15 (SAMU) ou le 112.
              </p>
            </div>

            {/* Légende couleurs dans sidebar */}
            <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Code couleur des scores</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-600">≥ 60% — Principale</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-400" />
                  <span className="text-xs text-slate-600">≥ 40% — Secondaire</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-400" />
                  <span className="text-xs text-slate-600">&lt; 40% — Faible</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}