"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileUp,
  Search,
  Trash2,
} from "lucide-react";

import { CuttingOperation } from "@/lib/cuttingCalculations";
import { RecordItem } from "@/types";

type Props = {
  records: RecordItem[];
  catalogs: RecordItem[];
  operation: CuttingOperation;
  busy: boolean;
  onUse: (record: RecordItem) => void;
  onDelete: (records: RecordItem[]) => Promise<boolean>;
  onManageCatalogs: () => void;
};

type QualityFilter = "all" | "complete" | "verify";

type ParameterRow = {
  record: RecordItem;
  operation: CuttingOperation | null;
  code: string;
  diameter: number;
  teeth: number;
  cuttingSpeed: number;
  feed: number;
  feedLabel: "fz" | "f";
  material: string;
  catalogId: string;
  catalogName: string;
  page: string;
  complete: boolean;
  confidence: number;
};

const operationLabels: Record<CuttingOperation, string> = {
  milling: "fresatura",
  drilling: "foratura",
  turning: "tornitura",
};

export default function CatalogParameterLibrary({
  records,
  catalogs,
  operation,
  busy,
  onUse,
  onDelete,
  onManageCatalogs,
}: Props) {
  const [query, setQuery] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [diameterFilter, setDiameterFilter] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [qualityFilter, setQualityFilter] =
    useState<QualityFilter>("all");
  const [visibleLimit, setVisibleLimit] = useState(50);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const catalogNames = useMemo(() => {
    const names = new Map(catalogs.map((catalog) => [catalog.id, catalog.title]));

    records.forEach((record) => {
      const catalogId = savedText(record.notes, "Catalogo ID");
      const catalogName = savedText(record.notes, "Catalogo");
      if (catalogId && catalogName && !names.has(catalogId)) {
        names.set(catalogId, catalogName.replace(/\.[^.]+$/, ""));
      }
    });

    return names;
  }, [catalogs, records]);

  const rows = useMemo(
    () =>
      records.map((record) => parameterRow(record, catalogNames)),
    [catalogNames, records]
  );

  const operationRows = useMemo(
    () => rows.filter((row) => row.operation === operation),
    [operation, rows]
  );

  const diameters = useMemo(
    () =>
      Array.from(
        new Set(
          operationRows
            .map((row) => row.diameter)
            .filter((value) => value > 0)
        )
      ).sort((a, b) => a - b),
    [operationRows]
  );

  const materials = useMemo(
    () =>
      Array.from(
        new Set(
          operationRows
            .map((row) => row.material)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "it")),
    [operationRows]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return operationRows.filter((row) => {
      if (
        normalizedQuery &&
        !`${row.code} ${row.record.title} ${row.record.subtitle} ${row.material} ${row.catalogName}`
          .toLowerCase()
          .includes(normalizedQuery)
      ) {
        return false;
      }

      if (catalogFilter !== "all" && row.catalogId !== catalogFilter) {
        return false;
      }

      if (
        diameterFilter !== "all" &&
        row.diameter !== Number(diameterFilter)
      ) {
        return false;
      }

      if (materialFilter !== "all" && row.material !== materialFilter) {
        return false;
      }

      if (qualityFilter === "complete" && !row.complete) return false;
      if (qualityFilter === "verify" && row.complete) return false;
      return true;
    });
  }, [
    catalogFilter,
    diameterFilter,
    materialFilter,
    operationRows,
    qualityFilter,
    query,
  ]);

  const visibleRows = filteredRows.slice(0, visibleLimit);
  const selectedRows = operationRows.filter((row) =>
    selectedIds.includes(row.record.id)
  );
  const allVisibleSelected =
    visibleRows.length > 0 &&
    visibleRows.every((row) => selectedIds.includes(row.record.id));

  function resetFilters() {
    setQuery("");
    setCatalogFilter("all");
    setDiameterFilter("all");
    setMaterialFilter("all");
    setQualityFilter("all");
    setVisibleLimit(50);
  }

  function toggleRow(recordId: string) {
    setSelectedIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId]
    );
  }

  function toggleVisibleRows() {
    const visibleIds = visibleRows.map((row) => row.record.id);

    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  }

  async function deleteRows(rowsToDelete: ParameterRow[]) {
    if (!rowsToDelete.length) return;
    const recordsToDelete = rowsToDelete.map((row) => row.record);
    const deleted = await onDelete(recordsToDelete);

    if (deleted) {
      const deletedIds = new Set(recordsToDelete.map((record) => record.id));
      setSelectedIds((current) =>
        current.filter((id) => !deletedIds.has(id))
      );
    }
  }

  function exportCsv() {
    const header = [
      "Codice articolo",
      "Descrizione",
      "Operazione",
      "Diametro mm",
      "Taglienti",
      "Vc m/min",
      operation === "milling" ? "fz mm/dente" : "f mm/giro",
      "Materiale utensile",
      "Catalogo",
      "Pagina",
      "Affidabilita %",
    ];
    const lines = filteredRows.map((row) =>
      [
        row.code,
        row.record.title,
        operationLabels[operation],
        row.diameter || "",
        row.teeth || "",
        row.cuttingSpeed || "",
        row.feed || "",
        row.material,
        row.catalogName,
        row.page,
        row.confidence,
      ]
        .map(csvCell)
        .join(";")
    );
    const blob = new Blob(
      [`\uFEFF${[header.map(csvCell).join(";"), ...lines].join("\r\n")}`],
      { type: "text/csv;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `parametri-${operationLabels[operation]}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="catalogParameterLibrary">
      <div className="catalogParameterHead">
        <div>
          <Database size={19} />
          <div>
            <span>LIBRERIA PARAMETRI CATALOGO</span>
            <h2>Parametri per {operationLabels[operation]}</h2>
            <small>
              Scegli una riga per compilare automaticamente il calcolatore
            </small>
          </div>
        </div>
        <dl>
          <div>
            <dt>Disponibili</dt>
            <dd>{operationRows.length}</dd>
          </div>
          <div>
            <dt>Completi</dt>
            <dd>{operationRows.filter((row) => row.complete).length}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="catalogManageButton"
          onClick={onManageCatalogs}
        >
          <FileUp size={15} />
          Gestisci cataloghi
        </button>
      </div>

      {operationRows.length ? (
        <>
          <div className="catalogParameterFilters">
            <label className="catalogParameterSearch">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleLimit(50);
                }}
                placeholder="Cerca codice articolo o descrizione…"
              />
            </label>

            <label>
              <span>Catalogo</span>
              <select
                value={catalogFilter}
                onChange={(event) => setCatalogFilter(event.target.value)}
              >
                <option value="all">Tutti i cataloghi</option>
                {Array.from(catalogNames.entries()).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Diametro</span>
              <select
                value={diameterFilter}
                onChange={(event) => setDiameterFilter(event.target.value)}
              >
                <option value="all">Tutti i diametri</option>
                {diameters.map((diameter) => (
                  <option key={diameter} value={diameter}>
                    Ø {formatNumber(diameter)} mm
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Materiale utensile</span>
              <select
                value={materialFilter}
                onChange={(event) => setMaterialFilter(event.target.value)}
              >
                <option value="all">Tutti i materiali</option>
                {materials.map((material) => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Qualità dati</span>
              <select
                value={qualityFilter}
                onChange={(event) =>
                  setQualityFilter(event.target.value as QualityFilter)
                }
              >
                <option value="all">Tutti i dati</option>
                <option value="complete">Completi</option>
                <option value="verify">Da verificare</option>
              </select>
            </label>
          </div>

          <div className="catalogParameterResultBar">
            <span>{filteredRows.length} parametri trovati</span>
            <div>
              {selectedRows.length > 0 && (
                <button
                  type="button"
                  className="catalogParameterDeleteSelected"
                  onClick={() => deleteRows(selectedRows)}
                  disabled={busy}
                >
                  <Trash2 size={14} />
                  Elimina selezionati ({selectedRows.length})
                </button>
              )}
              <button type="button" onClick={exportCsv}>Esporta CSV</button>
              <button type="button" onClick={resetFilters}>Azzera filtri</button>
            </div>
          </div>

          {filteredRows.length ? (
            <div className="catalogParameterTableWrap">
              <table className="catalogParameterTable">
                <thead>
                  <tr>
                    <th className="catalogParameterSelectCell">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleVisibleRows}
                        aria-label="Seleziona tutti i parametri visibili"
                      />
                    </th>
                    <th>Stato</th>
                    <th>Codice articolo</th>
                    <th>Descrizione</th>
                    <th>Ø mm</th>
                    <th>Z</th>
                    <th>Vc</th>
                    <th>{operation === "milling" ? "fz" : "f"}</th>
                    <th>Catalogo / pagina</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.record.id}>
                      <td className="catalogParameterSelectCell">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.record.id)}
                          onChange={() => toggleRow(row.record.id)}
                          aria-label={`Seleziona ${row.record.title}`}
                        />
                      </td>
                      <td>
                        <span className={`catalogParameterStatus ${row.complete ? "complete" : "verify"}`}>
                          {row.complete ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <AlertTriangle size={13} />
                          )}
                          {row.complete ? "Completo" : "Verifica"} · {row.confidence}%
                        </span>
                      </td>
                      <td><b>{row.code || "—"}</b></td>
                      <td>
                        <strong>{row.record.title}</strong>
                        {row.material && <small>{row.material}</small>}
                      </td>
                      <td>{row.diameter > 0 ? formatNumber(row.diameter) : "—"}</td>
                      <td>{row.teeth > 0 ? formatNumber(row.teeth) : "—"}</td>
                      <td>{row.cuttingSpeed > 0 ? `${formatNumber(row.cuttingSpeed)} m/min` : "—"}</td>
                      <td>{row.feed > 0 ? `${formatNumber(row.feed, 3)} ${row.feedLabel === "fz" ? "mm/dente" : "mm/giro"}` : "—"}</td>
                      <td>
                        <span>{row.catalogName || "Catalogo"}</span>
                        <small>{row.page ? `Pag. ${row.page}` : "Pagina non indicata"}</small>
                      </td>
                      <td>
                        <div className="catalogParameterRowActions">
                          <button
                            type="button"
                            className="catalogParameterUse"
                            onClick={() => onUse(row.record)}
                            disabled={busy}
                          >
                            Usa nel calcolo
                          </button>
                          <button
                            type="button"
                            className="catalogParameterDelete"
                            onClick={() => deleteRows([row])}
                            disabled={busy}
                            title="Elimina parametro importato"
                            aria-label={`Elimina ${row.record.title}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="catalogParameterEmpty compact">
              Nessun parametro corrisponde ai filtri selezionati.
            </div>
          )}

          {filteredRows.length > visibleLimit && (
            <button
              type="button"
              className="catalogParameterMore"
              onClick={() => setVisibleLimit((current) => current + 50)}
            >
              Mostra altri parametri
            </button>
          )}
        </>
      ) : (
        <div className="catalogParameterEmpty">
          <Database size={23} />
          <b>Nessun parametro catalogo per {operationLabels[operation]}</b>
          <span>
            Importa un catalogo e conferma le righe riconosciute: verranno
            archiviate qui, separate dallo storico dei calcoli.
          </span>
        </div>
      )}
    </section>
  );
}

function parameterRow(
  record: RecordItem,
  catalogNames: Map<string, string>
): ParameterRow {
  const operation = savedOperation(record);
  const diameter =
    savedNumber(record.notes, "Diametro") ||
    numberValue(record.tool?.diameter || "");
  const teeth =
    savedNumber(record.notes, "Taglienti") ||
    numberValue(record.tool?.fluteCount || "");
  const cuttingSpeed = savedNumber(record.notes, "Vc");
  const feedLabel = operation === "milling" ? "fz" : "f";
  const feed =
    savedNumber(record.notes, feedLabel) ||
    savedNumber(record.notes, feedLabel === "fz" ? "f" : "fz");
  const catalogId = savedText(record.notes, "Catalogo ID");
  const catalogName =
    catalogNames.get(catalogId) || savedText(record.notes, "Catalogo");
  const complete =
    cuttingSpeed > 0 &&
    feed > 0 &&
    (operation === "turning" || diameter > 0) &&
    (operation !== "milling" || teeth > 0);
  const confidence = parameterConfidence({
    code:
      savedText(record.notes, "Codice articolo") ||
      record.tool?.code ||
      "",
    title: record.title,
    operation,
    diameter,
    teeth,
    cuttingSpeed,
    feed,
  });

  return {
    record,
    operation,
    code:
      savedText(record.notes, "Codice articolo") ||
      record.tool?.code ||
      "",
    diameter,
    teeth,
    cuttingSpeed,
    feed,
    feedLabel,
    material:
      savedText(record.notes, "Materiale utensile") ||
      record.tool?.material ||
      "",
    catalogId,
    catalogName: catalogName.replace(/\.[^.]+$/, ""),
    page: savedText(record.notes, "Pagina catalogo"),
    complete,
    confidence,
  };
}

function savedOperation(record: RecordItem): CuttingOperation | null {
  const describedOperation = operationFromDescription(
    `${savedText(record.notes, "Categoria utensile")} ${record.title}`
  );
  if (describedOperation) return describedOperation;

  const operation = record.notes.match(
    /Tipo calcolo:\s*(milling|drilling|turning)/i
  )?.[1];
  if (operation) {
    return operation.toLowerCase() as CuttingOperation;
  }

  const category = record.tool?.category;
  if (category === "Punta" || category === "Maschio" || category === "Bareno") {
    return "drilling";
  }
  if (category === "Tornitura" || category === "Inserto") {
    return "turning";
  }
  return category ? "milling" : null;
}

function operationFromDescription(value: string): CuttingOperation | null {
  if (/\b(fresa|frese|milling|mill)\b/i.test(value)) return "milling";
  if (/\b(punta|punte|drill|maschio|maschi|tap|bareno|alesatore|alesatori|reamer)\b/i.test(value)) {
    return "drilling";
  }
  if (/\b(tornitura|turning|inserto|inserti|placchetta|placchette|cnmg|dnmg|wnmg)\b/i.test(value)) {
    return "turning";
  }
  return null;
}

function savedText(notes: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    notes.match(new RegExp(`(?:^|\\n)${escapedLabel}:\\s*(.+)$`, "im"))?.[1]?.trim() ||
    ""
  );
}

function savedNumber(notes: string, label: string) {
  const value = savedText(notes, label).match(/-?\d+(?:[.,]\d+)?/)?.[0];
  if (!value) return 0;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberValue(value: string) {
  const parsed = Number(value.replace(",", ".").match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: decimals,
  }).format(value);
}

function parameterConfidence(values: {
  code: string;
  title: string;
  operation: CuttingOperation | null;
  diameter: number;
  teeth: number;
  cuttingSpeed: number;
  feed: number;
}) {
  let score = 0;
  if (values.code) score += 15;
  if (values.title) score += 15;
  if (values.operation) score += 10;
  if (values.operation === "turning" || values.diameter > 0) score += 15;
  if (values.cuttingSpeed > 0) score += 20;
  if (values.feed > 0) score += 20;
  if (values.operation !== "milling" || values.teeth > 0) score += 5;
  return score;
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}
