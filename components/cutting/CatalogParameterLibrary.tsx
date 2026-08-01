"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileUp,
  Search,
} from "lucide-react";

import { CuttingOperation } from "@/lib/cuttingCalculations";
import { RecordItem } from "@/types";

type Props = {
  records: RecordItem[];
  catalogs: RecordItem[];
  operation: CuttingOperation;
  busy: boolean;
  onUse: (record: RecordItem) => void;
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
  onManageCatalogs,
}: Props) {
  const [query, setQuery] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [diameterFilter, setDiameterFilter] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [qualityFilter, setQualityFilter] =
    useState<QualityFilter>("all");
  const [visibleLimit, setVisibleLimit] = useState(50);

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

  function resetFilters() {
    setQuery("");
    setCatalogFilter("all");
    setDiameterFilter("all");
    setMaterialFilter("all");
    setQualityFilter("all");
    setVisibleLimit(50);
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
            <button type="button" onClick={resetFilters}>Azzera filtri</button>
          </div>

          {filteredRows.length ? (
            <div className="catalogParameterTableWrap">
              <table className="catalogParameterTable">
                <thead>
                  <tr>
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
                      <td>
                        <span className={`catalogParameterStatus ${row.complete ? "complete" : "verify"}`}>
                          {row.complete ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <AlertTriangle size={13} />
                          )}
                          {row.complete ? "Completo" : "Verifica"}
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
                        <button
                          type="button"
                          className="catalogParameterUse"
                          onClick={() => onUse(row.record)}
                          disabled={busy}
                        >
                          Usa nel calcolo
                        </button>
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
  const feed = savedNumber(record.notes, feedLabel);
  const catalogId = savedText(record.notes, "Catalogo ID");
  const catalogName =
    catalogNames.get(catalogId) || savedText(record.notes, "Catalogo");
  const complete =
    cuttingSpeed > 0 &&
    feed > 0 &&
    (operation === "turning" || diameter > 0) &&
    (operation !== "milling" || teeth > 0);

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
  };
}

function savedOperation(record: RecordItem): CuttingOperation | null {
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
