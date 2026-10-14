"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Binary,
  Braces,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Cpu,
  Download,
  ExternalLink,
  FileCode2,
  FileWarning,
  Filter,
  GitCompareArrows,
  GitPullRequestArrow,
  Hash,
  History,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import {
  cleanProgramNotes,
  normalizeProgramDetails,
  programCompleteness,
  programUsedByJobs,
} from "@/lib/programs";
import type {
  Machine,
  ProgramRevision,
  RecordItem,
} from "@/types";

type Props = {
  records: RecordItem[];
  allRecords: RecordItem[];
  machines: Machine[];
  loading: boolean;
  openNew: () => void;
  openEdit: (record: RecordItem) => void;
  onDelete: (record: RecordItem) => void;
  onRestoreRevision: (
    record: RecordItem,
    revision: ProgramRevision
  ) => Promise<void>;
};

export default function ProgramsPage({
  records,
  allRecords,
  machines,
  loading,
  openNew,
  openEdit,
  onDelete,
  onRestoreRevision,
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [machineId, setMachineId] = useState("all");
  const [sort, setSort] = useState("updated");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selected, setSelected] = useState<RecordItem | null>(null);

  const statuses = Array.from(
    new Set(records.map((record) => record.status).filter(Boolean))
  );
  const approved = records.filter(
    (record) => normalizeProgramDetails(record).approved
  );
  const production = records.filter(
    (record) => record.status === "In produzione"
  );
  const attention = records.filter(
    (record) =>
      !record.fileUrl ||
      !record.machineId ||
      !normalizeProgramDetails(record).checksum ||
      programCompleteness(record) < 70
  );
  const revisionCount = records.reduce(
    (total, record) =>
      total + normalizeProgramDetails(record).revisions.length,
    0
  );

  const filtered = useMemo(() => {
    const term = normalize(query);
    const result = records.filter((record) => {
      const details = normalizeProgramDetails(record);
      const source = normalize(
        [
          record.title,
          record.subtitle,
          record.machine,
          record.fileName,
          details.programCode,
          details.partName,
          details.drawingCode,
          details.drawingRevision,
          details.controller,
          details.currentVersion,
          details.toolNumbers.join(" "),
          details.workOffsets.join(" "),
        ].join(" ")
      );
      if (term && !source.includes(term)) return false;
      if (status !== "all" && record.status !== status) return false;
      if (machineId !== "all" && record.machineId !== machineId) return false;
      if (
        attentionOnly &&
        record.fileUrl &&
        record.machineId &&
        details.checksum &&
        programCompleteness(record) >= 70
      ) {
        return false;
      }
      return true;
    });

    return [...result].sort((first, second) => {
      if (sort === "title") return first.title.localeCompare(second.title, "it");
      if (sort === "version") {
        return normalizeProgramDetails(second).currentVersion.localeCompare(
          normalizeProgramDetails(first).currentVersion,
          undefined,
          { numeric: true }
        );
      }
      if (sort === "machine") {
        return (first.machine || "").localeCompare(second.machine || "", "it");
      }
      return dateValue(second.updatedAt) - dateValue(first.updatedAt);
    });
  }, [attentionOnly, machineId, query, records, sort, status]);

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setMachineId("all");
    setSort("updated");
    setAttentionOnly(false);
  }

  return (
    <div className="programControlCenter">
      <section className="programHero">
        <div>
          <span>PROGRAM CONTROL · SMART CNC MANAGER</span>
          <h1>Archivio programmi CNC</h1>
          <p>
            Controllo professionale di file, versioni, macchina, disegno,
            validazione e utilizzo in produzione.
          </p>
          <div>
            <button type="button" className="primary" onClick={openNew}>
              <Plus size={18} /> Nuovo programma
            </button>
            <button
              type="button"
              onClick={() => setAttentionOnly((value) => !value)}
              className={attentionOnly ? "active" : ""}
            >
              <ShieldCheck size={17} /> Controllo qualità
            </button>
          </div>
        </div>
        <div className="programHeroVisual" aria-hidden="true">
          <FileCode2 size={48} />
          <b>{records.length}</b>
          <span>file sotto controllo</span>
          <i>{revisionCount} revisioni conservate</i>
        </div>
      </section>

      {loading && (
        <div className="inlineLoading" role="status">
          <LoaderCircle className="spinner" size={18} />
          Sincronizzazione archivio programmi…
        </div>
      )}

      <section className="programStats" aria-label="Indicatori programmi CNC">
        <ProgramStat icon={<Binary />} label="Programmi" value={records.length} detail={`${revisionCount} versioni precedenti`} tone="blue" />
        <ProgramStat icon={<GitPullRequestArrow />} label="In produzione" value={production.length} detail={`${records.length - production.length} fuori linea`} tone="cyan" />
        <ProgramStat icon={<BadgeCheck />} label="Approvati" value={approved.length} detail={`${records.length - approved.length} da validare`} tone={approved.length === records.length && records.length ? "green" : "slate"} />
        <ProgramStat icon={<AlertTriangle />} label="Da completare" value={attention.length} detail={attention.length ? "Verifica metadati e file" : "Archivio completo"} tone={attention.length ? "orange" : "green"} />
      </section>

      {attention.length > 0 && (
        <section className="programQualityAlert">
          <span><FileWarning size={21} /></span>
          <div>
            <b>{attention.length} programmi richiedono un controllo</b>
            <p>File, macchina, checksum o riferimenti tecnici da completare.</p>
          </div>
          <button type="button" onClick={() => setAttentionOnly(true)}>
            Mostra criticità <ChevronRight size={16} />
          </button>
        </section>
      )}

      <section className="programWorkspace">
        <header>
          <div>
            <small>LIBRERIA VERSIONATA</small>
            <h2>Programmi disponibili</h2>
            <p>{filtered.length} risultati su {records.length}</p>
          </div>
          <button type="button" className="primary" onClick={openNew}>
            <Plus size={16} /> Carica programma
          </button>
        </header>

        <div className="programFilters">
          <label className="programSearch">
            <Search size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca codice, pezzo, disegno, macchina, controllo o utensile…"
            />
            {query && <button type="button" onClick={() => setQuery("")}><X size={14} /></button>}
          </label>
          <label><span>Macchina</span><select value={machineId} onChange={(event) => setMachineId(event.target.value)}><option value="all">Tutte</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.brand} {machine.model}</option>)}</select></label>
          <label><span>Stato</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tutti</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Ordina</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Aggiornamento</option><option value="title">Nome A–Z</option><option value="version">Versione</option><option value="machine">Macchina</option></select></label>
          <button type="button" className={attentionOnly ? "programAttentionFilter active" : "programAttentionFilter"} onClick={() => setAttentionOnly((value) => !value)}><Filter size={15} /> Da controllare</button>
          <button type="button" className="programResetFilters" onClick={resetFilters}>Azzera</button>
        </div>

        {filtered.length ? (
          <div className="programGrid">
            {filtered.map((record) => (
              <ProgramCard
                key={record.id}
                record={record}
                allRecords={allRecords}
                open={() => setSelected(record)}
                edit={() => openEdit(record)}
                remove={() => onDelete(record)}
              />
            ))}
          </div>
        ) : (
          <div className="programEmpty">
            <Code2 size={34} />
            <b>Nessun programma trovato</b>
            <span>Modifica i filtri o registra il primo file CNC.</span>
            <button type="button" className="primary" onClick={openNew}><Plus size={16} /> Nuovo programma</button>
          </div>
        )}
      </section>

      {selected && (
        <ProgramDetail
          record={selected}
          allRecords={allRecords}
          close={() => setSelected(null)}
          edit={() => {
            setSelected(null);
            openEdit(selected);
          }}
          remove={() => {
            setSelected(null);
            onDelete(selected);
          }}
          restore={async (revision) => {
            await onRestoreRevision(selected, revision);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function ProgramCard({
  record,
  allRecords,
  open,
  edit,
  remove,
}: {
  record: RecordItem;
  allRecords: RecordItem[];
  open: () => void;
  edit: () => void;
  remove: () => void;
}) {
  const details = normalizeProgramDetails(record);
  const completeness = programCompleteness(record);
  const usedBy = programUsedByJobs(record.id, allRecords).length;
  return (
    <article className={`programCard ${details.approved ? "approved" : "pending"}`}>
      <header>
        <div className="programFileIcon"><FileCode2 size={25} /><span>{extension(record.fileName)}</span></div>
        <div className="programCardActions">
          <button type="button" onClick={edit} title="Modifica"><Pencil size={14} /></button>
          <button type="button" onClick={remove} className="delete" title="Elimina"><Trash2 size={14} /></button>
        </div>
      </header>
      <div className="programCardBadges">
        <span className={`programStatus ${statusClass(record.status)}`}>{record.status || "Bozza"}</span>
        <span className={details.approved ? "programApproval approved" : "programApproval"}>{details.approved ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}{details.approved ? "Approvato" : "Da validare"}</span>
      </div>
      <div className="programCardTitle" onClick={open}>
        <small>{details.programCode || "CODICE NON ASSEGNATO"}</small>
        <h3>{record.title}</h3>
        <p>{details.partName || "Particolare da definire"}</p>
      </div>
      <div className="programCardMeta">
        <span><GitPullRequestArrow size={13} /><b>Versione</b><em>V{details.currentVersion}</em></span>
        <span><Cpu size={13} /><b>Macchina</b><em>{record.machine || "Non collegata"}</em></span>
        <span><Binary size={13} /><b>Controllo</b><em>{details.controller || "—"}</em></span>
        <span><Braces size={13} /><b>Codice</b><em>{details.lineCount ? `${details.lineCount} righe` : "Non analizzato"}</em></span>
      </div>
      <div className="programTechStrip">
        <span><Wrench size={13} /> {details.toolNumbers.length || 0} utensili</span>
        <span><GitPullRequestArrow size={13} /> {details.workOffsets.length || 0} origini</span>
        <span><History size={13} /> {details.revisions.length} revisioni</span>
        <span><Code2 size={13} /> {usedBy} lavorazioni</span>
      </div>
      <div className="programCompleteness">
        <div><span>Completezza e tracciabilità</span><b>{completeness}%</b></div>
        <div><i style={{ width: `${completeness}%` }} /></div>
      </div>
      <footer>
        <span title={details.checksum}><Hash size={13} /> {details.checksum ? details.checksum.slice(0, 10) : "checksum assente"}</span>
        <button type="button" onClick={open}>Apri controllo <ChevronRight size={14} /></button>
      </footer>
    </article>
  );
}

function ProgramDetail({
  record,
  allRecords,
  close,
  edit,
  remove,
  restore,
}: {
  record: RecordItem;
  allRecords: RecordItem[];
  close: () => void;
  edit: () => void;
  remove: () => void;
  restore: (revision: ProgramRevision) => Promise<void>;
}) {
  const details = normalizeProgramDetails(record);
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [compare, setCompare] = useState<ProgramRevision | null>(null);
  const [restoring, setRestoring] = useState("");
  const jobs = programUsedByJobs(record.id, allRecords);

  useEffect(() => {
    let cancelled = false;
    setCode("");
    if (!record.fileUrl || !isTextProgram(record.fileName, record.fileType)) {
      setCodeState("idle");
      return;
    }
    setCodeState("loading");
    fetch(record.fileUrl)
      .then((response) => {
        if (!response.ok) throw new Error("File non disponibile");
        return response.text();
      })
      .then((text) => {
        if (cancelled) return;
        setCode(text);
        setCodeState("ready");
      })
      .catch(() => !cancelled && setCodeState("error"));
    return () => { cancelled = true; };
  }, [record.fileName, record.fileType, record.fileUrl]);

  async function restoreRevision(revision: ProgramRevision) {
    if (!window.confirm(`Ripristinare la versione ${revision.version}? La versione corrente resterà nello storico e il programma tornerà in Bozza.`)) return;
    setRestoring(revision.id);
    try {
      await restore(revision);
    } finally {
      setRestoring("");
    }
  }

  return (
    <div className="programDetailBackdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <aside className="programDetailPanel">
        <header className="programDetailHead">
          <div className="programDetailIdentity">
            <span><FileCode2 size={25} /></span>
            <div><small>{details.programCode || "PROGRAMMA CNC"}</small><h2>{record.title}</h2><p>{details.partName || record.fileName}</p></div>
          </div>
          <div><button type="button" onClick={edit} title="Modifica"><Pencil size={16} /></button><button type="button" onClick={close} title="Chiudi"><X size={18} /></button></div>
        </header>

        <div className="programDetailBody">
          <section className="programReleaseBanner">
            <div><small>RELEASE CORRENTE</small><b>V{details.currentVersion}</b><span className={`programStatus ${statusClass(record.status)}`}>{record.status}</span></div>
            <div className={details.approved ? "approved" : "pending"}>{details.approved ? <BadgeCheck size={22} /> : <AlertTriangle size={22} />}<span><b>{details.approved ? "Approvato per l’uso" : "Validazione richiesta"}</b><small>{details.approved ? `${details.approvedBy} · ${formatDate(details.lastValidatedAt)}` : "Verificare prima della produzione"}</small></span></div>
          </section>

          <section className="programDetailSection">
            <header><span><ShieldCheck size={17} /></span><div><b>Tracciabilità tecnica</b><small>Identità, destinazione e integrità del programma.</small></div></header>
            <div className="programDetailFacts">
              <Fact label="Macchina" value={record.machine || "Non collegata"} />
              <Fact label="Controllo CNC" value={details.controller || "—"} />
              <Fact label="Disegno" value={[details.drawingCode, details.drawingRevision && `Rev. ${details.drawingRevision}`].filter(Boolean).join(" · ") || "—"} />
              <Fact label="Ultima modifica" value={formatDate(record.updatedAt)} />
              <Fact label="File" value={record.fileName || "—"} />
              <Fact label="Dimensione" value={formatBytes(record.fileSize || 0)} />
            </div>
            <div className="programChecksum"><Hash size={15} /><span><small>SHA-256</small><code>{details.checksum || "Checksum non disponibile"}</code></span></div>
          </section>

          <section className="programDetailSection">
            <header><span><Braces size={17} /></span><div><b>Analisi del codice</b><small>Dati rilevati automaticamente nel file corrente.</small></div></header>
            <div className="programAnalysisCards compact">
              <article><Braces size={17} /><small>Righe</small><b>{details.lineCount || "—"}</b></article>
              <article><Wrench size={17} /><small>Utensili</small><b>{details.toolNumbers.length ? details.toolNumbers.join(", ") : "—"}</b></article>
              <article><GitPullRequestArrow size={17} /><small>Origini</small><b>{details.workOffsets.length ? details.workOffsets.join(", ") : "—"}</b></article>
              <article><Code2 size={17} /><small>Lavorazioni</small><b>{jobs.length}</b></article>
            </div>
            {jobs.length > 0 && <div className="programJobLinks">{jobs.slice(0, 4).map((job) => <span key={job.id}>{job.title}</span>)}</div>}
          </section>

          <section className="programDetailSection">
            <header><span><Code2 size={17} /></span><div><b>Anteprima programma</b><small>Consultazione rapida del codice senza modificare il file.</small></div>{record.fileUrl && <a href={record.fileUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Apri file</a>}</header>
            <div className="programCodeViewer">
              {codeState === "loading" ? <span><LoaderCircle className="spinner" size={20} /> Lettura codice…</span> : codeState === "ready" ? <pre>{numberedCode(code)}</pre> : <div><Binary size={28} /><b>Anteprima non disponibile</b><span>{codeState === "error" ? "Il file non è accessibile dal browser." : "Questo formato deve essere aperto o scaricato."}</span></div>}
            </div>
          </section>

          <section className="programDetailSection programHistorySection">
            <header><span><History size={17} /></span><div><b>Storico versioni</b><small>{details.revisions.length} release precedenti conservate in Firebase Storage.</small></div></header>
            {details.revisions.length ? (
              <div className="programTimeline">
                <article className="current"><i /><div><small>CORRENTE · {formatDate(record.updatedAt)}</small><b>Versione {details.currentVersion}</b><p>{details.changeNote || "Versione corrente"}</p></div><span><CheckCircle2 size={14} /> Attiva</span></article>
                {details.revisions.map((revision) => (
                  <article key={revision.id}><i /><div><small>{formatDate(revision.createdAt)} · {revision.status}</small><b>Versione {revision.version}</b><p>{revision.changeNote || revision.fileName}</p><em>{revision.lineCount || 0} righe · {revision.toolNumbers.length} utensili · {revision.checksum ? revision.checksum.slice(0, 10) : "senza checksum"}</em></div><div><button type="button" onClick={() => setCompare(compare?.id === revision.id ? null : revision)}><GitCompareArrows size={14} /> {compare?.id === revision.id ? "Chiudi" : "Confronta"}</button><button type="button" onClick={() => void restoreRevision(revision)} disabled={Boolean(restoring)}><RefreshCcw className={restoring === revision.id ? "spinner" : ""} size={14} /> Ripristina</button><a href={revision.fileUrl} target="_blank" rel="noreferrer" title="Scarica versione"><Download size={14} /></a></div></article>
                ))}
              </div>
            ) : (
              <div className="programHistoryEmpty"><History size={25} /><b>Nessuna revisione precedente</b><span>Caricando un nuovo file, la versione attuale verrà conservata qui.</span></div>
            )}
            {compare && <ProgramComparison currentRecord={record} revision={compare} />}
          </section>

          {cleanProgramNotes(record.notes) && (
            <section className="programDetailSection">
              <header><span><FileCode2 size={17} /></span><div><b>Note tecniche</b><small>Istruzioni associate alla release corrente.</small></div></header>
              <p className="programTechnicalNotes">{cleanProgramNotes(record.notes)}</p>
            </section>
          )}
        </div>

        <footer className="programDetailActions">
          <button type="button" className="danger" onClick={remove}><Trash2 size={15} /> Elimina archivio</button>
          <div><button type="button" onClick={close}>Chiudi</button>{record.fileUrl && <a className="primary" href={record.fileUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Apri programma</a>}</div>
        </footer>
      </aside>
    </div>
  );
}

function ProgramComparison({
  currentRecord,
  revision,
}: {
  currentRecord: RecordItem;
  revision: ProgramRevision;
}) {
  const [contents, setContents] = useState<{ current: string; previous: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setContents(null);
    setError("");
    if (!currentRecord.fileUrl || !isTextProgram(currentRecord.fileName, currentRecord.fileType) || !isTextProgram(revision.fileName, revision.fileType)) {
      setError("Il confronto del codice è disponibile per file testuali CNC.");
      return;
    }
    Promise.all([fetch(currentRecord.fileUrl), fetch(revision.fileUrl)])
      .then(async ([current, previous]) => {
        if (!current.ok || !previous.ok) throw new Error();
        return { current: await current.text(), previous: await previous.text() };
      })
      .then((value) => !cancelled && setContents(value))
      .catch(() => !cancelled && setError("Non è stato possibile leggere una delle due versioni."));
    return () => { cancelled = true; };
  }, [currentRecord.fileName, currentRecord.fileType, currentRecord.fileUrl, revision]);

  return (
    <div className="programComparison">
      <header><GitCompareArrows size={16} /><b>Confronto V{revision.version} → V{normalizeProgramDetails(currentRecord).currentVersion}</b></header>
      {error ? <p>{error}</p> : !contents ? <span><LoaderCircle className="spinner" size={18} /> Preparazione confronto…</span> : <div><section><small>VERSIONE {revision.version}</small><pre>{numberedCode(contents.previous)}</pre></section><section><small>VERSIONE CORRENTE</small><pre>{numberedCode(contents.current)}</pre></section></div>}
    </div>
  );
}

function ProgramStat({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string | number; detail: string; tone: string }) {
  return <article className={`programStat ${tone}`}><span>{icon}</span><div><small>{label}</small><b>{value}</b><p>{detail}</p></div></article>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><b>{value}</b></div>;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("it").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function dateValue(value: string) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extension(name = "") {
  return name.split(".").pop()?.toUpperCase() || "CNC";
}

function statusClass(status: string) {
  if (status === "In produzione") return "production";
  if (status === "Validato") return "validated";
  if (status === "Obsoleto") return "obsolete";
  return "draft";
}

function isTextProgram(name = "", type = "") {
  return /\.(nc|cnc|tap|gcode|txt|mpf|spf)$/i.test(name) || type.startsWith("text/");
}

function numberedCode(code: string) {
  return code.replace(/\r\n/g, "\n").split("\n").slice(0, 2000).map((line, index) => `${String(index + 1).padStart(4, " ")}  ${line}`).join("\n");
}
