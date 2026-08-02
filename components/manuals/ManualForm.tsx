"use client";

import { FormEvent, useState } from "react";
import {
  BookOpenCheck,
  CalendarClock,
  FileCheck2,
  FileUp,
  HardDriveUpload,
  ShieldCheck,
  Star,
  Tags,
  X,
} from "lucide-react";

import {
  cleanManualNotes,
  manualCategoryLabels,
  normalizeManualDetails,
} from "@/lib/manuals";
import type {
  Machine,
  ManualCategory,
  ManualConfidentiality,
  ManualDetails,
  RecordItem,
} from "@/types";

type ManualFormProps = {
  record: RecordItem;
  machines: Machine[];
  busy: boolean;
  close: () => void;
  submit: (
    record: RecordItem,
    attachment: File | null,
    onUploadProgress: (percent: number) => void
  ) => Promise<void>;
};

export default function ManualForm({
  record,
  machines,
  busy,
  close,
  submit,
}: ManualFormProps) {
  const [title, setTitle] = useState(record.title);
  const [subtitle, setSubtitle] = useState(record.subtitle);
  const [status, setStatus] = useState(record.status || "Disponibile");
  const [machineId, setMachineId] = useState(record.machineId);
  const [description, setDescription] = useState(
    cleanManualNotes(record.notes)
  );
  const [details, setDetails] = useState<ManualDetails>(() =>
    normalizeManualDetails(record)
  );
  const [tagsText, setTagsText] = useState(details.tags.join(", "));
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const top = /^s[iì]$/i.test(
    record.notes.match(/(?:^|\n)Manuale TOP:\s*(.*)$/im)?.[1]?.trim() || ""
  );
  const [isTop, setIsTop] = useState(top);

  function update<K extends keyof ManualDetails>(
    key: K,
    value: ManualDetails[K]
  ) {
    setError("");
    setDetails((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Inserisci il titolo del documento.");
      return;
    }
    if (attachment && attachment.size > 500 * 1024 * 1024) {
      setError("Il documento supera il limite massimo di 500 MB.");
      return;
    }
    if (details.reviewDate && details.issueDate && details.reviewDate < details.issueDate) {
      setError("La prossima revisione non può precedere la data di emissione.");
      return;
    }

    const machine = machines.find((item) => item.id === machineId);
    const protectedNotes = record.notes
      .split("\n")
      .filter((line) => line.startsWith("[") && line.trim())
      .filter((line) => !line.startsWith("[MANUALE_PRO_V1]"));
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag, index, all) => tag && all.indexOf(tag) === index);
    const nextDetails: ManualDetails = {
      ...details,
      tags,
    };
    const notes = [
      "[MANUALE_PRO_V1]",
      ...protectedNotes,
      `Manuale TOP: ${isTop ? "Sì" : "No"}`,
      description.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    await submit(
      {
        ...record,
        title: title.trim(),
        subtitle: subtitle.trim(),
        status,
        machineId,
        machine: machine
          ? `${machine.brand} ${machine.model}`.trim()
          : "",
        notes,
        manual: nextDetails,
      },
      attachment,
      setUploadProgress
    );
  }

  return (
    <div className="modal manualEditorModal">
      <form onSubmit={handleSubmit}>
        <header className="manualEditorHead">
          <div className="manualEditorIdentity">
            <span><BookOpenCheck size={22} /></span>
            <div>
              <small>CENTRO DOCUMENTALE · CONTROLLO REVISIONI</small>
              <h2>{record.title ? "Modifica documento" : "Nuovo documento tecnico"}</h2>
              <p>Metadati, classificazione, revisione e allegato in una sola scheda.</p>
            </div>
          </div>
          <button type="button" onClick={close} disabled={busy} aria-label="Chiudi"><X /></button>
        </header>

        <div className="manualEditorBody">
          <section className="manualEditorSection">
            <div className="manualEditorSectionHead">
              <span><FileCheck2 size={17} /></span>
              <div><b>Identificazione documento</b><small>Dati che rendono il documento rintracciabile.</small></div>
            </div>
            <div className="manualEditorGrid">
              <label className="wide"><span>Titolo documento *</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Es. Manuale operatore DMG MORI CMX 600 V" /></label>
              <label><span>Codice documento</span><input value={details.documentCode} onChange={(event) => update("documentCode", event.target.value)} placeholder="MAN-CMX600-ITA" /></label>
              <label><span>Costruttore / autore</span><input value={details.manufacturer} onChange={(event) => update("manufacturer", event.target.value)} placeholder="DMG MORI, Hoffmann, interno…" /></label>
              <label className="wide"><span>Descrizione sintetica</span><input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="Contenuto, modello coperto o campo di applicazione" /></label>
            </div>
          </section>

          <section className="manualEditorSection">
            <div className="manualEditorSectionHead">
              <span><Tags size={17} /></span>
              <div><b>Classificazione</b><small>Categoria, macchina, lingua e parole chiave.</small></div>
            </div>
            <div className="manualEditorGrid">
              <label><span>Categoria</span><select value={details.category} onChange={(event) => update("category", event.target.value as ManualCategory)}>{Object.entries(manualCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Macchina collegata</span><select value={machineId} onChange={(event) => setMachineId(event.target.value)}><option value="">Documento generale</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.brand} {machine.model}</option>)}</select></label>
              <label><span>Lingua</span><select value={details.language} onChange={(event) => update("language", event.target.value)}><option>Italiano</option><option>Inglese</option><option>Tedesco</option><option>Francese</option><option>Multilingua</option></select></label>
              <label><span>Responsabile documento</span><input value={details.owner} onChange={(event) => update("owner", event.target.value)} placeholder="Nome o reparto" /></label>
              <label className="wide"><span>Tag separati da virgola</span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="mandrino, allarmi, manutenzione, cambio utensile" /></label>
            </div>
          </section>

          <section className="manualEditorSection">
            <div className="manualEditorSectionHead">
              <span><CalendarClock size={17} /></span>
              <div><b>Revisione e validità</b><small>Controlla quando il documento deve essere verificato.</small></div>
            </div>
            <div className="manualEditorGrid manualRevisionGrid">
              <label><span>Revisione</span><input value={details.revision} onChange={(event) => update("revision", event.target.value)} placeholder="01 / A" /></label>
              <label><span>Data emissione</span><input type="date" value={details.issueDate} onChange={(event) => update("issueDate", event.target.value)} /></label>
              <label><span>Prossima revisione</span><input type="date" value={details.reviewDate} onChange={(event) => update("reviewDate", event.target.value)} /></label>
              <label><span>Stato</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Disponibile</option><option>Da aggiornare</option><option>Archiviato</option></select></label>
              <label><span>Riservatezza</span><select value={details.confidentiality} onChange={(event) => update("confidentiality", event.target.value as ManualConfidentiality)}><option>Uso interno</option><option>Riservato</option><option>Pubblico</option></select></label>
              <label className="manualTopToggle"><input type="checkbox" checked={isTop} onChange={(event) => setIsTop(event.target.checked)} /><Star size={17} fill={isTop ? "currentColor" : "none"} /><span><b>Documento TOP</b><small>Accesso immediato dalla parte alta della libreria.</small></span></label>
            </div>
          </section>

          <section className="manualEditorSection">
            <div className="manualEditorSectionHead">
              <span><ShieldCheck size={17} /></span>
              <div><b>Note e contenuto</b><small>Descrizione estesa, riferimenti e indicazioni d’uso.</small></div>
            </div>
            <label className="manualDescriptionField"><textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrivi il contenuto del documento, le sezioni importanti e quando consultarlo…" /></label>
          </section>

          <section className="manualUploadPro">
            <HardDriveUpload size={28} />
            <div>
              <b>{attachment ? attachment.name : record.fileName || "Carica il documento tecnico"}</b>
              <span>{attachment ? formatBytes(attachment.size) : record.fileName ? "Seleziona un nuovo file solo per sostituire quello attuale." : "PDF, Office, immagini, video o archivio ZIP · massimo 500 MB"}</span>
            </div>
            <label><FileUp size={17} /> {record.fileName ? "Sostituisci file" : "Seleziona file"}<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,image/*,video/*" onChange={(event) => { setError(""); setUploadProgress(0); setAttachment(event.target.files?.[0] || null); }} /></label>
          </section>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="manualUploadProgress"><div><span>Caricamento documento</span><b>{uploadProgress}%</b></div><div><i style={{ width: `${uploadProgress}%` }} /></div></div>
          )}
          {error && <div className="formError" role="alert">{error}</div>}
        </div>

        <footer className="manualEditorActions">
          <span>Le versioni precedenti restano compatibili con il nuovo archivio.</span>
          <div><button type="button" onClick={close} disabled={busy}>Annulla</button><button type="submit" className="primary" disabled={busy}>{busy ? "Salvataggio…" : "Salva documento"}</button></div>
        </footer>
      </form>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
