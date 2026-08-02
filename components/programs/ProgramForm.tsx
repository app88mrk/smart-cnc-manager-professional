"use client";

import { FormEvent, useState } from "react";
import {
  BadgeCheck,
  Binary,
  Braces,
  CheckCircle2,
  Cpu,
  FileCode2,
  FileUp,
  GitBranch,
  Hash,
  LoaderCircle,
  Save,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";

import {
  analyzeProgramText,
  buildProgramNotes,
  calculateFileChecksum,
  captureCurrentRevision,
  cleanProgramNotes,
  nextProgramVersion,
  normalizeProgramDetails,
} from "@/lib/programs";
import type { Machine, ProgramDetails, RecordItem } from "@/types";

type ProgramFormProps = {
  record: RecordItem;
  machines: Machine[];
  busy: boolean;
  close: () => void;
  submit: (
    record: RecordItem,
    attachment: File | null,
    preservePreviousFile: boolean,
    onUploadProgress: (percent: number) => void
  ) => Promise<void>;
};

export default function ProgramForm({
  record,
  machines,
  busy,
  close,
  submit,
}: ProgramFormProps) {
  const originalDetails = normalizeProgramDetails(record);
  const [title, setTitle] = useState(record.title);
  const [status, setStatus] = useState(record.status || "Bozza");
  const [machineId, setMachineId] = useState(record.machineId);
  const [notes, setNotes] = useState(cleanProgramNotes(record.notes));
  const [details, setDetails] = useState<ProgramDetails>(originalDetails);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  function update<K extends keyof ProgramDetails>(
    key: K,
    value: ProgramDetails[K]
  ) {
    setError("");
    setDetails((current) => ({ ...current, [key]: value }));
  }

  async function selectFile(file: File | null) {
    setError("");
    setUploadProgress(0);
    setAttachment(file);
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("Il programma o archivio supera il limite di 50 MB.");
      setAttachment(null);
      return;
    }

    setAnalyzing(true);
    try {
      const checksum = await calculateFileChecksum(file);
      let analysis = {
        lineCount: 0,
        toolNumbers: [] as string[],
        workOffsets: [] as string[],
        programCode: "",
      };
      if (isTextProgram(file) && file.size <= 10 * 1024 * 1024) {
        analysis = analyzeProgramText(await file.text());
      }
      setDetails((current) => ({
        ...current,
        checksum,
        lineCount: analysis.lineCount,
        toolNumbers: analysis.toolNumbers,
        workOffsets: analysis.workOffsets,
        programCode: current.programCode || analysis.programCode,
        currentVersion: record.filePath
          ? nextProgramVersion(originalDetails.currentVersion)
          : current.currentVersion,
        approved: false,
        approvedBy: "",
        lastValidatedAt: "",
        changeNote: record.filePath ? "Nuova revisione programma" : current.changeNote,
      }));
      if (!title.trim()) {
        setTitle(analysis.programCode || file.name.replace(/\.[^.]+$/, ""));
      }
    } catch {
      setError("Non è stato possibile analizzare il file selezionato.");
      setAttachment(null);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Inserisci il nome del programma CNC.");
      return;
    }
    if (!machineId) {
      setError("Collega il programma alla macchina di destinazione.");
      return;
    }
    if (!record.fileUrl && !attachment) {
      setError("Carica il file del programma CNC.");
      return;
    }
    if (!details.currentVersion.trim()) {
      setError("Inserisci la versione del programma.");
      return;
    }
    if (details.approved && !details.approvedBy.trim()) {
      setError("Indica chi ha approvato il programma.");
      return;
    }

    const machine = machines.find((item) => item.id === machineId);
    const previousRevision = attachment
      ? captureCurrentRevision(record, originalDetails)
      : null;
    const revisions = previousRevision &&
      !details.revisions.some(
        (revision) => revision.filePath === previousRevision.filePath
      )
      ? [previousRevision, ...details.revisions]
      : details.revisions;
    const nextDetails: ProgramDetails = {
      ...details,
      lastValidatedAt:
        details.approved && !details.lastValidatedAt
          ? new Date().toISOString().slice(0, 10)
          : details.lastValidatedAt,
      revisions,
    };

    await submit(
      {
        ...record,
        title: title.trim(),
        subtitle: [
          nextDetails.programCode,
          `V${nextDetails.currentVersion}`,
          nextDetails.partName,
        ]
          .filter(Boolean)
          .join(" · "),
        status,
        machineId,
        machine: machine
          ? `${machine.brand} ${machine.model}`.trim()
          : "",
        notes: buildProgramNotes(notes, nextDetails),
        program: nextDetails,
      },
      attachment,
      Boolean(attachment && record.filePath),
      setUploadProgress
    );
  }

  return (
    <div className="modal programEditorModal">
      <form onSubmit={handleSubmit}>
        <header className="programEditorHead">
          <div>
            <span><FileCode2 size={23} /></span>
            <div><small>PROGRAM CONTROL · VERSIONE E VALIDAZIONE</small><h2>{record.title ? "Modifica programma CNC" : "Nuovo programma CNC"}</h2><p>File, macchina, revisione, checksum e approvazione sotto controllo.</p></div>
          </div>
          <button type="button" onClick={close} disabled={busy}><X /></button>
        </header>

        <div className="programEditorBody">
          <section className="programEditorSection">
            <header><span><Binary size={17} /></span><div><b>Identificazione programma</b><small>Riferimenti univoci al particolare e al disegno.</small></div></header>
            <div className="programEditorGrid">
              <label className="wide"><span>Nome programma *</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Es. Staffa mandrino OP10" /></label>
              <label><span>Codice programma</span><input value={details.programCode} onChange={(event) => update("programCode", event.target.value.toUpperCase())} placeholder="O1042" /></label>
              <label><span>Particolare</span><input value={details.partName} onChange={(event) => update("partName", event.target.value)} placeholder="Nome del pezzo" /></label>
              <label><span>Codice disegno</span><input value={details.drawingCode} onChange={(event) => update("drawingCode", event.target.value)} placeholder="DWG-1042" /></label>
              <label><span>Revisione disegno</span><input value={details.drawingRevision} onChange={(event) => update("drawingRevision", event.target.value)} placeholder="A / 01" /></label>
            </div>
          </section>

          <section className="programEditorSection">
            <header><span><Cpu size={17} /></span><div><b>Destinazione e controllo</b><small>Compatibilità con macchina e controllo numerico.</small></div></header>
            <div className="programEditorGrid">
              <label><span>Macchina *</span><select value={machineId} onChange={(event) => setMachineId(event.target.value)}><option value="">Seleziona macchina</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.brand} {machine.model}</option>)}</select></label>
              <label><span>Controllo CNC</span><input value={details.controller} onChange={(event) => update("controller", event.target.value)} placeholder="Fanuc 31i, Siemens 840D…" /></label>
              <label><span>Stato</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Bozza</option><option>Validato</option><option>In produzione</option><option>Obsoleto</option></select></label>
              <label><span>Versione corrente</span><input value={details.currentVersion} onChange={(event) => update("currentVersion", event.target.value)} placeholder="1.0.0" /></label>
              <label className="wide"><span>Motivo della modifica *</span><input value={details.changeNote} onChange={(event) => update("changeNote", event.target.value)} placeholder="Prima emissione, modifica quota, ottimizzazione ciclo…" /></label>
            </div>
          </section>

          <section className="programEditorSection">
            <header><span><ShieldCheck size={17} /></span><div><b>Validazione e approvazione</b><small>Un programma approvato può essere dichiarato pronto per la produzione.</small></div></header>
            <div className="programValidationGrid">
              <label className="programApproveToggle"><input type="checkbox" checked={details.approved} onChange={(event) => update("approved", event.target.checked)} /><BadgeCheck size={19} /><span><b>Programma approvato</b><small>Conferma che simulazione, utensili e origine sono stati verificati.</small></span></label>
              <label><span>Approvato da</span><input value={details.approvedBy} onChange={(event) => update("approvedBy", event.target.value)} placeholder="Nome responsabile" disabled={!details.approved} /></label>
              <label><span>Data validazione</span><input type="date" value={details.lastValidatedAt} onChange={(event) => update("lastValidatedAt", event.target.value)} disabled={!details.approved} /></label>
            </div>
          </section>

          <section className="programEditorSection">
            <header><span><Braces size={17} /></span><div><b>Analisi automatica file</b><small>Checksum SHA-256, righe, utensili e origini rilevate.</small></div></header>
            <div className="programAnalysisCards">
              <article><Hash size={17} /><small>Checksum</small><b title={details.checksum}>{details.checksum ? `${details.checksum.slice(0, 12)}…` : "Non calcolato"}</b></article>
              <article><Braces size={17} /><small>Righe</small><b>{details.lineCount || "—"}</b></article>
              <article><Wrench size={17} /><small>Utensili</small><b>{details.toolNumbers.length ? details.toolNumbers.join(", ") : "—"}</b></article>
              <article><GitBranch size={17} /><small>Origini</small><b>{details.workOffsets.length ? details.workOffsets.join(", ") : "—"}</b></article>
            </div>
          </section>

          <section className="programEditorSection">
            <header><span><FileCode2 size={17} /></span><div><b>Note tecniche</b><small>Origine, piazzamento, utensili speciali e precauzioni.</small></div></header>
            <label className="programNotesField"><textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          </section>

          <section className={`programUploadPro ${attachment ? "selected" : ""}`}>
            {analyzing ? <LoaderCircle className="spinner" size={28} /> : <FileUp size={28} />}
            <div><b>{attachment?.name || record.fileName || "Seleziona il file CNC"}</b><span>{analyzing ? "Calcolo checksum e analisi del codice…" : attachment ? `${formatBytes(attachment.size)} · nuova versione ${details.currentVersion}` : record.fileName ? "Carica un nuovo file per creare automaticamente una revisione." : "NC, CNC, TAP, GCODE, TXT o archivio ZIP · massimo 50 MB"}</span></div>
            <label>{record.fileName ? "Nuova versione" : "Seleziona file"}<input type="file" accept=".nc,.cnc,.tap,.gcode,.txt,.mpf,.spf,.zip" onChange={(event) => void selectFile(event.target.files?.[0] || null)} /></label>
          </section>

          {uploadProgress > 0 && uploadProgress < 100 && <div className="programUploadProgress"><div><span>Caricamento versione {details.currentVersion}</span><b>{uploadProgress}%</b></div><div><i style={{ width: `${uploadProgress}%` }} /></div></div>}
          {error && <div className="formError">{error}</div>}
        </div>

        <footer className="programEditorActions"><span>{details.revisions.length} versioni precedenti conservate</span><div><button type="button" onClick={close} disabled={busy}>Annulla</button><button type="submit" className="primary" disabled={busy || analyzing}>{busy ? "Salvataggio…" : <><Save size={15} /> Salva programma</>}</button></div></footer>
      </form>
    </div>
  );
}

function isTextProgram(file: File) {
  return /\.(nc|cnc|tap|gcode|txt|mpf|spf)$/i.test(file.name) || file.type.startsWith("text/");
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
