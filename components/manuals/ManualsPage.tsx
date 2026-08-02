"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  FileArchive,
  FileImage,
  FileText,
  Film,
  FolderOpen,
  HardDrive,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import { Machine, RecordItem } from "@/types";

type ManualCategory =
  | "all"
  | "catalog"
  | "machine"
  | "procedure"
  | "drawing"
  | "other";

type Props = {
  records: RecordItem[];
  machines: Machine[];
  loading: boolean;
  openNew: () => void;
  openEdit: (record: RecordItem) => void;
  onDelete: (record: RecordItem) => void;
  onToggleTop: (record: RecordItem) => void | Promise<void>;
};

const categoryLabels: Record<ManualCategory, string> = {
  all: "Tutte le categorie",
  catalog: "Cataloghi utensili",
  machine: "Manuali macchina",
  procedure: "Procedure operative",
  drawing: "Disegni e schemi",
  other: "Altri documenti",
};

export default function ManualsPage({
  records,
  machines,
  loading,
  openNew,
  openEdit,
  onDelete,
  onToggleTop,
}: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ManualCategory>("all");
  const [machineId, setMachineId] = useState("all");
  const [status, setStatus] = useState("all");
  const topRecords = useMemo(
    () =>
      records
        .filter(isTopManual)
        .sort((first, second) => dateValue(second.updatedAt) - dateValue(first.updatedAt)),
    [records]
  );
  const availableStatuses = useMemo(
    () => Array.from(new Set(records.map((record) => record.status).filter(Boolean))),
    [records]
  );
  const filteredRecords = useMemo(() => {
    const normalizedQuery = normalize(query);

    return [...records]
      .filter((record) => {
        if (
          normalizedQuery &&
          !normalize(`${record.title} ${record.subtitle} ${record.notes} ${record.fileName || ""} ${record.machine}`).includes(normalizedQuery)
        ) {
          return false;
        }
        if (category !== "all" && manualCategory(record) !== category) return false;
        if (machineId !== "all" && record.machineId !== machineId) return false;
        if (status !== "all" && record.status !== status) return false;
        return true;
      })
      .sort((first, second) => {
        const topDifference = Number(isTopManual(second)) - Number(isTopManual(first));
        return topDifference || dateValue(second.updatedAt) - dateValue(first.updatedAt);
      });
  }, [category, machineId, query, records, status]);
  const linkedRecords = records.filter((record) => record.machineId).length;
  const totalBytes = records.reduce((total, record) => total + (record.fileSize || 0), 0);

  function resetFilters() {
    setQuery("");
    setCategory("all");
    setMachineId("all");
    setStatus("all");
  }

  return (
    <div className="manualCenter">
      <section className="manualHero">
        <div>
          <span>CENTRO DOCUMENTALE CNC</span>
          <h1>Manuali e documentazione tecnica</h1>
          <p>
            Un archivio professionale per cataloghi, manuali macchina, procedure,
            disegni e documenti di reparto.
          </p>
          <button type="button" className="primary" onClick={openNew}>
            <Plus size={18} />
            Carica documento
          </button>
        </div>
        <div className="manualHeroIcon" aria-hidden="true">
          <BookOpen size={38} />
        </div>
      </section>

      {loading && (
        <div className="inlineLoading" role="status">
          <LoaderCircle className="spinner" size={18} />
          Aggiornamento archivio documentale…
        </div>
      )}

      <section className="manualStats" aria-label="Riepilogo manuali">
        <ManualStat icon={<FolderOpen size={20} />} label="Documenti" value={records.length} tone="blue" />
        <ManualStat icon={<Star size={20} />} label="Sezione TOP" value={topRecords.length} tone="gold" />
        <ManualStat icon={<BookOpen size={20} />} label="Collegati a macchine" value={linkedRecords} tone="green" />
        <ManualStat icon={<HardDrive size={20} />} label="Spazio documenti" value={formatBytes(totalBytes)} tone="slate" />
      </section>

      <section className="manualTopSection">
        <div className="manualSectionHead">
          <div>
            <span>ACCESSO IMMEDIATO</span>
            <h2><Star size={18} fill="currentColor" /> Documenti TOP</h2>
            <p>Fissa qui i documenti che consulti più spesso in officina.</p>
          </div>
          <b>{topRecords.length}</b>
        </div>

        {topRecords.length ? (
          <div className="manualTopGrid">
            {topRecords.slice(0, 6).map((record) => (
              <article key={record.id} className="manualTopCard">
                <span className="manualFileIcon top">{fileIcon(record)}</span>
                <div>
                  <small>{categoryLabels[manualCategory(record)]}</small>
                  <b>{record.title}</b>
                  <span>{record.subtitle || machineName(record, machines) || "Documento tecnico"}</span>
                </div>
                {record.fileUrl ? (
                  <a href={record.fileUrl} target="_blank" rel="noreferrer" aria-label={`Apri ${record.title}`}>
                    <FolderOpen size={17} />
                  </a>
                ) : (
                  <button type="button" onClick={() => openEdit(record)} aria-label={`Modifica ${record.title}`}>
                    <Pencil size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="manualUnpin"
                  onClick={() => onToggleTop(record)}
                  title="Rimuovi dalla sezione TOP"
                  aria-label={`Rimuovi ${record.title} dalla sezione TOP`}
                >
                  <Star size={14} fill="currentColor" />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="manualTopEmpty">
            <Star size={24} />
            <div>
              <b>La sezione TOP è pronta</b>
              <span>Premi la stella su un documento per fissarlo qui.</span>
            </div>
          </div>
        )}
      </section>

      <section className="manualLibrary">
        <div className="manualSectionHead library">
          <div>
            <span>ARCHIVIO COMPLETO</span>
            <h2>Libreria documentale</h2>
            <p>{filteredRecords.length} documenti visualizzati su {records.length}</p>
          </div>
          <button type="button" onClick={resetFilters}>Azzera filtri</button>
        </div>

        <div className="manualFilters">
          <label className="manualSearch">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca titolo, file, macchina o parola nelle note…"
            />
          </label>
          <label>
            <span>Categoria</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as ManualCategory)}>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Macchina</span>
            <select value={machineId} onChange={(event) => setMachineId(event.target.value)}>
              <option value="all">Tutte le macchine</option>
              <option value="">Documenti generali</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>{machine.brand} {machine.model}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Stato revisione</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tutti gli stati</option>
              {availableStatuses.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        </div>

        {filteredRecords.length ? (
          <div className="professionalManualGrid">
            {filteredRecords.map((record) => (
              <article key={record.id} className={`professionalManualCard ${isTopManual(record) ? "top" : ""}`}>
                <div className="manualCardVisual">
                  <span>{fileIcon(record)}</span>
                  <small>{fileExtension(record)}</small>
                  {isTopManual(record) && <b><Star size={12} fill="currentColor" /> TOP</b>}
                </div>

                <div className="manualCardBody">
                  <div className="manualCardToolbar">
                    <span>{categoryLabels[manualCategory(record)]}</span>
                    <div>
                      <button
                        type="button"
                        className={isTopManual(record) ? "active" : ""}
                        onClick={() => onToggleTop(record)}
                        title={isTopManual(record) ? "Rimuovi da TOP" : "Aggiungi a TOP"}
                        aria-label={isTopManual(record) ? `Rimuovi ${record.title} da TOP` : `Aggiungi ${record.title} a TOP`}
                      >
                        <Star size={15} fill={isTopManual(record) ? "currentColor" : "none"} />
                      </button>
                      <button type="button" onClick={() => openEdit(record)} title="Modifica"><Pencil size={15} /></button>
                      <button type="button" className="delete" onClick={() => onDelete(record)} title="Elimina"><Trash2 size={15} /></button>
                    </div>
                  </div>

                  <span className={`manualRevision ${statusClass(record.status)}`}>{record.status}</span>
                  <h3>{record.title}</h3>
                  <p>{record.subtitle || "Descrizione non inserita"}</p>
                  {record.notes && <small className="manualNotes">{cleanNotes(record.notes)}</small>}

                  <div className="manualCardMeta">
                    <span>{machineName(record, machines) || "Documento generale"}</span>
                    <span>Aggiornato {formatDate(record.updatedAt)}</span>
                  </div>

                  {record.fileUrl ? (
                    <a className="manualOpenFile" href={record.fileUrl} target="_blank" rel="noreferrer">
                      <FolderOpen size={16} />
                      <span>Apri documento</span>
                      <small>{record.fileSize ? formatBytes(record.fileSize) : fileExtension(record)}</small>
                    </a>
                  ) : (
                    <button type="button" className="manualOpenFile missing" onClick={() => openEdit(record)}>
                      <Plus size={16} />
                      <span>Aggiungi allegato</span>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="manualLibraryEmpty">
            <Search size={27} />
            <b>Nessun documento corrisponde ai filtri</b>
            <span>Modifica la ricerca oppure azzera i filtri.</span>
          </div>
        )}
      </section>
    </div>
  );
}

function ManualStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "blue" | "gold" | "green" | "slate";
}) {
  return (
    <div className={`manualStat ${tone}`}>
      <span>{icon}</span>
      <div><small>{label}</small><b>{value}</b></div>
    </div>
  );
}

function isTopManual(record: RecordItem) {
  return /^s[iì]$/i.test(noteValue(record.notes, "Manuale TOP"));
}

function manualCategory(record: RecordItem): Exclude<ManualCategory, "all"> {
  const source = normalize(`${record.title} ${record.subtitle} ${record.notes} ${record.fileName || ""}`);
  if (record.notes.includes("[CATALOGO_PARAMETRI]") || /catalog|utensil|insert|fres|punte/.test(source)) return "catalog";
  if (record.machineId || /manuale macchina|istruzioni macchina|cnc/.test(source)) return "machine";
  if (/procedur|checklist|istruzion|setup|attrezzaggio/.test(source)) return "procedure";
  if (/disegn|schema|drawing|dwg|dxf/.test(source)) return "drawing";
  return "other";
}

function fileIcon(record: RecordItem) {
  const type = (record.fileType || "").toLowerCase();
  const extension = fileExtension(record).toLowerCase();
  if (type.startsWith("image/") || /jpg|jpeg|png|webp|gif/.test(extension)) return <FileImage size={24} />;
  if (type.startsWith("video/") || /mp4|mov|avi|webm/.test(extension)) return <Film size={24} />;
  if (/zip|rar|7z/.test(extension)) return <FileArchive size={24} />;
  return <FileText size={24} />;
}

function fileExtension(record: RecordItem) {
  const extension = (record.fileName || "").split(".").pop();
  return extension && extension !== record.fileName ? extension.toUpperCase() : "DOC";
}

function machineName(record: RecordItem, machines: Machine[]) {
  const machine = machines.find((item) => item.id === record.machineId);
  return machine ? `${machine.brand} ${machine.model}`.trim() : record.machine;
}

function cleanNotes(notes: string) {
  return notes
    .split("\n")
    .filter((line) => !line.startsWith("[") && !line.startsWith("Manuale TOP:"))
    .join(" · ") || "Nessuna nota aggiuntiva";
}

function noteValue(notes: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return notes.match(new RegExp(`(?:^|\\n)${escaped}:\\s*(.*)$`, "im"))?.[1]?.trim() || "";
}

function statusClass(value: string) {
  if (/disponibile|valid|aggiornat/i.test(value)) return "available";
  if (/aggiornare|revision|bozza/i.test(value)) return "review";
  return "archived";
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function dateValue(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 MB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
