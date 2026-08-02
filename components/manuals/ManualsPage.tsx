"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileImage,
  FileQuestion,
  FileText,
  Film,
  Filter,
  FolderOpen,
  Gauge,
  Grid2X2,
  HardDrive,
  Languages,
  LayoutList,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Tags,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import {
  cleanManualNotes,
  fileExtension,
  inferManualCategory,
  isManualReviewOverdue,
  isTopManual,
  manualCategoryLabels,
  manualCompleteness,
  manualReviewState,
  normalizeManualDetails,
} from "@/lib/manuals";
import type { Machine, ManualCategory, RecordItem } from "@/types";

type SmartCollection =
  | "all"
  | "top"
  | "review"
  | "missing"
  | "recent";

type Props = {
  records: RecordItem[];
  machines: Machine[];
  loading: boolean;
  openNew: () => void;
  openEdit: (record: RecordItem) => void;
  onDelete: (record: RecordItem) => void;
  onToggleTop: (record: RecordItem) => void | Promise<void>;
  onDocumentOpen: (record: RecordItem) => void | Promise<void>;
};

export default function ManualsPage({
  records,
  machines,
  loading,
  openNew,
  openEdit,
  onDelete,
  onToggleTop,
  onDocumentOpen,
}: Props) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<SmartCollection>("all");
  const [category, setCategory] = useState<"all" | ManualCategory>("all");
  const [machineId, setMachineId] = useState("all");
  const [status, setStatus] = useState("all");
  const [format, setFormat] = useState("all");
  const [sort, setSort] = useState("updated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [preview, setPreview] = useState<RecordItem | null>(null);

  const topRecords = useMemo(
    () => records.filter(isTopManual).sort(byUpdated).slice(0, 8),
    [records]
  );
  const overdueRecords = records.filter(isManualReviewOverdue);
  const missingFiles = records.filter((record) => !record.fileUrl);
  const incomplete = records.filter(
    (record) => manualCompleteness(record) < 70
  );
  const totalBytes = records.reduce(
    (total, record) => total + (record.fileSize || 0),
    0
  );
  const availableStatuses = Array.from(
    new Set(records.map((record) => record.status).filter(Boolean))
  );
  const availableFormats = Array.from(
    new Set(records.map(fileExtension).filter((value) => value !== "DOC"))
  ).sort();
  const categoryCounts = useMemo(() => {
    const counts = {} as Record<ManualCategory, number>;
    Object.keys(manualCategoryLabels).forEach(
      (key) => (counts[key as ManualCategory] = 0)
    );
    records.forEach((record) => counts[inferManualCategory(record)]++);
    return counts;
  }, [records]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = normalize(query);
    const result = records.filter((record) => {
      const details = normalizeManualDetails(record);
      const searchSource = normalize(
        [
          record.title,
          record.subtitle,
          cleanManualNotes(record.notes),
          record.fileName,
          record.machine,
          details.documentCode,
          details.manufacturer,
          details.owner,
          details.language,
          details.tags.join(" "),
        ].join(" ")
      );
      if (normalizedQuery && !searchSource.includes(normalizedQuery)) return false;
      if (category !== "all" && inferManualCategory(record) !== category) return false;
      if (machineId !== "all" && record.machineId !== machineId) return false;
      if (status !== "all" && record.status !== status) return false;
      if (format !== "all" && fileExtension(record) !== format) return false;
      if (collection === "top" && !isTopManual(record)) return false;
      if (collection === "review" && manualReviewState(record) !== "overdue" && manualReviewState(record) !== "dueSoon") return false;
      if (collection === "missing" && record.fileUrl && manualCompleteness(record) >= 70) return false;
      if (collection === "recent") {
        const lastOpened = details.lastOpenedAt
          ? new Date(details.lastOpenedAt).getTime()
          : 0;
        if (!lastOpened || Date.now() - lastOpened > 30 * 86400000) return false;
      }
      return true;
    });

    return [...result].sort((first, second) => {
      if (sort === "title") return first.title.localeCompare(second.title, "it");
      if (sort === "opened") {
        return normalizeManualDetails(second).openCount - normalizeManualDetails(first).openCount;
      }
      if (sort === "review") {
        return dateValue(normalizeManualDetails(first).reviewDate) - dateValue(normalizeManualDetails(second).reviewDate);
      }
      return dateValue(second.updatedAt) - dateValue(first.updatedAt);
    });
  }, [category, collection, format, machineId, query, records, sort, status]);

  function resetFilters() {
    setQuery("");
    setCollection("all");
    setCategory("all");
    setMachineId("all");
    setStatus("all");
    setFormat("all");
    setSort("updated");
  }

  function openFile(record: RecordItem) {
    if (!record.fileUrl) {
      openEdit(record);
      return;
    }
    window.open(record.fileUrl, "_blank", "noopener,noreferrer");
    void onDocumentOpen(record);
  }

  return (
    <div className="manualProCenter">
      <section className="manualProHero">
        <div>
          <span>DOCUMENT CONTROL · SMART CNC MANAGER</span>
          <h1>Centro documentale tecnico</h1>
          <p>
            Un’unica fonte controllata per manuali macchina, cataloghi,
            procedure, schemi, qualità, manutenzione e sicurezza.
          </p>
          <div>
            <button type="button" className="primary" onClick={openNew}>
              <Plus size={18} /> Carica documento
            </button>
            <button type="button" onClick={() => setCollection("review")}>
              <CalendarClock size={17} /> Controlla revisioni
            </button>
          </div>
        </div>
        <div className="manualProHeroVisual" aria-hidden="true">
          <div><BookOpenCheck size={39} /><span>ISO</span></div>
          <b>{records.length}</b>
          <small>documenti controllati</small>
        </div>
      </section>

      {loading && (
        <div className="inlineLoading" role="status">
          <LoaderCircle className="spinner" size={18} />
          Sincronizzazione centro documentale…
        </div>
      )}

      <section className="manualProStats" aria-label="Indicatori documentali">
        <ManualStat icon={<FolderOpen />} label="Documenti" value={records.length} detail={`${topRecords.length} TOP`} tone="blue" />
        <ManualStat icon={<ShieldCheck />} label="Revisioni valide" value={records.length - overdueRecords.length} detail={overdueRecords.length ? `${overdueRecords.length} scadute` : "Tutto sotto controllo"} tone={overdueRecords.length ? "warning" : "green"} />
        <ManualStat icon={<FileQuestion />} label="Da completare" value={new Set([...missingFiles, ...incomplete].map((item) => item.id)).size} detail={`${missingFiles.length} senza allegato`} tone="orange" />
        <ManualStat icon={<HardDrive />} label="Archivio" value={formatBytes(totalBytes)} detail={`${linkedCount(records)} collegati a macchine`} tone="slate" />
      </section>

      {(overdueRecords.length > 0 || missingFiles.length > 0) && (
        <section className="manualComplianceAlert">
          <span><AlertTriangle size={20} /></span>
          <div>
            <b>Controllo documentale richiesto</b>
            <p>{overdueRecords.length} revisioni scadute · {missingFiles.length} schede senza allegato · {incomplete.length} metadati incompleti</p>
          </div>
          <button type="button" onClick={() => setCollection("review")}>Apri centro revisioni <ChevronRight size={16} /></button>
        </section>
      )}

      <section className="manualProTop">
        <header>
          <div><span><Star size={16} fill="currentColor" /></span><div><small>ACCESSO RAPIDO</small><h2>Documenti TOP</h2></div></div>
          <button type="button" onClick={() => setCollection("top")}>Vedi tutti <ChevronRight size={15} /></button>
        </header>
        {topRecords.length ? (
          <div className="manualProTopRail">
            {topRecords.map((record) => {
              const details = normalizeManualDetails(record);
              return (
                <article key={record.id} onClick={() => setPreview(record)}>
                  <span>{fileIcon(record)}</span>
                  <div><small>{manualCategoryLabels[inferManualCategory(record)]}</small><b>{record.title}</b><p>{details.documentCode || machineName(record, machines) || "Documento generale"}</p></div>
                  <em>REV {details.revision || "—"}</em>
                  <button type="button" onClick={(event) => { event.stopPropagation(); void onToggleTop(record); }} title="Rimuovi da TOP"><Star size={14} fill="currentColor" /></button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="manualProTopEmpty"><Star size={22} /><div><b>Nessun documento TOP</b><span>Usa la stella sui documenti più importanti.</span></div></div>
        )}
      </section>

      <section className="manualProWorkspace">
        <aside className="manualCollections">
          <header><span><Archive size={17} /></span><div><small>NAVIGAZIONE</small><b>Collezioni</b></div></header>
          <div className="manualSmartCollections">
            <CollectionButton active={collection === "all"} icon={<FolderOpen />} label="Tutti i documenti" value={records.length} onClick={() => setCollection("all")} />
            <CollectionButton active={collection === "top"} icon={<Star />} label="Documenti TOP" value={topRecords.length} onClick={() => setCollection("top")} />
            <CollectionButton active={collection === "review"} icon={<CalendarClock />} label="Da revisionare" value={records.filter((record) => ["overdue", "dueSoon"].includes(manualReviewState(record))).length} onClick={() => setCollection("review")} warning />
            <CollectionButton active={collection === "missing"} icon={<FileQuestion />} label="Da completare" value={new Set([...missingFiles, ...incomplete].map((item) => item.id)).size} onClick={() => setCollection("missing")} />
            <CollectionButton active={collection === "recent"} icon={<Clock3 />} label="Aperti di recente" value={records.filter((record) => normalizeManualDetails(record).lastOpenedAt).length} onClick={() => setCollection("recent")} />
          </div>
          <h3>Categorie</h3>
          <div className="manualCategoryNav">
            {(Object.entries(manualCategoryLabels) as [ManualCategory, string][]).map(([value, label]) => (
              <button type="button" key={value} className={category === value ? "active" : ""} onClick={() => setCategory(category === value ? "all" : value)}>
                <span>{categoryIcon(value)}</span><b>{label}</b><em>{categoryCounts[value]}</em>
              </button>
            ))}
          </div>
        </aside>

        <div className="manualProLibrary">
          <header className="manualLibraryTitle">
            <div><small>LIBRERIA TECNICA</small><h2>{collectionTitle(collection)}</h2><p>{filteredRecords.length} documenti visualizzati su {records.length}</p></div>
            <div className="manualViewSwitch"><button type="button" className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} title="Vista griglia"><Grid2X2 size={16} /></button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="Vista elenco"><LayoutList size={16} /></button></div>
          </header>

          <div className="manualProFilters">
            <label className="manualProSearch"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca titolo, codice, costruttore, macchina, tag o contenuto…" />{query && <button type="button" onClick={() => setQuery("")}><X size={14} /></button>}</label>
            <button type="button" className="manualFilterToggle"><Filter size={15} /> Filtri</button>
            <label><span>Macchina</span><select value={machineId} onChange={(event) => setMachineId(event.target.value)}><option value="all">Tutte</option><option value="">Generali</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.brand} {machine.model}</option>)}</select></label>
            <label><span>Stato</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tutti</option>{availableStatuses.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Formato</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option value="all">Tutti</option>{availableFormats.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Ordina</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Aggiornamento</option><option value="title">Titolo A–Z</option><option value="review">Data revisione</option><option value="opened">Più consultati</option></select></label>
            <button type="button" className="manualResetFilters" onClick={resetFilters}>Azzera</button>
          </div>

          {filteredRecords.length ? (
            <div className={`manualProDocuments ${view}`}>
              {filteredRecords.map((record) => (
                <ManualDocumentCard
                  key={record.id}
                  record={record}
                  machines={machines}
                  preview={() => setPreview(record)}
                  open={() => openFile(record)}
                  edit={() => openEdit(record)}
                  remove={() => onDelete(record)}
                  toggleTop={() => onToggleTop(record)}
                />
              ))}
            </div>
          ) : (
            <div className="manualProEmpty"><Search size={30} /><b>Nessun documento trovato</b><span>Modifica i filtri oppure crea una nuova scheda documentale.</span><button type="button" className="primary" onClick={openNew}><Plus size={16} /> Carica documento</button></div>
          )}
        </div>
      </section>

      {preview && (
        <ManualPreview
          record={preview}
          machines={machines}
          close={() => setPreview(null)}
          open={() => openFile(preview)}
          edit={() => { setPreview(null); openEdit(preview); }}
          remove={() => { setPreview(null); onDelete(preview); }}
        />
      )}
    </div>
  );
}

function ManualDocumentCard({
  record,
  machines,
  preview,
  open,
  edit,
  remove,
  toggleTop,
}: {
  record: RecordItem;
  machines: Machine[];
  preview: () => void;
  open: () => void;
  edit: () => void;
  remove: () => void;
  toggleTop: () => void | Promise<void>;
}) {
  const details = normalizeManualDetails(record);
  const completeness = manualCompleteness(record);
  const review = manualReviewState(record);
  return (
    <article className={`manualProCard review-${review} ${isTopManual(record) ? "top" : ""}`}>
      <div className="manualProCardVisual" onClick={preview}>
        <span>{fileIcon(record)}</span>
        <b>{fileExtension(record)}</b>
        {isTopManual(record) && <em><Star size={11} fill="currentColor" /> TOP</em>}
        <button type="button" aria-label={`Anteprima ${record.title}`}><Eye size={18} /></button>
      </div>
      <div className="manualProCardBody">
        <div className="manualProCardHead">
          <span>{manualCategoryLabels[inferManualCategory(record)]}</span>
          <div><button type="button" className={isTopManual(record) ? "active" : ""} onClick={() => void toggleTop()} title="Documento TOP"><Star size={14} fill={isTopManual(record) ? "currentColor" : "none"} /></button><button type="button" onClick={edit} title="Modifica"><Pencil size={14} /></button><button type="button" onClick={remove} className="delete" title="Elimina"><Trash2 size={14} /></button></div>
        </div>
        <span className={`manualReviewBadge ${review}`}>{reviewLabel(record, review)}</span>
        <h3 onClick={preview}>{record.title}</h3>
        <p>{record.subtitle || "Descrizione da completare"}</p>
        <div className="manualProMeta"><span><FileText size={13} /> {details.documentCode || "Codice non assegnato"}</span><span><Gauge size={13} /> Rev. {details.revision || "—"}</span><span><Wrench size={13} /> {machineName(record, machines) || "Documento generale"}</span><span><Languages size={13} /> {details.language}</span></div>
        {details.tags.length > 0 && <div className="manualTagList">{details.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}{details.tags.length > 3 && <em>+{details.tags.length - 3}</em>}</div>}
        <div className="manualCompleteness"><div><span>Completezza metadati</span><b>{completeness}%</b></div><div><i style={{ width: `${completeness}%` }} /></div></div>
        <footer><button type="button" onClick={preview}><Eye size={14} /> Anteprima</button><button type="button" className={record.fileUrl ? "primary" : "missing"} onClick={open}>{record.fileUrl ? <ExternalLink size={14} /> : <Plus size={14} />}{record.fileUrl ? "Apri documento" : "Aggiungi file"}</button></footer>
      </div>
    </article>
  );
}

function ManualPreview({
  record,
  machines,
  close,
  open,
  edit,
  remove,
}: {
  record: RecordItem;
  machines: Machine[];
  close: () => void;
  open: () => void;
  edit: () => void;
  remove: () => void;
}) {
  const details = normalizeManualDetails(record);
  const review = manualReviewState(record);
  const notes = cleanManualNotes(record.notes);
  return (
    <div className="manualPreviewOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <aside className="manualPreviewPanel">
        <header><div><small>ANTEPRIMA DOCUMENTO</small><h2>{record.title}</h2><p>{details.documentCode || "Codice non assegnato"} · Rev. {details.revision || "—"}</p></div><button type="button" onClick={close}><X size={20} /></button></header>
        <div className="manualPreviewContent">
          <div className="manualPreviewFile">{previewContent(record)}</div>
          <section className="manualPreviewInfo">
            <div className="manualPreviewStatus"><span className={`manualReviewBadge ${review}`}>{reviewLabel(record, review)}</span><b>{record.status}</b></div>
            <dl>
              <MetaRow label="Categoria" value={manualCategoryLabels[inferManualCategory(record)]} />
              <MetaRow label="Costruttore" value={details.manufacturer || "—"} />
              <MetaRow label="Macchina" value={machineName(record, machines) || "Documento generale"} />
              <MetaRow label="Emissione" value={formatDate(details.issueDate)} />
              <MetaRow label="Prossima revisione" value={formatDate(details.reviewDate)} />
              <MetaRow label="Responsabile" value={details.owner || "—"} />
              <MetaRow label="Lingua" value={details.language} />
              <MetaRow label="Riservatezza" value={details.confidentiality} />
              <MetaRow label="Consultazioni" value={String(details.openCount)} />
              <MetaRow label="Dimensione" value={record.fileSize ? formatBytes(record.fileSize) : "—"} />
            </dl>
            {details.tags.length > 0 && <div className="manualPreviewTags"><span><Tags size={14} /> Tag</span><div>{details.tags.map((tag) => <b key={tag}>#{tag}</b>)}</div></div>}
            <div className="manualPreviewNotes"><span>Descrizione e riferimenti</span><p>{notes || "Nessuna descrizione aggiuntiva."}</p></div>
          </section>
        </div>
        <footer><button type="button" className="delete" onClick={remove}><Trash2 size={15} /> Elimina</button><button type="button" onClick={edit}><Pencil size={15} /> Modifica metadati</button><button type="button" className="primary" onClick={open}>{record.fileUrl ? <Download size={15} /> : <Plus size={15} />}{record.fileUrl ? "Apri documento" : "Aggiungi allegato"}</button></footer>
      </aside>
    </div>
  );
}

function previewContent(record: RecordItem) {
  if (!record.fileUrl) return <div className="manualPreviewPlaceholder"><FileQuestion size={38} /><b>Allegato non presente</b><span>Modifica la scheda per caricare il documento.</span></div>;
  const type = (record.fileType || "").toLowerCase();
  const extension = fileExtension(record).toLowerCase();
  if (type.startsWith("image/") || /jpg|jpeg|png|webp|gif/.test(extension)) return <img src={record.fileUrl} alt={record.title} />;
  if (type.startsWith("video/") || /mp4|mov|webm/.test(extension)) return <video src={record.fileUrl} controls />;
  if (type === "application/pdf" || extension === "pdf") return <iframe src={record.fileUrl} title={`Anteprima ${record.title}`} />;
  return <div className="manualPreviewPlaceholder"><span>{fileIcon(record)}</span><b>{record.fileName || record.title}</b><small>{fileExtension(record)} · usa “Apri documento” per consultarlo</small></div>;
}

function ManualStat({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string | number; detail: string; tone: string }) {
  return <article className={tone}><span>{icon}</span><div><small>{label}</small><b>{value}</b><em>{detail}</em></div></article>;
}

function CollectionButton({ active, icon, label, value, onClick, warning = false }: { active: boolean; icon: React.ReactNode; label: string; value: number; onClick: () => void; warning?: boolean }) {
  return <button type="button" className={`${active ? "active" : ""} ${warning && value ? "warning" : ""}`} onClick={onClick}><span>{icon}</span><b>{label}</b><em>{value}</em></button>;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function fileIcon(record: RecordItem) {
  const type = (record.fileType || "").toLowerCase();
  const extension = fileExtension(record).toLowerCase();
  if (type.startsWith("image/") || /jpg|jpeg|png|webp|gif/.test(extension)) return <FileImage size={24} />;
  if (type.startsWith("video/") || /mp4|mov|avi|webm/.test(extension)) return <Film size={24} />;
  if (/zip|rar|7z/.test(extension)) return <FileArchive size={24} />;
  return <FileText size={24} />;
}

function categoryIcon(category: ManualCategory) {
  if (category === "catalog") return <BookOpen size={14} />;
  if (category === "machine") return <Wrench size={14} />;
  if (category === "procedure") return <LayoutList size={14} />;
  if (category === "drawing") return <FileImage size={14} />;
  if (category === "maintenance") return <Gauge size={14} />;
  if (category === "quality") return <CheckCircle2 size={14} />;
  if (category === "safety") return <ShieldCheck size={14} />;
  return <FileText size={14} />;
}

function collectionTitle(collection: SmartCollection) {
  if (collection === "top") return "Documenti TOP";
  if (collection === "review") return "Centro revisioni";
  if (collection === "missing") return "Documenti da completare";
  if (collection === "recent") return "Consultati di recente";
  return "Archivio completo";
}

function reviewLabel(record: RecordItem, state: string) {
  if (state === "overdue") return "Revisione scaduta";
  if (state === "dueSoon") return `Scade ${formatDate(normalizeManualDetails(record).reviewDate)}`;
  if (state === "valid") return `Valido fino al ${formatDate(normalizeManualDetails(record).reviewDate)}`;
  if (state === "archived") return "Archiviato";
  return "Revisione non pianificata";
}

function machineName(record: RecordItem, machines: Machine[]) {
  const machine = machines.find((item) => item.id === record.machineId);
  return machine ? `${machine.brand} ${machine.model}`.trim() : record.machine;
}

function linkedCount(records: RecordItem[]) {
  return records.filter((record) => record.machineId).length;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function dateValue(value: string) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function byUpdated(first: RecordItem, second: RecordItem) {
  return dateValue(second.updatedAt) - dateValue(first.updatedAt);
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 MB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
