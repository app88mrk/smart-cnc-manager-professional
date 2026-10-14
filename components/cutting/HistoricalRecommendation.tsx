"use client";

import {
  Check,
  Circle,
  History,
  Sparkles,
} from "lucide-react";

import {
  CuttingOperation,
  MaterialIsoGroup,
} from "@/lib/cuttingCalculations";
import { RecordItem } from "@/types";

export type HistoricalValues = {
  diameter: string;
  teeth: string;
  cuttingSpeed: string;
  feedPerTooth: string;
  feedPerRev: string;
  axialDepth: string;
  radialWidth: string;
};

type ReadinessItem = {
  label: string;
  complete: boolean;
  detail: string;
};

type Props = {
  records: RecordItem[];
  operation: CuttingOperation;
  materialGroup: MaterialIsoGroup;
  machineId: string;
  articleCode: string;
  busy: boolean;
  readiness: ReadinessItem[];
  onUse: (values: HistoricalValues) => void;
};

type HistoricalSample = {
  record: RecordItem;
  outcome: "Ottimo" | "Regolare";
  articleCode: string;
  diameter: number;
  teeth: number;
  cuttingSpeed: number;
  feed: number;
  axialDepth: number;
  radialWidth: number;
};

const operationLabels: Record<CuttingOperation, string> = {
  milling: "fresatura",
  drilling: "foratura",
  turning: "tornitura",
};

export default function HistoricalRecommendation({
  records,
  operation,
  materialGroup,
  machineId,
  articleCode,
  busy,
  readiness,
  onUse,
}: Props) {
  const recommendation = buildRecommendation(
    records,
    operation,
    materialGroup,
    machineId,
    articleCode
  );
  const completedItems = readiness.filter((item) => item.complete).length;
  const readinessPercent = readiness.length
    ? Math.round((completedItems / readiness.length) * 100)
    : 0;

  return (
    <section className="historicalAssistant">
      <div className="historicalRecommendation">
        <div className="historicalRecommendationHead">
          <span className="historicalIcon" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <div>
            <span>ASSISTENTE BASATO SULLA TUA ESPERIENZA</span>
            <h2>Suggerimento dai risultati riusciti</h2>
          </div>
        </div>

        {recommendation ? (
          <>
            <div className="historicalSummary">
              <div>
                <b>{recommendation.samples.length}</b>
                <span>
                  {recommendation.samples.length === 1
                    ? "calcolo riuscito"
                    : "calcoli riusciti"}
                </span>
              </div>
              <div>
                <b>{recommendation.confidence}%</b>
                <span>affidabilità storica</span>
              </div>
              <small>{recommendation.scope}</small>
            </div>

            <div className="historicalMetrics">
              <Metric label="Vc media" value={recommendation.values.cuttingSpeed} unit="m/min" />
              <Metric
                label={operation === "milling" ? "fz medio" : "f medio"}
                value={
                  operation === "milling"
                    ? recommendation.values.feedPerTooth
                    : recommendation.values.feedPerRev
                }
                unit={operation === "milling" ? "mm/dente" : "mm/giro"}
              />
              <Metric label="Diametro" value={recommendation.values.diameter} unit="mm" />
              {operation === "milling" && (
                <Metric label="Taglienti" value={recommendation.values.teeth} />
              )}
            </div>

            <button
              type="button"
              className="historicalUse"
              onClick={() => onUse(recommendation.values)}
              disabled={busy}
            >
              <History size={17} />
              Usa valori storici
            </button>

            <p className="historicalNotice">
              Media ponderata: i risultati “Ottimo” contano più dei “Regolare”.
              I valori restano modificabili e vanno verificati sulla macchina.
            </p>
          </>
        ) : (
          <div className="historicalEmpty">
            <History size={24} />
            <div>
              <b>Nessun confronto storico compatibile</b>
              <p>
                Salva almeno un risultato “Ottimo” o “Regolare” per la stessa
                {` ${operationLabels[operation]}`}, ISO {materialGroup}
                {articleCode.trim() ? " e codice articolo" : ""}. Il suggerimento
                comparirà automaticamente.
              </p>
            </div>
          </div>
        )}
      </div>

      <aside className="setupReadiness">
        <div className="setupReadinessHead">
          <div>
            <span>PREPARAZIONE SETUP</span>
            <h3>{readinessPercent}% completo</h3>
          </div>
          <b>{completedItems}/{readiness.length}</b>
        </div>

        <div
          className="setupReadinessBar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={readinessPercent}
          aria-label={`Preparazione setup ${readinessPercent}%`}
        >
          <span style={{ width: `${readinessPercent}%` }} />
        </div>

        <div className="setupReadinessList">
          {readiness.map((item) => (
            <div
              key={item.label}
              className={item.complete ? "complete" : ""}
            >
              {item.complete ? <Check size={15} /> : <Circle size={15} />}
              <span>
                <b>{item.label}</b>
                <small>{item.detail}</small>
              </span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <b>{value || "—"}</b>
      {unit && <small>{unit}</small>}
    </div>
  );
}

function buildRecommendation(
  records: RecordItem[],
  operation: CuttingOperation,
  materialGroup: MaterialIsoGroup,
  machineId: string,
  articleCode: string
) {
  const normalizedCode = normalizeCode(articleCode);
  const baseSamples = records
    .map((record) => toSample(record, operation, materialGroup))
    .filter((sample): sample is HistoricalSample => Boolean(sample))
    .filter(
      (sample) =>
        !normalizedCode || normalizeCode(sample.articleCode) === normalizedCode
    );

  if (!baseSamples.length) return null;

  const machineSamples = machineId
    ? baseSamples.filter((sample) => sample.record.machineId === machineId)
    : [];
  const samples = machineSamples.length ? machineSamples : baseSamples;
  const scope = machineSamples.length
    ? normalizedCode
      ? "Stesso articolo, materiale ISO e macchina"
      : "Stesso materiale ISO e macchina"
    : normalizedCode
      ? machineId
        ? "Stesso articolo e materiale ISO · altre macchine incluse"
        : "Stesso articolo e materiale ISO"
      : machineId
        ? "Stesso materiale ISO · altre macchine incluse"
        : "Stessa lavorazione e materiale ISO";
  const average = (select: (sample: HistoricalSample) => number) =>
    weightedAverage(samples, select);
  const diameter = average((sample) => sample.diameter);
  const teeth = average((sample) => sample.teeth);
  const cuttingSpeed = average((sample) => sample.cuttingSpeed);
  const feed = average((sample) => sample.feed);

  if (
    diameter <= 0 ||
    cuttingSpeed <= 0 ||
    feed <= 0 ||
    (operation === "milling" && teeth <= 0)
  ) {
    return null;
  }

  const contextBonus = (normalizedCode ? 8 : 0) + (machineSamples.length ? 8 : 0);
  const confidence = Math.min(96, 52 + samples.length * 8 + contextBonus);
  const feedText = decimalText(feed, 3);

  return {
    samples,
    confidence,
    scope,
    values: {
      diameter: decimalText(diameter, 2),
      teeth: decimalText(teeth, 0),
      cuttingSpeed: decimalText(cuttingSpeed, 1),
      feedPerTooth: operation === "milling" ? feedText : "0",
      feedPerRev: operation === "milling" ? "0" : feedText,
      axialDepth: decimalText(average((sample) => sample.axialDepth), 2),
      radialWidth: decimalText(average((sample) => sample.radialWidth), 2),
    },
  };
}

function toSample(
  record: RecordItem,
  operation: CuttingOperation,
  materialGroup: MaterialIsoGroup
): HistoricalSample | null {
  const outcome = noteValue(record.notes, "Esito");
  if (outcome !== "Ottimo" && outcome !== "Regolare") return null;
  if (noteValue(record.notes, "Tipo calcolo") !== operation) return null;

  const isoMatch = noteValue(record.notes, "Materiale").match(
    /\(ISO\s+([PMKNSH])\)/i
  );
  if (isoMatch?.[1]?.toUpperCase() !== materialGroup) return null;

  return {
    record,
    outcome,
    articleCode: noteValue(record.notes, "Codice articolo"),
    diameter: noteNumber(record.notes, "Diametro"),
    teeth: noteNumber(record.notes, "Taglienti"),
    cuttingSpeed: noteNumber(record.notes, "Vc"),
    feed: noteNumber(record.notes, operation === "milling" ? "fz" : "f"),
    axialDepth: noteNumber(record.notes, "ap"),
    radialWidth: noteNumber(record.notes, "ae"),
  };
}

function weightedAverage(
  samples: HistoricalSample[],
  select: (sample: HistoricalSample) => number
) {
  let total = 0;
  let totalWeight = 0;

  samples.forEach((sample) => {
    const value = select(sample);
    if (value <= 0) return;
    const weight = sample.outcome === "Ottimo" ? 3 : 1;
    total += value * weight;
    totalWeight += weight;
  });

  return totalWeight ? total / totalWeight : 0;
}

function noteValue(notes: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    notes.match(new RegExp(`(?:^|\\n)${escapedLabel}:\\s*(.*)$`, "im"))?.[1]?.trim() ||
    ""
  );
}

function noteNumber(notes: string, label: string) {
  const value = noteValue(notes, label).match(/-?\d+(?:[.,]\d+)?/)?.[0] || "0";
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized === "MANUALE" ? "" : normalized;
}

function decimalText(value: number, decimals: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return String(Number(value.toFixed(decimals))).replace(".", ",");
}
