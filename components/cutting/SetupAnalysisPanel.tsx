"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Clock3,
  Gauge,
  RotateCw,
  ShieldCheck,
  Zap,
} from "lucide-react";

import {
  CuttingOperation,
  MaterialIsoGroup,
} from "@/lib/cuttingCalculations";

type Metrics = {
  rpm: number;
  feed: number;
  mrr: number;
  power: number;
  torque: number;
  machiningTime: number;
};

type Limits = {
  spindle: number;
  feed: number;
  power: number;
  torque: number;
};

type Inputs = {
  diameter: number;
  teeth: number;
  cuttingSpeed: number;
  feedValue: number;
  axialDepth: number;
  radialWidth: number;
  length: number;
  passes: number;
};

type Props = {
  operation: CuttingOperation;
  materialGroup: MaterialIsoGroup;
  strategy: string;
  articleCode: string;
  machineName: string;
  valid: boolean;
  metrics: Metrics;
  limits: Limits;
  inputs: Inputs;
  onApplyMachineLimits: () => void;
};

type CheckItem = {
  tone: "success" | "warning" | "danger" | "info";
  title: string;
  detail: string;
};

const operationLabels: Record<CuttingOperation, string> = {
  milling: "Fresatura",
  drilling: "Foratura",
  turning: "Tornitura",
};

export default function SetupAnalysisPanel({
  operation,
  materialGroup,
  strategy,
  articleCode,
  machineName,
  valid,
  metrics,
  limits,
  inputs,
  onApplyMachineLimits,
}: Props) {
  const [copied, setCopied] = useState(false);
  const limitRows = [
    { label: "Mandrino", value: metrics.rpm, limit: limits.spindle, unit: "giri/min" },
    { label: "Avanzamento", value: metrics.feed, limit: limits.feed, unit: "mm/min" },
    { label: "Potenza", value: metrics.power, limit: limits.power, unit: "kW" },
    { label: "Coppia", value: metrics.torque, limit: limits.torque, unit: "Nm" },
  ].filter((row) => row.limit > 0);
  const exceededRows = limitRows.filter((row) => row.value > row.limit);
  const invalidEngagement =
    operation === "milling" &&
    inputs.diameter > 0 &&
    inputs.radialWidth > inputs.diameter;
  const checks = buildChecks({
    valid,
    machineName,
    limitRows,
    exceededRows,
    invalidEngagement,
    operation,
    inputs,
  });
  const setupScore = calculateSetupScore({
    valid,
    articleCode,
    machineName,
    inputs,
    invalidEngagement,
    exceeded: exceededRows.length > 0,
  });
  const status = setupStatus(setupScore, exceededRows.length > 0);

  async function copySummary() {
    const summary = [
      `SMART CNC MANAGER · ${operationLabels[operation]}`,
      `Codice articolo: ${articleCode.trim() || "Manuale"}`,
      `Materiale: ISO ${materialGroup}`,
      `Strategia: ${strategy}`,
      `Macchina: ${machineName || "Non selezionata"}`,
      `D: ${formatNumber(inputs.diameter, 2)} mm`,
      operation === "milling" ? `Z: ${formatNumber(inputs.teeth, 0)}` : "",
      `Vc: ${formatNumber(inputs.cuttingSpeed, 1)} m/min`,
      `${operation === "milling" ? "fz" : "f"}: ${formatNumber(inputs.feedValue, 3)} ${operation === "milling" ? "mm/dente" : "mm/giro"}`,
      `n: ${formatNumber(metrics.rpm, 0)} giri/min`,
      `Vf: ${formatNumber(metrics.feed, 0)} mm/min`,
      `ap: ${formatNumber(inputs.axialDepth, 2)} mm`,
      operation === "milling" ? `ae: ${formatNumber(inputs.radialWidth, 2)} mm` : "",
      `MRR: ${formatNumber(metrics.mrr, 2)} cm³/min`,
      `Potenza stimata: ${formatNumber(metrics.power, 2)} kW`,
      `Coppia stimata: ${formatNumber(metrics.torque, 1)} Nm`,
      metrics.machiningTime > 0
        ? `Tempo stimato: ${formatNumber(metrics.machiningTime, 2)} min`
        : "",
      `Indice setup: ${setupScore}/100 · ${status.label}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = summary;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="setupAnalysisPanel">
      <div className="setupAnalysisHead">
        <div>
          <span>ANALISI COMPLETA DEL SETUP</span>
          <h2>Risultato operativo</h2>
          <p>
            {operationLabels[operation]} · ISO {materialGroup} · {strategy}
          </p>
        </div>

        <div className={`setupScore ${status.tone}`}>
          <strong>{setupScore}</strong>
          <span>
            <b>{status.label}</b>
            <small>Indice setup / 100</small>
          </span>
        </div>
      </div>

      <div className="setupMetricGrid">
        <SetupMetric icon={<RotateCw size={18} />} label="Numero di giri" value={metrics.rpm} unit="giri/min" decimals={0} accent="blue" />
        <SetupMetric icon={<Activity size={18} />} label="Avanzamento Vf" value={metrics.feed} unit="mm/min" decimals={0} accent="green" />
        <SetupMetric icon={<Gauge size={18} />} label="Asportazione MRR" value={metrics.mrr} unit="cm³/min" decimals={2} accent="violet" />
        <SetupMetric icon={<Zap size={18} />} label="Potenza stimata" value={metrics.power} unit="kW" decimals={2} accent="orange" />
        <SetupMetric icon={<ShieldCheck size={18} />} label="Coppia stimata" value={metrics.torque} unit="Nm" decimals={1} accent="slate" />
        <SetupMetric icon={<Clock3 size={18} />} label="Tempo lavorazione" value={metrics.machiningTime} unit="min" decimals={2} accent="slate" />
      </div>

      <div className="setupAnalysisBody">
        <div className="setupChecks">
          <div className="setupSubhead">
            <div>
              <span>CONTROLLO AUTOMATICO</span>
              <h3>Verifiche del setup</h3>
            </div>
            <b>{checks.filter((check) => check.tone === "success").length}/{checks.length}</b>
          </div>

          <div className="setupCheckList">
            {checks.map((check) => (
              <div key={`${check.title}-${check.detail}`} className={check.tone}>
                {check.tone === "success" ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <AlertTriangle size={17} />
                )}
                <span>
                  <b>{check.title}</b>
                  <small>{check.detail}</small>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="machineUtilization">
          <div className="setupSubhead">
            <div>
              <span>CAPACITÀ MACCHINA</span>
              <h3>{machineName || "Macchina non selezionata"}</h3>
            </div>
          </div>

          {limitRows.length ? (
            <div className="machineUtilizationList">
              {limitRows.map((row) => {
                const percent = row.limit > 0 ? (row.value / row.limit) * 100 : 0;
                const exceeded = percent > 100;
                return (
                  <div key={row.label} className={exceeded ? "exceeded" : ""}>
                    <span>
                      <b>{row.label}</b>
                      <small>
                        {formatNumber(row.value, row.label === "Potenza" ? 2 : 0)} / {formatNumber(row.limit, row.label === "Potenza" ? 2 : 0)} {row.unit}
                      </small>
                      <em>{formatNumber(percent, 0)}%</em>
                    </span>
                    <div><i style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="machineUtilizationEmpty">
              <Gauge size={22} />
              <b>{machineName ? "Limiti macchina non disponibili" : "Seleziona una macchina"}</b>
              <span>
                {machineName
                  ? "Inserisci mandrino nella scheda macchina e, nelle note, potenza, avanzamento e coppia massimi."
                  : "Potrai confrontare automaticamente giri, avanzamento, potenza e coppia."}
              </span>
            </div>
          )}

          {exceededRows.length > 0 && (
            <button type="button" className="applySetupLimits" onClick={onApplyMachineLimits}>
              <ShieldCheck size={16} />
              Adegua ai limiti macchina
            </button>
          )}
        </div>
      </div>

      <div className="setupAnalysisFooter">
        <details className="setupFormulaDetails">
          <summary>Mostra formule utilizzate</summary>
          <div>
            <span><b>Giri:</b> n = (Vc × 1000) / (π × D)</span>
            <span>
              <b>Avanzamento:</b> {operation === "milling" ? "Vf = n × fz × Z" : "Vf = n × f"}
            </span>
            <span>
              <b>MRR:</b> volume asportato per minuto in base a operazione, ap, ae, D e Vf
            </span>
            <span><b>Potenza:</b> stima MRR × coefficiente del gruppo ISO</span>
          </div>
        </details>

        <button type="button" className={copied ? "copied" : ""} onClick={copySummary} disabled={!valid}>
          {copied ? <CheckCircle2 size={16} /> : <Clipboard size={16} />}
          {copied ? "Riepilogo copiato" : "Copia riepilogo setup"}
        </button>
      </div>
    </section>
  );
}

function SetupMetric({
  icon,
  label,
  value,
  unit,
  decimals,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  accent: "blue" | "green" | "violet" | "orange" | "slate";
}) {
  return (
    <div className={`setupMetric ${accent}`}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <b>{formatNumber(value, decimals)}</b>
        <em>{unit}</em>
      </div>
    </div>
  );
}

function buildChecks({
  valid,
  machineName,
  limitRows,
  exceededRows,
  invalidEngagement,
  operation,
  inputs,
}: {
  valid: boolean;
  machineName: string;
  limitRows: Array<{ label: string; value: number; limit: number; unit: string }>;
  exceededRows: Array<{ label: string; value: number; limit: number; unit: string }>;
  invalidEngagement: boolean;
  operation: CuttingOperation;
  inputs: Inputs;
}): CheckItem[] {
  const checks: CheckItem[] = [];

  checks.push(
    valid
      ? { tone: "success", title: "Parametri principali validi", detail: "Diametro, Vc e avanzamento permettono il calcolo." }
      : { tone: "danger", title: "Dati principali incompleti", detail: "Compila diametro, Vc, avanzamento e taglienti quando richiesti." }
  );

  if (invalidEngagement) {
    checks.push({ tone: "danger", title: "Larghezza radiale non valida", detail: "In fresatura ae non può superare il diametro utensile D." });
  } else if (
    operation === "milling" &&
    inputs.radialWidth > 0 &&
    inputs.diameter > 0
  ) {
    checks.push({ tone: "success", title: "Impegno radiale coerente", detail: `ae/D = ${formatNumber(inputs.radialWidth / inputs.diameter, 2)}.` });
  } else if (operation === "milling") {
    checks.push({ tone: "info", title: "Asportazione non completa", detail: "Inserisci ae per calcolare MRR, potenza e impegno radiale." });
  }

  checks.push(
    inputs.axialDepth > 0
      ? { tone: "success", title: "Profondità di passata inserita", detail: `ap = ${formatNumber(inputs.axialDepth, 2)} mm.` }
      : { tone: "info", title: "Profondità ap mancante", detail: "Il calcolo di asportazione e potenza resterà parziale." }
  );

  if (!machineName) {
    checks.push({ tone: "warning", title: "Limiti macchina non verificati", detail: "Seleziona una macchina per confrontare il setup con le sue capacità." });
  } else if (!limitRows.length) {
    checks.push({ tone: "warning", title: "Scheda macchina incompleta", detail: "Aggiungi i limiti tecnici nella scheda della macchina selezionata." });
  } else if (exceededRows.length) {
    checks.push({ tone: "danger", title: "Limite macchina superato", detail: exceededRows.map((row) => row.label).join(", ") + "." });
  } else {
    checks.push({ tone: "success", title: "Setup entro i limiti disponibili", detail: `${limitRows.length} capacità macchina controllate.` });
  }

  checks.push(
    inputs.length > 0
      ? { tone: "success", title: "Tempo lavorazione disponibile", detail: `${formatNumber(Math.max(inputs.passes, 1), 0)} passate considerate.` }
      : { tone: "info", title: "Tempo non calcolabile", detail: "Inserisci lunghezza lavorata o profondità foro." }
  );

  return checks;
}

function calculateSetupScore({
  valid,
  articleCode,
  machineName,
  inputs,
  invalidEngagement,
  exceeded,
}: {
  valid: boolean;
  articleCode: string;
  machineName: string;
  inputs: Inputs;
  invalidEngagement: boolean;
  exceeded: boolean;
}) {
  let score = 0;
  if (valid) score += 45;
  if (articleCode.trim()) score += 10;
  if (machineName) score += 10;
  if (inputs.axialDepth > 0) score += 10;
  if (inputs.length > 0) score += 10;
  if (!invalidEngagement) score += 5;
  if (!exceeded) score += 10;
  return Math.min(100, score);
}

function setupStatus(score: number, exceeded: boolean) {
  if (exceeded) return { tone: "danger", label: "Fuori limite" };
  if (score >= 85) return { tone: "success", label: "Setup completo" };
  if (score >= 60) return { tone: "warning", label: "Da completare" };
  return { tone: "neutral", label: "Dati insufficienti" };
}

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}
