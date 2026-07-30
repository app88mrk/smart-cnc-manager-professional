"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ListFilter,
  Search,
  Sparkles,
} from "lucide-react";

import { catalogToolsFromCatalogs } from "@/lib/catalogImport";
import type {
  CatalogCalculationOperation,
  CatalogCalculationSelection,
  CatalogParameterSet,
  CatalogToolRecord,
  ImportedCatalog,
} from "@/lib/catalogImport";
import {
  type CuttingProfile,
  profileLabels,
} from "@/lib/cuttingParameters";

type CatalogGuidedCalculatorProps = {
  activeSelection: CatalogCalculationSelection | null;
  catalogs: ImportedCatalog[];
  onApply: (selection: CatalogCalculationSelection) => void;
};

const operationNames: Record<
  CatalogCalculationOperation,
  string
> = {
  drilling: "Foratura",
  milling: "Fresatura",
  turning: "Tornitura",
};

const MAX_TOOL_OPTIONS = 250;

export default function CatalogGuidedCalculator({
  activeSelection,
  catalogs,
  onApply,
}: CatalogGuidedCalculatorProps) {
  const [catalogId, setCatalogId] = useState("all");
  const [operation, setOperation] =
    useState<CatalogCalculationOperation>("drilling");
  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState("all");
  const [profile, setProfile] =
    useState<CuttingProfile>("conservative");
  const [toolId, setToolId] = useState("");
  const [parameterSetId, setParameterSetId] = useState("");

  const allTools = useMemo(
    () => catalogToolsFromCatalogs(catalogs),
    [catalogs],
  );
  const operationTools = useMemo(
    () =>
      allTools.filter(
        (tool) =>
          tool.operation === operation &&
          (catalogId === "all" || tool.catalogId === catalogId),
      ),
    [allTools, catalogId, operation],
  );
  const materialOptions = useMemo(
    () =>
      Array.from(
        new Set(operationTools.flatMap((tool) => tool.materials)),
      ).sort(),
    [operationTools],
  );
  const results = useMemo(() => {
    const radiusQuery = dimensionQuery(query, "radius");
    const diameterQuery = dimensionQuery(query, "diameter");
    const textQuery = query
      .replace(
        /(?:raggio|\br\b)\s*[:=]?\s*\d+(?:[.,]\d+)?/gi,
        " ",
      )
      .replace(
        /(?:diametro|dia\.?|Ø|⌀)\s*[:=]?\s*\d+(?:[.,]\d+)?/gi,
        " ",
      );
    const tokens = foldText(textQuery)
      .split(/\s+/)
      .filter(Boolean);

    return operationTools
      .filter(
        (tool) =>
          material === "all" ||
          tool.materials.includes(material) ||
          tool.parameterSets.some(
            (set) => set.material === material,
          ),
      )
      .filter(
        (tool) =>
          radiusQuery === null ||
          sameDimension(tool.radius, radiusQuery),
      )
      .filter(
        (tool) =>
          diameterQuery === null ||
          sameDimension(tool.diameter, diameterQuery),
      )
      .filter((tool) =>
        tokens.every((token) => tool.searchText.includes(token)),
      )
      .sort(
        (left, right) =>
          toolScore(right, query) - toolScore(left, query) ||
          left.page - right.page ||
          left.article.localeCompare(right.article),
      )
      .slice(0, MAX_TOOL_OPTIONS);
  }, [material, operationTools, query]);

  const selectedTool =
    results.find((tool) => tool.id === toolId) || null;
  const availableParameterSets = selectedTool
    ? parameterSetsForMaterial(selectedTool, material)
    : [];
  const selectedParameterSet =
    availableParameterSets.find(
      (set) => set.id === parameterSetId,
    ) || availableParameterSets[0];

  function clearChoice() {
    setToolId("");
    setParameterSetId("");
  }

  function changeOperation(next: CatalogCalculationOperation) {
    setOperation(next);
    setMaterial("all");
    setQuery("");
    clearChoice();
  }

  function changeCatalog(next: string) {
    setCatalogId(next);
    clearChoice();
  }

  function changeMaterial(next: string) {
    setMaterial(next);
    clearChoice();
  }

  function selectTool(nextId: string) {
    setToolId(nextId);
    const tool = results.find((item) => item.id === nextId);
    if (!tool) {
      setParameterSetId("");
      return;
    }

    const firstSet = parameterSetsForMaterial(tool, material)[0];
    setParameterSetId(firstSet?.id || "");
    if (firstSet) {
      applyTool(tool, firstSet, profile);
    }
  }

  function selectParameterSet(nextId: string) {
    setParameterSetId(nextId);
    const set = availableParameterSets.find(
      (item) => item.id === nextId,
    );
    if (selectedTool && set) {
      applyTool(selectedTool, set, profile);
    }
  }

  function changeProfile(next: CuttingProfile) {
    setProfile(next);
    if (selectedTool && selectedParameterSet) {
      applyTool(selectedTool, selectedParameterSet, next);
    }
  }

  function applyTool(
    tool: CatalogToolRecord,
    parameterSet: CatalogParameterSet,
    selectedProfile: CuttingProfile,
  ) {
    onApply({
      toolId: tool.id,
      pageId: parameterSet.sourcePageId || tool.pageId,
      catalogId: tool.catalogId,
      catalogName: tool.catalogName,
      page: parameterSet.sourcePage || tool.page,
      operation: tool.operation,
      family: tool.family,
      article: tool.article,
      material:
        material !== "all"
          ? material
          : parameterSet.material || tool.materials[0] || "",
      vc: parameterSet.vc,
      feed: parameterSet.feed,
      feedKind: parameterSet.feedKind,
      feedUnit: parameterSet.feedUnit,
      ap: parameterSet.ap,
      apUnit: parameterSet.apUnit,
      ae: parameterSet.ae,
      aeUnit: parameterSet.aeUnit,
      profile: selectedProfile,
      diameter: tool.diameter,
      radius: tool.radius,
      teeth: tool.teeth,
      toolMaterial: tool.toolMaterial,
      parameterSetLabel: parameterSet.label,
      excerpt: tool.excerpt,
    });
  }

  if (!catalogs.length) {
    return (
      <div className="guidedCatalogEmpty">
        <BookOpen size={24} />
        <div>
          <b>Carica il primo catalogo PDF</b>
          <span>
            L’app creerà automaticamente l’elenco di punte, frese e
            placchette con i parametri riconosciuti.
          </span>
          <label
            className="guidedCatalogUpload"
            htmlFor="catalog-pdf-input"
          >
            Carica catalogo PDF
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="guidedCatalogCalculator">
      <div className="guidedCatalogHead">
        <Sparkles size={18} />
        <div>
          <b>Archivio utensili ricavato dai cataloghi</b>
          <span>
            Cerca codice, modello, diametro o raggio. La scelta
            carica immediatamente i parametri nel calcolatore.
          </span>
        </div>
      </div>

      <div
        className="guidedOperationTabs"
        aria-label="Lavorazione da catalogo"
        role="tablist"
      >
        {(
          Object.keys(
            operationNames,
          ) as CatalogCalculationOperation[]
        ).map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={operation === item}
            className={operation === item ? "active" : ""}
            key={item}
            onClick={() => changeOperation(item)}
          >
            {operationNames[item]}
          </button>
        ))}
      </div>

      <div className="guidedCatalogFilters">
        <label>
          <span>Catalogo</span>
          <select
            aria-label="Catalogo da utilizzare"
            value={catalogId}
            onChange={(event) => changeCatalog(event.target.value)}
          >
            <option value="all">Tutti i cataloghi caricati</option>
            {catalogs.map((catalog) => (
              <option value={catalog.id} key={catalog.id}>
                {catalog.name} · {catalog.toolCount || 0} utensili
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Materiale da lavorare</span>
          <select
            aria-label="Materiale da catalogo"
            value={material}
            onChange={(event) => changeMaterial(event.target.value)}
          >
            <option value="all">Tutti i materiali</option>
            {materialOptions.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="guidedSearch full">
          <span>Ricerca intelligente</span>
          <div>
            <Search size={16} />
            <input
              aria-label="Cerca utensile o codice nel catalogo"
              value={query}
              placeholder="Codice, DNMG, R 0,8, Ø 10, fresa HM…"
              onChange={(event) => {
                setQuery(event.target.value);
                clearChoice();
              }}
            />
          </div>
          <small>
            Puoi cercare anche famiglia, materiale utensile, diametro
            e raggio.
          </small>
        </label>
      </div>

      <div className="guidedStructuredCount">
        <ListFilter size={16} />
        <div>
          <b>
            {results.length}{" "}
            {results.length === 1
              ? "utensile riconosciuto"
              : "utensili riconosciuti"}
          </b>
          <span>
            {results.length === MAX_TOOL_OPTIONS
              ? "Affina la ricerca per vedere meno risultati."
              : "Elenco creato automaticamente dai cataloghi disponibili."}
          </span>
        </div>
      </div>

      {results.length ? (
        <div className="guidedToolSelector">
          <label>
            <span>Utensile</span>
            <select
              aria-label="Utensile riconosciuto"
              value={toolId}
              onChange={(event) => selectTool(event.target.value)}
            >
              <option value="">Scegli un utensile…</option>
              {results.map((tool) => (
                <option value={tool.id} key={tool.id}>
                  {toolOptionLabel(tool)}
                </option>
              ))}
            </select>
          </label>

          {selectedTool && selectedParameterSet && (
            <>
              <div className="guidedSelectedTool">
                <div className="guidedSelectedToolHead">
                  <div>
                    <span>
                      {selectedTool.catalogName} · pagina scheda{" "}
                      {selectedTool.page}
                    </span>
                    <b>
                      {selectedTool.article ||
                        selectedTool.family ||
                        selectedTool.category}
                    </b>
                  </div>
                  <CheckCircle2 size={19} />
                </div>
                <div className="guidedSelectedTags">
                  <span>{selectedTool.category}</span>
                  {selectedTool.family && (
                    <span>{selectedTool.family}</span>
                  )}
                  {selectedTool.toolMaterial && (
                    <span>{selectedTool.toolMaterial}</span>
                  )}
                  {selectedTool.diameter && (
                    <span>Ø {selectedTool.diameter} mm</span>
                  )}
                  {selectedTool.radius && (
                    <span>R {selectedTool.radius} mm</span>
                  )}
                  {selectedTool.teeth && (
                    <span>Z {selectedTool.teeth}</span>
                  )}
                </div>
              </div>

              <div className="guidedCatalogValues">
                <label className="full">
                  <span>Set parametri del catalogo</span>
                  <select
                    aria-label="Set parametri catalogo"
                    value={selectedParameterSet.id}
                    onChange={(event) =>
                      selectParameterSet(event.target.value)
                    }
                  >
                    {availableParameterSets.map((set, index) => (
                      <option value={set.id} key={set.id}>
                        {index + 1}. {set.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="full">
                  <span>Impostazione di lavoro</span>
                  <select
                    aria-label="Impostazione dati catalogo"
                    value={profile}
                    onChange={(event) =>
                      changeProfile(
                        event.target.value as CuttingProfile,
                      )
                    }
                  >
                    {(
                      Object.keys(
                        profileLabels,
                      ) as CuttingProfile[]
                    ).map((item) => (
                      <option value={item} key={item}>
                        {profileLabels[item]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="guidedAutoApplied">
                <Calculator size={17} />
                <div>
                  <b>Parametri caricati automaticamente</b>
                  <span>
                    Vc {selectedParameterSet.vc} m/min ·{" "}
                    {selectedParameterSet.feedKind === "fz"
                      ? "fz"
                      : "f"}{" "}
                    {selectedParameterSet.feed}
                    {selectedParameterSet.feedUnit
                      ? ` ${selectedParameterSet.feedUnit}`
                      : ""}
                    {selectedParameterSet.ap
                      ? ` · ap ${selectedParameterSet.ap} ${
                          selectedParameterSet.apUnit || "mm"
                        }`
                      : ""}
                    {selectedParameterSet.ae
                      ? ` · ae ${selectedParameterSet.ae} ${
                          selectedParameterSet.aeUnit || "mm"
                        }`
                      : ""}
                    {selectedParameterSet.sourcePage
                      ? ` · pag. ${selectedParameterSet.sourcePage}`
                      : ""}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="guidedCatalogWaiting">
          <Search size={19} />
          <span>
            Nessun utensile completo di Vc e avanzamento è stato
            riconosciuto con questi filtri.
          </span>
        </div>
      )}

      <div className="guidedImportNotice">
        I valori provengono dalle tabelle dei cataloghi: controlla
        materiale, geometria e pagina fonte prima della lavorazione.
      </div>
    </div>
  );
}

function parameterSetsForMaterial(
  tool: CatalogToolRecord,
  material: string,
) {
  if (material === "all") {
    return tool.parameterSets;
  }

  const matching = tool.parameterSets.filter(
    (set) => !set.material || set.material === material,
  );
  return matching.length ? matching : tool.parameterSets;
}

function toolOptionLabel(tool: CatalogToolRecord) {
  const details = [
    tool.article,
    tool.family && tool.family !== tool.article ? tool.family : "",
    tool.toolMaterial,
    tool.diameter ? `Ø ${tool.diameter}` : "",
    tool.radius ? `R ${tool.radius}` : "",
    tool.teeth ? `Z ${tool.teeth}` : "",
    `pag. ${tool.page}`,
  ].filter(Boolean);

  return details.join(" · ");
}

function toolScore(tool: CatalogToolRecord, query: string) {
  const foldedQuery = foldText(query);
  if (!foldedQuery) {
    return tool.parameterSets.length;
  }

  const article = foldText(tool.article);
  const family = foldText(tool.family);
  return (
    (article === foldedQuery ? 10_000 : 0) +
    (family === foldedQuery ? 8_000 : 0) +
    (article.includes(foldedQuery) ? 4_000 : 0) +
    (family.includes(foldedQuery) ? 2_000 : 0) +
    tool.parameterSets.length
  );
}

function dimensionQuery(
  query: string,
  kind: "radius" | "diameter",
) {
  const pattern =
    kind === "radius"
      ? /(?:raggio|\br\b)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i
      : /(?:diametro|dia\.?|Ø|⌀)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i;
  const match = query.match(pattern);
  if (!match) {
    return null;
  }

  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function sameDimension(value: string, expected: number) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && Math.abs(parsed - expected) < 0.001;
}

function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
