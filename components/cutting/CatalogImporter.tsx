"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileSearch,
  FileUp,
  Trash2,
} from "lucide-react";

import {
  analyzeCatalogFile,
  candidateToCalculationRecord,
  CatalogCandidate,
  CatalogProgress,
  validateCatalogCandidates,
} from "@/lib/catalogImport";
import { RecordItem } from "@/types";

type Props = {
  existingCalculations: RecordItem[];
  catalogs: RecordItem[];
  busy: boolean;
  saveCatalog: (
    record: RecordItem,
    file: File,
    onUploadProgress: (percent: number) => void
  ) => Promise<void>;
  saveImportedParameters: (
    records: RecordItem[],
    onProgress?: (percent: number) => void
  ) => Promise<void>;
  deleteCatalog: (record: RecordItem) => Promise<void>;
  notifySuccess: (message: string) => void;
  selectCatalog: (catalogId: string) => void;
};

const maximumUploadSize = 500 * 1024 * 1024;

export default function CatalogImporter({
  existingCalculations,
  catalogs,
  busy,
  saveCatalog,
  saveImportedParameters,
  deleteCatalog,
  notifySuccess,
  selectCatalog,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CatalogCandidate[]>([]);
  const [progress, setProgress] = useState<CatalogProgress | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [importPercent, setImportPercent] = useState(0);
  const [importPhase, setImportPhase] = useState<
    "idle" | "tools" | "catalog"
  >("idle");
  const [deletingCatalogId, setDeletingCatalogId] = useState("");
  const [error, setError] = useState("");

  const selectedCount = useMemo(
    () => rows.filter((row) => row.selected && row.valid && !row.duplicate).length,
    [rows]
  );
  const duplicateCount = useMemo(
    () => rows.filter((row) => row.duplicate).length,
    [rows]
  );
  const warningCount = useMemo(
    () => rows.filter((row) => row.warnings.length > 0).length,
    [rows]
  );
  const working = busy || analyzing || importing;

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) return;

    setError("");
    setRows([]);
    setProgress(null);
    setFile(selectedFile);

    if (!selectedFile.size) {
      setError("Il catalogo selezionato è vuoto.");
      return;
    }

    if (selectedFile.size > maximumUploadSize) {
      setError("Il catalogo non può superare 500 MB.");
      return;
    }

    setAnalyzing(true);

    try {
      const candidates = await analyzeCatalogFile(
        selectedFile,
        setProgress
      );
      const validated = validateCatalogCandidates(
        candidates,
        existingCalculations
      );
      setRows(validated);

      if (!validated.length) {
        setError(
          "Il catalogo è leggibile, ma non sono stati riconosciuti parametri di taglio. Puoi archiviarlo oppure convertirlo in CSV/XLSX."
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossibile analizzare il catalogo."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleRow(id: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id && row.valid && !row.duplicate
          ? { ...row, selected: !row.selected }
          : row
      )
    );
  }

  function selectAll(selected: boolean) {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        selected: row.valid && !row.duplicate ? selected : false,
      }))
    );
  }

  async function archiveCatalog(
    catalogId = createId("catalog")
  ) {
    if (!file) return null;

    const now = new Date().toISOString();

    setUploadPercent(0);
    await saveCatalog(
      {
        id: catalogId,
        module: "manuals",
        title: file.name.replace(/\.[^.]+$/, ""),
        subtitle: `Catalogo parametri · ${rows.length} righe riconosciute`,
        status: "Disponibile",
        machineId: "",
        machine: "",
        notes: [
          "[CATALOGO_PARAMETRI]",
          `File originale: ${file.name}`,
          `Parametri riconosciuti: ${rows.length}`,
          `Duplicati rilevati: ${duplicateCount}`,
          `Valori da verificare: ${warningCount}`,
        ].join("\n"),
        createdAt: now,
        updatedAt: now,
      },
      file,
      setUploadPercent
    );
    selectCatalog(catalogId);
    return catalogId;
  }

  async function importSelected() {
    if (!file || !selectedCount) return;

    setImporting(true);
    setImportPhase("tools");
    setImportPercent(0);
    setError("");
    let importedCount = 0;

    try {
      const catalogId = createId("catalog");
      const records = rows
        .filter((row) => row.selected && row.valid && !row.duplicate)
        .map((row) =>
          candidateToCalculationRecord(row, file.name, catalogId)
        );

      await saveImportedParameters(records, setImportPercent);
      importedCount = records.length;
      setImportPhase("catalog");
      await archiveCatalog(catalogId);
      notifySuccess(
        `Catalogo archiviato e ${records.length} parametri aggiunti allo storico.`
      );
      clearPreview();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Si è verificato un errore durante l'importazione.";
      setError(
        importedCount
          ? `${importedCount} parametri sono stati aggiunti allo storico. Il file del catalogo non è stato archiviato: ${message}`
          : `Importazione non riuscita: ${message}`
      );
    } finally {
      setImporting(false);
      setImportPhase("idle");
    }
  }

  async function archiveOnly() {
    if (!file) return;

    setImporting(true);
    setImportPhase("catalog");
    setError("");

    try {
      await archiveCatalog();
      notifySuccess(`Catalogo “${file.name}” archiviato correttamente.`);
      clearPreview();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossibile archiviare il catalogo."
      );
    } finally {
      setImporting(false);
      setImportPhase("idle");
    }
  }

  function clearPreview() {
    setFile(null);
    setRows([]);
    setProgress(null);
    setUploadPercent(0);
    setImportPercent(0);
    setImportPhase("idle");
    setError("");
  }

  async function removeCatalog(catalog: RecordItem) {
    const confirmed = window.confirm(
      `Eliminare definitivamente il catalogo “${catalog.title}” e il relativo file? I parametri già presenti nello storico resteranno disponibili.`
    );

    if (!confirmed) return;

    setDeletingCatalogId(catalog.id);
    setError("");

    try {
      await deleteCatalog(catalog);
      selectCatalog("");
      notifySuccess(`Catalogo “${catalog.title}” eliminato correttamente.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossibile eliminare il catalogo."
      );
    } finally {
      setDeletingCatalogId("");
    }
  }

  return (
    <section className="cuttingCatalogPanel catalogImporter">
      <div className="cuttingCatalogHead">
        <div>
          <BookOpen size={19} />
          <div>
            <b>Importazione automatica cataloghi</b>
            <small>
              Analisi, anteprima, controllo duplicati e conferma finale
            </small>
          </div>
        </div>

        <label className={`cuttingCatalogUpload ${working ? "disabled" : ""}`}>
          <FileUp size={17} />
          {analyzing ? "Analisi…" : "Seleziona catalogo"}
          <input
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.json,.tsv,.txt"
            disabled={working}
            onChange={readFile}
          />
        </label>
      </div>

      <div className="catalogWorkflow">
        <span className={file ? "done" : "active"}>1. Seleziona</span>
        <span className={analyzing ? "active" : rows.length ? "done" : ""}>2. Analizza</span>
        <span className={rows.length ? "active" : ""}>3. Controlla</span>
        <span>4. Importa</span>
      </div>

      {progress && analyzing && (
        <div className="catalogProgress" role="status">
          <div>
            <FileSearch size={17} />
            <span>{progress.message}</span>
            <b>
              {progress.total > 1
                ? `${Math.round((progress.current / progress.total) * 100)}%`
                : "…"}
            </b>
          </div>
          <progress value={progress.current} max={progress.total} />
        </div>
      )}

      {importing && file && (
        <div className="catalogProgress catalogUploadProgress" role="status">
          <div>
            {importPhase === "tools" ? (
              <CheckCircle2 size={17} />
            ) : (
              <FileUp size={17} />
            )}
            <span>
              {importPhase === "tools"
                ? `Salvataggio di ${selectedCount} parametri nello storico…`
                : uploadPercent < 100
                  ? "Parametri salvati. Caricamento catalogo su Firebase…"
                  : "Catalogo caricato. Finalizzazione…"}
            </span>
            <b>
              {importPhase === "tools" ? importPercent : uploadPercent}%
            </b>
          </div>
          <progress
            value={importPhase === "tools" ? importPercent : uploadPercent}
            max={100}
          />
          <small>
            Per i cataloghi molto grandi possono servire alcuni minuti. Non
            chiudere questa pagina.
          </small>
        </div>
      )}

      {error && (
        <div className="cuttingWarning error catalogImportError">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {file && !analyzing && (
        <div className="catalogPreviewSummary">
          <div>
            <b>{file.name}</b>
            <span>{formatBytes(file.size)}</span>
          </div>
          <dl>
            <div><dt>Righe</dt><dd>{rows.length}</dd></div>
            <div><dt>Pronte</dt><dd>{selectedCount}</dd></div>
            <div><dt>Duplicate</dt><dd>{duplicateCount}</dd></div>
            <div><dt>Da verificare</dt><dd>{warningCount}</dd></div>
          </dl>
        </div>
      )}

      {rows.length > 0 && !analyzing && (
        <>
          <div className="catalogPreviewActions">
            <div>
              <button type="button" onClick={() => selectAll(true)}>
                Seleziona valide
              </button>
              <button type="button" onClick={() => selectAll(false)}>
                Deseleziona
              </button>
            </div>
            {rows.length > 500 && (
              <small>Anteprima delle prime 500 righe su {rows.length}</small>
            )}
          </div>

          <div className="catalogTableWrap">
            <table className="catalogImportTable">
              <thead>
                <tr>
                  <th>Importa</th>
                  <th>Stato</th>
                  <th>Codice articolo</th>
                  <th>Descrizione</th>
                  <th>Tipo</th>
                  <th>Ø mm</th>
                  <th>Z</th>
                  <th>Vc</th>
                  <th>fz / f</th>
                  <th>Pag.</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 500).map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.duplicate || !row.valid
                        ? "invalid"
                        : row.warnings.length
                          ? "warning"
                          : ""
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={!row.valid || row.duplicate}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Importa ${row.code}`}
                      />
                    </td>
                    <td>
                      <CatalogStatus row={row} />
                    </td>
                    <td><b>{row.code}</b></td>
                    <td>{row.name}</td>
                    <td>{row.category}</td>
                    <td>{row.diameter || "—"}</td>
                    <td>{row.teeth || "—"}</td>
                    <td>{row.cuttingSpeed || "—"}</td>
                    <td>{row.feed || "—"}</td>
                    <td>{row.sourcePage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {file && !analyzing && (
        <div className="catalogConfirmActions">
          <button type="button" onClick={clearPreview} disabled={importing}>
            Annulla
          </button>
          <button type="button" onClick={archiveOnly} disabled={importing}>
            Archivia soltanto
          </button>
          <button
            type="button"
            className="primary"
            onClick={importSelected}
            disabled={importing || selectedCount === 0}
          >
            <CheckCircle2 size={17} />
            {importing
              ? "Importazione…"
              : `Importa ${selectedCount} parametri`}
          </button>
        </div>
      )}

      {catalogs.length ? (
        <div className="cuttingCatalogList">
          {catalogs.map((catalog) => (
            <article key={catalog.id}>
              <div>
                <b>{catalog.title}</b>
                <small>
                  {catalog.fileName || "Catalogo"}
                  {catalog.fileSize
                    ? ` · ${formatBytes(catalog.fileSize)}`
                    : ""}
                </small>
              </div>
              <div className="cuttingCatalogCardActions">
                {catalog.fileUrl && (
                  <a
                    href={catalog.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Apri catalogo"
                  >
                    <Download size={16} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeCatalog(catalog)}
                  disabled={working || deletingCatalogId === catalog.id}
                  title="Elimina catalogo"
                  aria-label={`Elimina ${catalog.title}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="cuttingCatalogEmpty">
          Nessun catalogo archiviato. Il calcolo manuale rimane sempre disponibile.
        </p>
      )}
    </section>
  );
}

function CatalogStatus({ row }: { row: CatalogCandidate }) {
  if (row.duplicate) {
    return <span className="catalogRowStatus duplicate">Duplicato</span>;
  }

  if (!row.valid) {
    return (
      <span className="catalogRowStatus invalid" title={row.errors.join(", ")}>
        Da correggere
      </span>
    );
  }

  if (row.warnings.length) {
    return (
      <span className="catalogRowStatus warning" title={row.warnings.join(", ")}>
        Verifica
      </span>
    );
  }

  return <span className="catalogRowStatus valid">Valido</span>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}`;
}
