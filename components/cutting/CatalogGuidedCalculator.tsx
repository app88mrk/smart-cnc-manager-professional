"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Search,
  Sparkles,
} from "lucide-react";

import {
  catalogPageExcerpt,
  searchCatalogPages,
} from "@/lib/catalogImport";
import type {
  CatalogCalculationOperation,
  CatalogCalculationSelection,
  CatalogSearchPage,
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

const MAX_TOOL_RESULTS = 12;

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

  const catalogOptions = catalogs.filter(
    (catalog) =>
      catalogId === "all" || catalog.id === catalogId,
  );
  const materialOptions = useMemo(
    () =>
      Array.from(
        new Set(
          catalogOptions.flatMap((catalog) =>
            catalog.pages.flatMap((page) => page.materials),
          ),
        ),
      ).sort(),
    [catalogOptions],
  );

  const results = useMemo(() => {
    const normalizedQuery = foldText(query);

    return searchCatalogPages(catalogs, query, catalogId)
      .filter((page) => pageMatchesOperation(page, operation))
      .filter(
        (page) =>
          material === "all" ||
          page.materials.includes(material),
      )
      .filter((page) => hasCalculationData(page, operation))
      .sort(
        (left, right) =>
          candidateScore(right, normalizedQuery) -
            candidateScore(left, normalizedQuery) ||
          left.page - right.page,
      )
      .slice(0, MAX_TOOL_RESULTS);
  }, [catalogId, catalogs, material, operation, query]);

  function applyPage(page: CatalogSearchPage) {
    const feedKind = feedKindForOperation(operation, page);
    const exactArticle = articleForQuery(page, query);
    const matchingFamily = familyForQuery(page, query);

    onApply({
      pageId: page.id,
      catalogId: page.catalogId,
      catalogName: page.catalogName,
      page: page.page,
      operation,
      family: matchingFamily,
      article: exactArticle,
      material:
        material !== "all"
          ? material
          : page.materials[0] || "",
      vc: page.parameters.vc[0],
      feed: page.parameters[feedKind][0],
      feedKind,
      ap: page.parameters.ap[0] || "",
      ae: page.parameters.ae[0] || "",
      profile,
      excerpt: catalogPageExcerpt(
        page,
        exactArticle || matchingFamily || query,
      ),
    });
  }

  if (!catalogs.length) {
    return (
      <div className="guidedCatalogEmpty">
        <BookOpen size={24} />
        <div>
          <b>Carica il primo catalogo PDF</b>
          <span>
            Dopo l’indicizzazione compariranno qui gli utensili
            utilizzabili nel calcolo.
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
          <b>Calcolo automatico dai tuoi cataloghi</b>
          <span>
            Scegli la lavorazione e cerca l’utensile. Vc,
            avanzamento e profondità vengono applicati senza
            ricopiarli dal PDF.
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
            onClick={() => setOperation(item)}
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
            onChange={(event) => setCatalogId(event.target.value)}
          >
            <option value="all">Tutti i cataloghi caricati</option>
            {catalogs.map((catalog) => (
              <option value={catalog.id} key={catalog.id}>
                {catalog.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Materiale da lavorare</span>
          <select
            aria-label="Materiale da catalogo"
            value={material}
            onChange={(event) => setMaterial(event.target.value)}
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
          <span>Utensile o codice articolo</span>
          <div>
            <Search size={16} />
            <input
              aria-label="Cerca utensile o codice nel catalogo"
              value={query}
              placeholder="Es. DNMG, 25 0654, punta HSS, fresa HM…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <small>
            Se conosci il codice, scrivilo per individuare la pagina
            più precisa.
          </small>
        </label>

        <label className="full">
          <span>Impostazione di lavoro</span>
          <select
            aria-label="Impostazione dati catalogo"
            value={profile}
            onChange={(event) =>
              setProfile(event.target.value as CuttingProfile)
            }
          >
            {(
              Object.keys(profileLabels) as CuttingProfile[]
            ).map((item) => (
              <option value={item} key={item}>
                {profileLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="guidedResultCount">
        <b>
          {results.length}{" "}
          {results.length === 1
            ? "utensile compatibile"
            : "utensili compatibili"}
        </b>
        <span>
          {query
            ? "Risultati ordinati per corrispondenza."
            : "Scrivi un codice o una famiglia per restringere la scelta."}
        </span>
      </div>

      {results.length ? (
        <div className="guidedToolResults">
          {results.map((page) => {
            const feedKind = feedKindForOperation(operation, page);
            const active = activeSelection?.pageId === page.id;
            const exactArticle = articleForQuery(page, query);
            const displayReference =
              exactArticle ||
              familyForQuery(page, query) ||
              page.codes[0] ||
              "Scheda catalogo";

            return (
              <article
                className={`guidedToolCard ${
                  active ? "active" : ""
                }`}
                key={page.id}
              >
                <div className="guidedToolTop">
                  <div>
                    <span>
                      {page.catalogName} · pagina {page.page}
                    </span>
                    <b>{displayReference}</b>
                  </div>
                  {active && <CheckCircle2 size={18} />}
                </div>

                <div className="guidedToolTags">
                  {page.families.slice(0, 3).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                  {page.materials.slice(0, 2).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>

                <dl>
                  <div>
                    <dt>Vc</dt>
                    <dd>{page.parameters.vc[0]} m/min</dd>
                  </div>
                  <div>
                    <dt>{feedKind === "fz" ? "fz" : "f"}</dt>
                    <dd>
                      {page.parameters[feedKind][0]}{" "}
                      {feedKind === "fz"
                        ? "mm/dente"
                        : "mm/giro"}
                    </dd>
                  </div>
                  <div>
                    <dt>ap</dt>
                    <dd>
                      {page.parameters.ap[0]
                        ? `${page.parameters.ap[0]} mm`
                        : "Non indicata"}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => applyPage(page)}
                >
                  <Calculator size={16} />
                  {active
                    ? "Parametri applicati"
                    : "Usa questo utensile"}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="guidedCatalogWaiting">
          <Search size={19} />
          <span>
            Nessun utensile con Vc e avanzamento compatibili. Cambia
            ricerca, materiale o lavorazione.
          </span>
        </div>
      )}
    </div>
  );
}

function hasCalculationData(
  page: CatalogSearchPage,
  operation: CatalogCalculationOperation,
) {
  const feedKind = feedKindForOperation(operation, page);
  return Boolean(
    page.parameters.vc.length &&
      page.parameters[feedKind].length,
  );
}

function pageMatchesOperation(
  page: CatalogSearchPage,
  operation: CatalogCalculationOperation,
) {
  const source =
    `${page.families.join(" ")} ${page.searchText}`.toLowerCase();

  if (operation === "drilling") {
    return /punte|foratur|drill/.test(source);
  }
  if (operation === "milling") {
    return (
      /frese|fresatur|milling/.test(source) ||
      page.parameters.fz.length > 0
    );
  }

  return /placchett|tornitur|turning|cnmg|dnmg|knux|snmg|tnmg|vnmg|wnmg|rngn|ccgt|ccmt|dcgt|dcmt|rcgt|rcmt|scgt|scmt|tcgt|tcmt|vbgt|vbmt|vcgt|vcmt/.test(
    source,
  );
}

function feedKindForOperation(
  operation: CatalogCalculationOperation,
  page: CatalogSearchPage,
) {
  if (operation === "milling" && page.parameters.fz.length) {
    return "fz" as const;
  }

  return "feed" as const;
}

function articleForQuery(
  page: CatalogSearchPage,
  query: string,
) {
  const foldedQuery = foldText(query);
  if (!foldedQuery || !/\d/.test(foldedQuery)) {
    return "";
  }

  return (
    page.codes.find(
      (code) => foldText(code) === foldedQuery,
    ) ||
    page.codes.find((code) =>
      foldText(code).includes(foldedQuery),
    ) ||
    ""
  );
}

function familyForQuery(
  page: CatalogSearchPage,
  query: string,
) {
  const foldedQuery = foldText(query);
  return (
    page.families.find((family) =>
      foldText(family).includes(foldedQuery),
    ) ||
    page.families[0] ||
    ""
  );
}

function candidateScore(
  page: CatalogSearchPage,
  query: string,
) {
  if (!query) {
    return page.parameterCount;
  }

  const exactCode = page.codes.some(
    (code) => foldText(code) === query,
  );
  const exactFamily = page.families.some(
    (family) => foldText(family) === query,
  );
  const partialCode = page.codes.some((code) =>
    foldText(code).includes(query),
  );
  const partialFamily = page.families.some((family) =>
    foldText(family).includes(query),
  );

  return (
    (exactCode ? 10_000 : 0) +
    (exactFamily ? 8_000 : 0) +
    (partialCode ? 4_000 : 0) +
    (partialFamily ? 2_000 : 0) +
    page.parameterCount
  );
}

function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
