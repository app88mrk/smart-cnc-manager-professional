"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Factory,
  Gauge,
  Layers3,
  LoaderCircle,
  Pencil,
  PlayCircle,
  Plus,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";

import JobSheetEditor from "@/components/jobs/JobSheetEditor";
import {
  createEmptyJobRecord,
  jobSheetProgress,
  normalizeJobSheet,
  totalOperationMinutes,
} from "@/lib/jobSheets";
import { Machine, RecordItem } from "@/types";

type JobsPageProps = {
  records: RecordItem[];
  allRecords: RecordItem[];
  machines: Machine[];
  loading: boolean;
  onSave: (records: RecordItem[]) => Promise<void>;
  onDelete: (record: RecordItem) => void;
  notifySuccess: (message: string) => void;
};

export default function JobsPage({
  records,
  allRecords,
  machines,
  loading,
  onSave,
  onDelete,
  notifySuccess,
}: JobsPageProps) {
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [statusFilter, setStatusFilter] = useState("Tutte");
  const shownRecords = useMemo(
    () =>
      statusFilter === "Tutte"
        ? records
        : records.filter((record) => record.status === statusFilter),
    [records, statusFilter]
  );
  const completed = records.filter(
    (record) => record.status === "Completata"
  ).length;
  const running = records.filter(
    (record) => record.status === "In corso"
  ).length;
  const planned = records.filter(
    (record) => record.status === "Pianificata"
  ).length;
  const late = records.filter(isLate).length;

  return (
    <div className="jobsWorkspace">
      <section className="jobsHero">
        <div>
          <span className="jobsEyebrow">Produzione CNC · ciclo completo</span>
          <h1>Schede di lavorazione</h1>
          <p>
            Dalla commessa al controllo finale: pezzo, piazzamento, ciclo,
            utensili, programmi, parametri, tempi e qualità in un unico
            documento professionale stampabile.
          </p>
        </div>
        <button
          className="primary"
          type="button"
          onClick={() => setEditing(createEmptyJobRecord())}
        >
          <Plus size={18} /> Nuova scheda CNC
        </button>
      </section>

      <section className="jobsKpis" aria-label="Riepilogo lavorazioni">
        <JobKpi icon={<Layers3 />} label="Totali" value={records.length} />
        <JobKpi icon={<CalendarClock />} label="Pianificate" value={planned} />
        <JobKpi icon={<PlayCircle />} label="In corso" value={running} />
        <JobKpi
          icon={late ? <AlertTriangle /> : <CheckCircle2 />}
          label={late ? "In ritardo" : "Completate"}
          value={late || completed}
          tone={late ? "danger" : "ok"}
        />
      </section>

      <section className="jobWorkflowRibbon">
        {[
          ["01", "Commessa", "Pezzo e disegno"],
          ["02", "Setup", "Macchina e origine"],
          ["03", "Ciclo", "Utensili e programmi"],
          ["04", "Qualità", "Misure e risultati"],
          ["05", "PDF", "Riepilogo stampabile"],
        ].map(([number, title, detail]) => (
          <div key={number}>
            <span>{number}</span>
            <p><b>{title}</b><small>{detail}</small></p>
          </div>
        ))}
      </section>

      <section className="jobsListHead">
        <div>
          <h2>Archivio lavorazioni</h2>
          <span>{shownRecords.length} schede visualizzate</span>
        </div>
        <div className="jobsStatusFilters">
          {["Tutte", "Pianificata", "In corso", "Completata", "Sospesa"].map(
            (status) => (
              <button
                type="button"
                className={statusFilter === status ? "active" : ""}
                key={status}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            )
          )}
        </div>
      </section>

      {loading && (
        <div className="inlineLoading" role="status">
          <LoaderCircle className="spinner" size={18} />
          Aggiornamento lavorazioni…
        </div>
      )}

      <section className="guidedJobsGrid professionalJobsGrid">
        {shownRecords.length ? (
          shownRecords.map((record) => (
            <ProfessionalJobCard
              key={record.id}
              record={record}
              allRecords={allRecords}
              machines={machines}
              edit={() => setEditing(record)}
              remove={() => onDelete(record)}
            />
          ))
        ) : (
          <div className="empty jobsEmpty">
            <strong>Nessuna scheda nel filtro selezionato</strong>
            <span>
              Crea la prima scheda CNC completa oppure cambia il filtro.
            </span>
            <button
              className="primary"
              type="button"
              onClick={() => setEditing(createEmptyJobRecord())}
            >
              <Plus size={17} /> Nuova scheda CNC
            </button>
          </div>
        )}
      </section>

      {editing && (
        <JobSheetEditor
          record={editing}
          allRecords={allRecords}
          machines={machines}
          busy={loading}
          close={() => setEditing(null)}
          save={onSave}
          notifySuccess={notifySuccess}
        />
      )}
    </div>
  );
}

function ProfessionalJobCard({
  record,
  allRecords,
  machines,
  edit,
  remove,
}: {
  record: RecordItem;
  allRecords: RecordItem[];
  machines: Machine[];
  edit: () => void;
  remove: () => void;
}) {
  const sheet = normalizeJobSheet(record);
  const progress = jobSheetProgress(record);
  const machine = machines.find((item) => item.id === record.machineId);
  const material = allRecords.find((item) => item.id === sheet.materialId);
  const tools = new Set(
    sheet.operations.map((operation) => operation.toolId).filter(Boolean)
  ).size;
  const completeOperations = sheet.operations.filter(
    (operation) => operation.completed
  ).length;
  const conformChecks = sheet.qualityChecks.filter(
    (check) => check.result === "Conforme"
  ).length;
  const actualMinutes = totalOperationMinutes(
    sheet.operations,
    "actualMinutes"
  );

  return (
    <article className={`guidedJobCard professionalJobCard ${isLate(record) ? "late" : ""}`}>
      <div className="guidedJobCardHead">
        <div className="professionalJobBadges">
          <span className={`jobStatus jobStatus-${slug(record.status)}`}>
            {record.status}
          </span>
          {sheet.approved && <span className="jobApproved"><ShieldCheck size={13} /> Approvata</span>}
          {isLate(record) && <span className="jobLate"><AlertTriangle size={13} /> In ritardo</span>}
        </div>
        <div className="cardActions">
          <button type="button" onClick={edit} title="Apri scheda"><Pencil size={16} /></button>
          <button type="button" onClick={remove} title="Elimina"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="professionalJobTitle">
        <small>{sheet.orderCode || "COMMESSA DA ASSEGNARE"}</small>
        <h3>{sheet.partName || record.title}</h3>
        <p>{sheet.customer || record.subtitle || "Cliente non indicato"}</p>
      </div>

      <div className="jobCompletion">
        <div><span>Completezza scheda</span><b>{progress}%</b></div>
        <div><i style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="jobLinksGrid professionalJobLinks">
        <JobLink icon={<Factory />} label="Macchina" value={machine ? `${machine.brand} ${machine.model}` : record.machine || "Non collegato"} />
        <JobLink icon={<Layers3 />} label="Materiale" value={material?.title || "Non collegato"} />
        <JobLink icon={<Wrench />} label="Ciclo" value={`${completeOperations}/${sheet.operations.length} operazioni`} />
        <JobLink icon={<Gauge />} label="Utensili" value={`${tools} collegati`} />
        <JobLink icon={<ShieldCheck />} label="Qualità" value={`${conformChecks}/${sheet.qualityChecks.length} conformi`} />
        <JobLink icon={<Clock3 />} label="Tempo effettivo" value={actualMinutes ? `${formatNumber(actualMinutes)} min` : "Non registrato"} />
      </div>

      <footer>
        <span>Consegna: <b>{formatDate(sheet.dueDate)}</b></span>
        <button type="button" onClick={edit}>Apri scheda completa</button>
      </footer>
    </article>
  );
}

function JobKpi({
  icon,
  label,
  value,
  tone = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <article className={tone}>
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  );
}

function JobLink({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={value === "Non collegato" ? "missing" : ""}>
      <span>{icon}</span>
      <p><small>{label}</small><b>{value}</b></p>
    </div>
  );
}

function isLate(record: RecordItem) {
  const dueDate = record.jobSheet?.dueDate;
  if (!dueDate || record.status === "Completata") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dueDate}T12:00:00`) < today;
}

function formatDate(value: string) {
  if (!value) return "Da definire";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
  }).format(value);
}

function slug(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
}
