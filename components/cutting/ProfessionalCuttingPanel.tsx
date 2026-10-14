"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  SlidersHorizontal,
  Star,
} from "lucide-react";

import { MaterialIsoGroup } from "@/lib/cuttingCalculations";
import { RecordItem } from "@/types";

export type CuttingStrategy =
  | "manual"
  | "conservative"
  | "recommended"
  | "productive";

export type CuttingOutcome =
  | "Da testare"
  | "Ottimo"
  | "Regolare"
  | "Vibrazioni"
  | "Usura elevata"
  | "Rottura utensile";

export type MachineCheck = {
  label: string;
  value: string;
  limit: string;
  exceeded: boolean;
};

type Props = {
  strategy: CuttingStrategy;
  materialGroup: MaterialIsoGroup;
  hasCatalogBase: boolean;
  onStrategyChange: (strategy: CuttingStrategy) => void;
  jobs: RecordItem[];
  selectedJobId: string;
  onJobChange: (jobId: string) => void;
  outcome: CuttingOutcome;
  onOutcomeChange: (outcome: CuttingOutcome) => void;
  favorite: boolean;
  onFavoriteChange: (favorite: boolean) => void;
  experienceNotes: string;
  onExperienceNotesChange: (notes: string) => void;
  machineName: string;
  machineChecks: MachineCheck[];
  onApplyMachineLimits: () => void;
};

const strategies: Array<{
  id: CuttingStrategy;
  label: string;
  detail: string;
}> = [
  { id: "conservative", label: "Prudente", detail: "85% del dato catalogo" },
  { id: "recommended", label: "Consigliato", detail: "Dato originale catalogo" },
  { id: "productive", label: "Produttivo", detail: "110% orientativo" },
  { id: "manual", label: "Manuale", detail: "Valori inseriti liberamente" },
];

export default function ProfessionalCuttingPanel({
  strategy,
  materialGroup,
  hasCatalogBase,
  onStrategyChange,
  jobs,
  selectedJobId,
  onJobChange,
  outcome,
  onOutcomeChange,
  favorite,
  onFavoriteChange,
  experienceNotes,
  onExperienceNotesChange,
  machineName,
  machineChecks,
  onApplyMachineLimits,
}: Props) {
  const exceeded = machineChecks.filter((check) => check.exceeded);

  return (
    <section className="professionalCuttingPanel">
      <div className="professionalCuttingHead">
        <div>
          <SlidersHorizontal size={19} />
          <div>
            <span>PREPARAZIONE PROFESSIONALE</span>
            <h2>Strategia, macchina ed esperienza</h2>
          </div>
        </div>
        <small>Materiale selezionato · ISO {materialGroup}</small>
      </div>

      <div className="cuttingStrategyGrid">
        {strategies.map((item) => (
          <button
            key={item.id}
            type="button"
            className={strategy === item.id ? "active" : ""}
            onClick={() => onStrategyChange(item.id)}
            disabled={item.id !== "manual" && !hasCatalogBase}
            title={
              item.id !== "manual" && !hasCatalogBase
                ? "Prima seleziona un parametro dalla libreria catalogo"
                : item.detail
            }
          >
            <b>{item.label}</b>
            <span>{item.detail}</span>
          </button>
        ))}
      </div>

      <p className="cuttingStrategyNotice">
        Le modalità Prudente e Produttivo sono variazioni orientative del dato
        importato. Verifica sempre catalogo, serraggio, sporgenza e condizioni reali.
      </p>

      <div className="professionalCuttingGrid">
        <label>
          <span>Lavorazione / commessa</span>
          <select value={selectedJobId} onChange={(event) => onJobChange(event.target.value)}>
            <option value="">Nessuna lavorazione collegata</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Esito della prova</span>
          <select
            value={outcome}
            onChange={(event) => onOutcomeChange(event.target.value as CuttingOutcome)}
          >
            <option>Da testare</option>
            <option>Ottimo</option>
            <option>Regolare</option>
            <option>Vibrazioni</option>
            <option>Usura elevata</option>
            <option>Rottura utensile</option>
          </select>
        </label>

        <label className="professionalFavorite">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(event) => onFavoriteChange(event.target.checked)}
          />
          <Star size={17} fill={favorite ? "currentColor" : "none"} />
          <span>Salva tra i preferiti</span>
        </label>

        <label className="professionalExperience">
          <span>Note sulla lavorazione reale</span>
          <textarea
            value={experienceNotes}
            onChange={(event) => onExperienceNotesChange(event.target.value)}
            placeholder="Finitura, vibrazioni, usura, durata utensile, modifiche effettuate…"
            rows={3}
          />
        </label>
      </div>

      <div className="machineSafetyPanel">
        <div className="machineSafetyHead">
          <div>
            <Gauge size={18} />
            <div>
              <b>Controllo limiti macchina</b>
              <small>{machineName || "Seleziona una macchina per attivare i controlli"}</small>
            </div>
          </div>
          {exceeded.length > 0 && (
            <button type="button" onClick={onApplyMachineLimits}>
              Applica limiti macchina
            </button>
          )}
        </div>

        {machineChecks.length ? (
          <div className="machineSafetyGrid">
            {machineChecks.map((check) => (
              <article className={check.exceeded ? "warning" : "ok"} key={check.label}>
                {check.exceeded ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
                <div>
                  <span>{check.label}</span>
                  <b>{check.value}</b>
                  <small>Limite: {check.limit}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="machineSafetyEmpty">
            Inserisci nelle note della macchina “Potenza massima: 15 kW” e
            “Avanzamento massimo: 10000 mm/min” oppure “Coppia massima: 80 Nm”
            per aggiungere i relativi controlli.
          </p>
        )}
      </div>
    </section>
  );
}
