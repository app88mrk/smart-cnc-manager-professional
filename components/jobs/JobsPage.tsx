"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  Factory,
  Gauge,
  Layers3,
  LoaderCircle,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";

import {
  formatToolNumber,
  normalizeToolDetails,
  parseToolNumber,
} from "@/lib/tools";
import { Machine, RecordItem } from "@/types";

const GUIDED_JOB_MARKER = "[LAVORAZIONE_GUIDATA_V1]";

type JobForm = {
  id: string;
  createdAt: string;
  name: string;
  machineId: string;
  materialId: string;
  toolId: string;
  programId: string;
  calculationId: string;
  quantity: string;
  usedMinutes: string;
  status: string;
  outcome: string;
  notes: string;
};

type JobsPageProps = {
  records: RecordItem[];
  allRecords: RecordItem[];
  machines: Machine[];
  loading: boolean;
  onSave: (records: RecordItem[]) => Promise<void>;
  openLegacyEdit: (record: RecordItem) => void;
  onDelete: (record: RecordItem) => void;
  notifySuccess: (message: string) => void;
};

export default function JobsPage({
  records,
  allRecords,
  machines,
  loading,
  onSave,
  openLegacyEdit,
  onDelete,
  notifySuccess,
}: JobsPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<JobForm>(() => emptyJob());
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Tutte");

  const tools = useMemo(
    () =>
      allRecords.filter(
        (record) =>
          record.module === "tools" &&
          !record.notes.includes("[IMPORT_CATALOGO]")
      ),
    [allRecords]
  );
  const materials = useMemo(
    () => allRecords.filter((record) => record.module === "materials"),
    [allRecords]
  );
  const programs = useMemo(
    () => allRecords.filter((record) => record.module === "programs"),
    [allRecords]
  );
  const calculations = useMemo(
    () => allRecords.filter(isCalculationRecord),
    [allRecords]
  );
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
  const selectedMachine = machines.find(
    (machine) => machine.id === form.machineId
  );
  const formProgress = [
    form.name,
    form.machineId,
    form.materialId,
    form.toolId,
    form.programId || form.calculationId,
  ].filter(Boolean).length;

  function startNew() {
    setForm(emptyJob());
    setFormOpen(true);
  }

  function editJob(record: RecordItem) {
    if (!record.notes.includes(GUIDED_JOB_MARKER)) {
      openLegacyEdit(record);
      return;
    }

    setForm(jobFromRecord(record));
    setFormOpen(true);
  }

  function update<K extends keyof JobForm>(key: K, value: JobForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.machineId || !form.toolId) return;

    const timestamp = new Date().toISOString();
    const previous = records.find((record) => record.id === form.id);
    const selectedMaterial = materials.find(
      (record) => record.id === form.materialId
    );
    const selectedTool = tools.find((record) => record.id === form.toolId);
    const selectedProgram = programs.find(
      (record) => record.id === form.programId
    );
    const selectedCalculation = calculations.find(
      (record) => record.id === form.calculationId
    );
    const accountedMinutes =
      form.status === "Completata"
        ? Math.max(0, numberValue(form.usedMinutes))
        : 0;
    const job: RecordItem = {
      id: form.id,
      module: "jobs",
      title: form.name.trim(),
      subtitle: [
        selectedMachine
          ? `${selectedMachine.brand} ${selectedMachine.model}`
          : "",
        selectedMaterial?.title || "",
        selectedTool?.title || "",
      ]
        .filter(Boolean)
        .join(" · "),
      status: form.status,
      machineId: form.machineId,
      machine: selectedMachine
        ? `${selectedMachine.brand} ${selectedMachine.model}`
        : "",
      notes: buildJobNotes({
        ...form,
        notes: form.notes.trim(),
        accountedMinutes: String(accountedMinutes),
        materialName: selectedMaterial?.title || "",
        toolName: selectedTool?.title || "",
        programName: selectedProgram?.title || "",
        calculationName: selectedCalculation?.title || "",
      }),
      createdAt: previous?.createdAt || form.createdAt,
      updatedAt: timestamp,
    };

    const updates = buildToolUsageUpdates({
      previous,
      nextToolId: form.toolId,
      nextMinutes: accountedMinutes,
      tools,
      timestamp,
    });

    setSaving(true);
    try {
      await onSave([job, ...updates]);
      setForm(emptyJob());
      setFormOpen(false);
      notifySuccess(
        accountedMinutes > 0
          ? `Lavorazione “${job.title}” salvata e vita utensile aggiornata.`
          : `Lavorazione “${job.title}” salvata correttamente.`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="jobsWorkspace">
      <section className="jobsHero">
        <div>
          <span className="jobsEyebrow">Flusso di produzione connesso</span>
          <h1>Lavorazioni guidate</h1>
          <p>
            Collega macchina, materiale, utensile, programma e parametri in
            un’unica scheda. Alla chiusura il tempo viene scalato
            automaticamente dalla vita utensile.
          </p>
        </div>
        <button className="primary" type="button" onClick={startNew}>
          <Plus size={18} /> Nuova lavorazione guidata
        </button>
      </section>

      <section className="jobsKpis" aria-label="Riepilogo lavorazioni">
        <JobKpi icon={<Layers3 />} label="Totali" value={records.length} />
        <JobKpi icon={<CalendarClock />} label="Pianificate" value={planned} />
        <JobKpi icon={<PlayCircle />} label="In corso" value={running} />
        <JobKpi icon={<CheckCircle2 />} label="Completate" value={completed} />
      </section>

      <section className={`jobComposer ${formOpen ? "open" : ""}`}>
        <button
          type="button"
          className="jobComposerToggle"
          onClick={() => setFormOpen((value) => !value)}
        >
          <span>
            <ClipboardCheck size={20} />
            <b>{form.name || "Pianifica una lavorazione completa"}</b>
            <small>{formProgress}/5 collegamenti essenziali compilati</small>
          </span>
          {formOpen ? <ChevronUp /> : <ChevronDown />}
        </button>

        {formOpen && (
          <form className="guidedJobForm" onSubmit={submit}>
            <div className="jobProgressTrack">
              <i style={{ width: `${formProgress * 20}%` }} />
            </div>

            <div className="jobFormGrid">
              <label className="jobWideField">
                Nome lavorazione *
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Es. Staffa supporto mandrino — OP10"
                  required
                />
              </label>
              <JobSelect
                label="1. Macchina *"
                icon={<Factory size={16} />}
                value={form.machineId}
                setValue={(value) => update("machineId", value)}
                options={machines.map((machine) => ({
                  id: machine.id,
                  label: `${machine.brand} ${machine.model}`,
                }))}
                placeholder="Scegli la macchina"
                required
              />
              <JobSelect
                label="2. Materiale"
                icon={<Layers3 size={16} />}
                value={form.materialId}
                setValue={(value) => update("materialId", value)}
                options={materials.map(recordOption)}
                placeholder="Scegli il materiale"
              />
              <JobSelect
                label="3. Utensile *"
                icon={<Wrench size={16} />}
                value={form.toolId}
                setValue={(value) => update("toolId", value)}
                options={tools.map((tool) => ({
                  id: tool.id,
                  label: `${tool.title}${tool.subtitle ? ` · ${tool.subtitle}` : ""}`,
                }))}
                placeholder="Scegli l’utensile"
                required
              />
              <JobSelect
                label="4. Programma CNC"
                icon={<ClipboardCheck size={16} />}
                value={form.programId}
                setValue={(value) => update("programId", value)}
                options={programs.map(recordOption)}
                placeholder="Collega un programma"
              />
              <JobSelect
                label="5. Calcolo parametri"
                icon={<Gauge size={16} />}
                value={form.calculationId}
                setValue={(value) => update("calculationId", value)}
                options={calculations.map(recordOption)}
                placeholder="Collega un calcolo salvato"
              />
              <label>
                Quantità pezzi
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(event) => update("quantity", event.target.value)}
                />
              </label>
              <label>
                Tempo utensile effettivo (min)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.usedMinutes}
                  onChange={(event) => update("usedMinutes", event.target.value)}
                />
              </label>
              <label>
                Stato
                <select
                  value={form.status}
                  onChange={(event) => update("status", event.target.value)}
                >
                  <option>Pianificata</option>
                  <option>In corso</option>
                  <option>Completata</option>
                  <option>Sospesa</option>
                </select>
              </label>
              <label>
                Esito
                <select
                  value={form.outcome}
                  onChange={(event) => update("outcome", event.target.value)}
                >
                  <option>Da verificare</option>
                  <option>Ottimo</option>
                  <option>Regolare</option>
                  <option>Da ottimizzare</option>
                  <option>Problema</option>
                </select>
              </label>
              <label className="jobWideField">
                Note operative
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  placeholder="Piazzamento, serraggio, controlli quota, correzioni…"
                />
              </label>
            </div>

            <div className="jobFormFooter">
              <p>
                {form.status === "Completata" && numberValue(form.usedMinutes) > 0
                  ? `${formatToolNumber(numberValue(form.usedMinutes) / 60)} h saranno contabilizzate sull’utensile selezionato.`
                  : "La vita utensile viene aggiornata solo quando lo stato è Completata."}
              </p>
              <div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setForm(emptyJob());
                    setFormOpen(false);
                  }}
                >
                  Annulla
                </button>
                <button
                  className="primary"
                  type="submit"
                  disabled={saving || !form.name.trim() || !form.machineId || !form.toolId}
                >
                  {saving ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />}
                  Salva lavorazione
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      <section className="jobsListHead">
        <div>
          <h2>Registro di produzione</h2>
          <span>{shownRecords.length} lavorazioni visualizzate</span>
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

      <section className="guidedJobsGrid">
        {shownRecords.length ? (
          shownRecords.map((record) => {
            const details = jobDetails(record, allRecords, machines);
            return (
              <article className="guidedJobCard" key={record.id}>
                <div className="guidedJobCardHead">
                  <span className={`jobStatus jobStatus-${slug(record.status)}`}>
                    {record.status}
                  </span>
                  <div className="cardActions">
                    <button type="button" onClick={() => editJob(record)} title="Modifica">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => onDelete(record)} title="Elimina">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3>{record.title}</h3>
                <p>{record.subtitle || "Collegamenti da completare"}</p>
                <div className="jobLinksGrid">
                  <JobLink icon={<Factory />} label="Macchina" value={details.machine} />
                  <JobLink icon={<Layers3 />} label="Materiale" value={details.material} />
                  <JobLink icon={<Wrench />} label="Utensile" value={details.tool} />
                  <JobLink icon={<ClipboardCheck />} label="Programma" value={details.program} />
                  <JobLink icon={<Gauge />} label="Parametri" value={details.calculation} />
                  <JobLink icon={<Clock3 />} label="Tempo utensile" value={details.time} />
                </div>
                <footer>
                  <span>Esito: <b>{details.outcome}</b></span>
                  <time>{formatDate(record.updatedAt)}</time>
                </footer>
              </article>
            );
          })
        ) : (
          <div className="empty jobsEmpty">
            <strong>Nessuna lavorazione nel filtro selezionato</strong>
            <span>Crea un flusso completo e collega i dati già presenti nell’app.</span>
            <button className="primary" type="button" onClick={startNew}>
              <Plus size={17} /> Nuova lavorazione guidata
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function JobKpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article>
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  );
}

function JobSelect({
  label,
  icon,
  value,
  setValue,
  options,
  placeholder,
  required = false,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  setValue: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="jobFieldLabel">{icon}{label}</span>
      <select value={value} onChange={(event) => setValue(event.target.value)} required={required}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option value={option.id} key={option.id}>{option.label}</option>
        ))}
      </select>
    </label>
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

function emptyJob(): JobForm {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: timestamp,
    name: "",
    machineId: "",
    materialId: "",
    toolId: "",
    programId: "",
    calculationId: "",
    quantity: "1",
    usedMinutes: "0",
    status: "Pianificata",
    outcome: "Da verificare",
    notes: "",
  };
}

function jobFromRecord(record: RecordItem): JobForm {
  return {
    id: record.id,
    createdAt: record.createdAt,
    name: record.title,
    machineId: record.machineId || noteValue(record.notes, "Macchina ID"),
    materialId: noteValue(record.notes, "Materiale ID"),
    toolId: noteValue(record.notes, "Utensile ID"),
    programId: noteValue(record.notes, "Programma ID"),
    calculationId: noteValue(record.notes, "Calcolo ID"),
    quantity: noteValue(record.notes, "Quantità") || "1",
    usedMinutes: noteValue(record.notes, "Tempo utensile minuti") || "0",
    status: record.status || "Pianificata",
    outcome: noteValue(record.notes, "Esito") || "Da verificare",
    notes: noteValue(record.notes, "Note operative"),
  };
}

function buildJobNotes(values: JobForm & {
  accountedMinutes: string;
  materialName: string;
  toolName: string;
  programName: string;
  calculationName: string;
}) {
  return [
    GUIDED_JOB_MARKER,
    `Macchina ID: ${values.machineId}`,
    `Materiale ID: ${values.materialId}`,
    `Materiale: ${values.materialName}`,
    `Utensile ID: ${values.toolId}`,
    `Utensile: ${values.toolName}`,
    `Programma ID: ${values.programId}`,
    `Programma: ${values.programName}`,
    `Calcolo ID: ${values.calculationId}`,
    `Calcolo: ${values.calculationName}`,
    `Quantità: ${values.quantity || "1"}`,
    `Tempo utensile minuti: ${values.usedMinutes || "0"}`,
    `Tempo contabilizzato minuti: ${values.accountedMinutes}`,
    `Esito: ${values.outcome}`,
    `Note operative: ${values.notes.replace(/\r?\n/g, " • ")}`,
  ].join("\n");
}

function buildToolUsageUpdates({
  previous,
  nextToolId,
  nextMinutes,
  tools,
  timestamp,
}: {
  previous?: RecordItem;
  nextToolId: string;
  nextMinutes: number;
  tools: RecordItem[];
  timestamp: string;
}): RecordItem[] {
  const previousToolId = previous
    ? noteValue(previous.notes, "Utensile ID")
    : "";
  const previousMinutes = previous
    ? numberValue(noteValue(previous.notes, "Tempo contabilizzato minuti"))
    : 0;
  const deltas = new Map<string, number>();

  if (previousToolId && previousMinutes) {
    deltas.set(previousToolId, -previousMinutes);
  }
  if (nextToolId && nextMinutes) {
    deltas.set(nextToolId, (deltas.get(nextToolId) || 0) + nextMinutes);
  }

  return Array.from(deltas.entries()).flatMap(([toolId, delta]) => {
      if (Math.abs(delta) <= 0.0001) return [];
      const record = tools.find((tool) => tool.id === toolId);
      if (!record) return [];
      const tool = normalizeToolDetails(record);
      const nextHours = Math.max(
        0,
        parseToolNumber(tool.usedHours) + delta / 60
      );
      const updatedRecord: RecordItem = {
        ...record,
        tool: {
          ...tool,
          usedHours: String(Math.round(nextHours * 1000) / 1000),
          lastUsedAt: delta > 0 ? timestamp.slice(0, 10) : tool.lastUsedAt,
        },
        updatedAt: timestamp,
      };
      return [updatedRecord];
    });
}

function jobDetails(
  record: RecordItem,
  allRecords: RecordItem[],
  machines: Machine[]
) {
  const linked = (label: string) => {
    const id = noteValue(record.notes, `${label} ID`);
    return allRecords.find((item) => item.id === id)?.title ||
      noteValue(record.notes, label) ||
      "Non collegato";
  };
  const machine = machines.find((item) => item.id === record.machineId);
  const minutes = numberValue(noteValue(record.notes, "Tempo utensile minuti"));
  return {
    machine: machine ? `${machine.brand} ${machine.model}` : record.machine || "Non collegato",
    material: linked("Materiale"),
    tool: linked("Utensile"),
    program: linked("Programma"),
    calculation: linked("Calcolo"),
    time: minutes ? `${formatToolNumber(minutes)} min` : "Non registrato",
    outcome: noteValue(record.notes, "Esito") || "Da verificare",
  };
}

function noteValue(notes: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return notes.match(new RegExp(`(?:^|\\n)${escaped}:\\s*(.*)$`, "im"))?.[1]?.trim() || "";
}

function numberValue(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCalculationRecord(record: RecordItem) {
  return (
    record.module === "cutting" ||
    record.notes.includes("[CALCOLO_PARAMETRI_V5]") ||
    /^(Fresatura|Foratura|Tornitura)\s*·/i.test(record.title)
  );
}

function recordOption(record: RecordItem) {
  return {
    id: record.id,
    label: `${record.title}${record.subtitle ? ` · ${record.subtitle}` : ""}`,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function slug(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
}
