"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileSearch,
  FileUp,
} from "lucide-react";

import {
  analyzeCatalogFile,
  candidateToRecord,
  CatalogCandidate,
  CatalogProgress,
  validateCatalogCandidates,
} from "@/lib/catalogImport";
import { RecordItem } from "@/types";

type Props = {
  existingTools: RecordItem[];
  catalogs: RecordItem[];
  busy: boolean;
  saveCatalog: (record: RecordItem, file: File) => Promise<void>;
  saveImportedTools: (records: RecordItem[]) => Promise<void>;
  notifySuccess: (message: string) => void;
  selectCatalog: (catalogId: string) => void;
};

const maximumUploadSize = 500 * 1024 * 1024;

export default function CatalogImporter({
  existingTools,
  catalogs,
  busy,
  saveCatalog,
  saveImportedTools,
  notifySuccess,
  selectCatalog,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CatalogCandidate[]>([]);
  const [progress, setProgress] = useState<CatalogProgress | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
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
        existingTools
      );
      setRows(validated);

      if (!validated.length) {
        setError(
          "Il catalogo è leggibile, ma non sono state riconosciute righe utensile. Puoi archiviarlo oppure convertirlo in CSV/XLSX."
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

  async function archiveCatalog() {
    if (!file) return null;

    const now = new Date().toISOString();
    const catalogId = createId("catalog");

    await saveCatalog(
      {
        id: catalogId,
        module: "manuals",
        title: file.name.replace(/\.[^.]+$/, ""),
        subtitle: `Catalogo parametri · ${rows.length} utensili riconosciuti`,
        status: "Disponibile",
        machineId: "",
        machine: "",
        notes: [
          "[CATALOGO_PARAMETRI]",
          `File originale: ${file.name}`,
          `Utensili riconosciuti: ${rows.length}`,
          `Duplicati rilevati: ${duplicateCount}`,
          `Valori da verificare: ${warningCount}`,
        ].join("\n"),
        createdAt: now,
        updatedAt: now,
      },
      file
    );
    selectCatalog(catalogId);
    return catalogId;
  }

  async function importSelected() {
    if (!file || !selectedCount) return;

    setImporting(true);
    setError("");

    try {
      const catalogId = await archiveCatalog();

      if (!catalogId) return;

      const records = rows
        .filter((row) => row.selected && row.valid && !row.duplicate)
        .map((row) => candidateToRecord(row, file.name, catalogId));

      await saveImportedTools(records);
      notifySuccess(
        `Catalogo archiviato e ${records.length} utensili importati correttamente.`
      );
      clearPreview();
    } catch {
      // L'errore viene già mostrato da useRecords.
    } finally {
      setImporting(false);
    }
  }

  async function archiveOnly() {
    if (!file) return;

    setImporting(true);
    setError("");

    try {
      await archiveCatalog();
      notifySuccess(`Catalogo “${file.name}” archiviato correttamente.`);
      clearPreview();
    } catch {
      // L'errore viene già mostrato da useRecords.
    } finally {
      setImporting(false);
    }
  }

  function clearPreview() {
    setFile(null);
    setRows([]);
    setProgress(null);
    setError("");
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
              : `Importa ${selectedCount} utensili`}
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
