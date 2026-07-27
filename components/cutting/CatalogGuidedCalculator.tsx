"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function CatalogGuidedCalculator({
  activeSelection,
  catalogs,
  onApply,
}: CatalogGuidedCalculatorProps) {
  const [catalogId, setCatalogId] = useState("all");
  const [operation, setOperation] =
    useState<CatalogCalculationOperation>("drilling");
  const [query, setQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [pageId, setPageId] = useState("");
  const [article, setArticle] = useState("");
  const [family, setFamily] = useState("");
  const [material, setMaterial] = useState("");
  const [vc, setVc] = useState("");
  const [feed, setFeed] = useState("");
  const [ap, setAp] = useState("");
  const [ae, setAe] = useState("");

  const materialOptions = useMemo(
    () =>
      Array.from(
        new Set(
          catalogs
            .filter(
              (catalog) =>
                catalogId === "all" || catalog.id === catalogId,
            )
            .flatMap((catalog) =>
              catalog.pages.flatMap((page) => page.materials),
            ),
        ),
      ).sort(),
    [catalogId, catalogs],
  );

  const candidates = useMemo(
    () =>
      searchCatalogPages(catalogs, query, catalogId)
        .filter((page) => pageMatchesOperation(page, operation))
        .filter(
          (page) =>
            materialFilter === "all" ||
            page.materials.includes(materialFilter),
        )
        .filter((page) => {
          const feedKind = feedKindForOperation(operation, page);
          return Boolean(
            page.parameters.vc.length &&
              page.parameters[feedKind].length,
          );
        })
        .slice(0, 60),
    [catalogId, catalogs, materialFilter, operation, query],
  );

  const selectedPage =
    candidates.find((page) => page.id === pageId) || null;
  const feedKind = selectedPage
    ? feedKindForOperation(operation, selectedPage)
    : operation === "milling"
      ? "fz"
      : "feed";
  const canApply = Boolean(selectedPage && vc && feed);

  useEffect(() => {
    if (
      catalogId !== "all" &&
      !catalogs.some((catalog) => catalog.id === catalogId)
    ) {
      setCatalogId("all");
    }
  }, [catalogId, catalogs]);

  useEffect(() => {
    if (!pageId) {
      return;
    }

    if (!candidates.some((page) => page.id === pageId)) {
      setPageId("");
    }
  }, [candidates, pageId]);

  useEffect(() => {
    if (!selectedPage) {
      setArticle("");
      setFamily("");
      setMaterial("");
      setVc("");
      setFeed("");
      setAp("");
      setAe("");
      return;
    }

    const nextFeedKind = feedKindForOperation(
      operation,
      selectedPage,
    );
    setArticle(selectedPage.codes[0] || "");
    setFamily(selectedPage.families[0] || "");
    setMaterial(selectedPage.materials[0] || "");
    setVc(selectedPage.parameters.vc[0] || "");
    setFeed(selectedPage.parameters[nextFeedKind][0] || "");
    setAp(selectedPage.parameters.ap[0] || "");
    setAe(selectedPage.parameters.ae[0] || "");
  }, [operation, selectedPage]);

  function changeOperation(
    nextOperation: CatalogCalculationOperation,
  ) {
    setOperation(nextOperation);
    setPageId("");
  }

  function applyCatalogCalculation() {
    if (!selectedPage || !canApply) {
      return;
    }

    onApply({
      pageId: selectedPage.id,
      catalogId: selectedPage.catalogId,
      catalogName: selectedPage.catalogName,
      page: selectedPage.page,
      operation,
      family,
      article,
      material,
      vc,
      feed,
      feedKind,
      ap,
      ae,
      excerpt: catalogPageExcerpt(
        selectedPage,
        article || family || query,
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
            Usa il pulsante “Carica catalogo PDF” nell’archivio. Dopo
            l’indicizzazione, il calcolo guidato userà esclusivamente
            i dati trovati nei tuoi cataloghi.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="guidedCatalogCalculator">
      <div className="guidedCatalogHead">
        <Sparkles size={18} />
        <div>
          <b>Calcolo guidato dai tuoi cataloghi</b>
          <span>
            Scegli lavorazione e utensile: il calcolatore recupera Vc
            e avanzamento dal PDF selezionato.
          </span>
        </div>
      </div>

      <div className="guidedCatalogFilters">
        <label className="full">
          <span>Catalogo da utilizzare</span>
          <select
            aria-label="Catalogo da utilizzare"
            value={catalogId}
            onChange={(event) => {
              setCatalogId(event.target.value);
              setPageId("");
            }}
          >
            <option value="all">Tutti i cataloghi caricati</option>
            {catalogs.map((catalog) => (
              <option value={catalog.id} key={catalog.id}>
                {catalog.name}
              </option>
            ))}
          </select>
        </label>
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
        <label className="guidedSearch full">
          <span>Codice, utensile o famiglia</span>
          <div>
            <Search size={16} />
            <input
              aria-label="Cerca nel catalogo per il calcolo"
              value={query}
              placeholder="Es. 25 0654, DNMG, punta HSS, fresa HM…"
              onChange={(event) => {
                setQuery(event.target.value);
                setPageId("");
              }}
            />
          </div>
        </label>

        <label>
          <span>Materiale da lavorare</span>
          <select
            aria-label="Materiale da catalogo"
            value={materialFilter}
            onChange={(event) => {
              setMaterialFilter(event.target.value);
              setPageId("");
            }}
          >
            <option value="all">Tutti i materiali rilevati</option>
            {materialOptions.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Scheda trovata</span>
          <select
            aria-label="Scheda catalogo per il calcolo"
            value={pageId}
            onChange={(event) => setPageId(event.target.value)}
          >
            <option value="">
              {candidates.length
                ? `${candidates.length} schede compatibili…`
                : "Nessuna scheda compatibile"}
            </option>
            {candidates.map((page) => (
              <option value={page.id} key={page.id}>
                {candidateLabel(page)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedPage ? (
        <div className="guidedCatalogChoice">
          <div className="guidedCatalogChoiceHead">
            <div>
              <span>{selectedPage.catalogName}</span>
              <b>Pagina {selectedPage.page}</b>
            </div>
            <CheckCircle2 size={19} />
          </div>

          <div className="guidedCatalogValues">
            <CatalogValueSelect
              label="Codice articolo"
              value={article}
              values={selectedPage.codes}
              allowEmpty
              onChange={setArticle}
            />
            <CatalogValueSelect
              label="Famiglia utensile"
              value={family}
              values={selectedPage.families}
              allowEmpty
              onChange={setFamily}
            />
            <CatalogValueSelect
              label="Materiale"
              value={material}
              values={selectedPage.materials}
              allowEmpty
              onChange={setMaterial}
            />
            <CatalogValueSelect
              label="Vc"
              suffix="m/min"
              value={vc}
              values={selectedPage.parameters.vc}
              onChange={setVc}
            />
            <CatalogValueSelect
              label={feedKind === "fz" ? "fz" : "f"}
              suffix={
                feedKind === "fz" ? "mm/dente" : "mm/giro"
              }
              value={feed}
              values={selectedPage.parameters[feedKind]}
              onChange={setFeed}
            />
            <CatalogValueSelect
              label="ap"
              suffix="mm"
              value={ap}
              values={selectedPage.parameters.ap}
              allowEmpty
              onChange={setAp}
            />
            <CatalogValueSelect
              label="ae"
              suffix="mm"
              value={ae}
              values={selectedPage.parameters.ae}
              allowEmpty
              onChange={setAe}
            />
          </div>

          <p>
            Controlla che i valori selezionati appartengano alla stessa
            riga o colonna del materiale e della geometria scelti.
          </p>

          <button
            className="guidedCatalogApply"
            type="button"
            disabled={!canApply}
            onClick={applyCatalogCalculation}
          >
            <Calculator size={17} />
            {activeSelection?.pageId === selectedPage.id
              ? "Ricalcola con questi dati"
              : "Calcola con questi dati"}
          </button>
        </div>
      ) : (
        <div className="guidedCatalogWaiting">
          <Search size={19} />
          <span>
            {candidates.length
              ? "Scegli una scheda compatibile per vedere e applicare i parametri."
              : "Prova un altro codice, materiale o tipo di lavorazione."}
          </span>
        </div>
      )}
    </div>
  );
}

function CatalogValueSelect({
  allowEmpty = false,
  label,
  onChange,
  suffix = "",
  value,
  values,
}: {
  allowEmpty?: boolean;
  label: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
  values: string[];
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        value={value}
        disabled={!values.length && !allowEmpty}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowEmpty && <option value="">Non indicato</option>}
        {!values.length && !allowEmpty && (
          <option value="">Non rilevato</option>
        )}
        {values.map((item) => (
          <option value={item} key={item}>
            {item}
            {suffix ? ` ${suffix}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function candidateLabel(page: CatalogSearchPage) {
  const reference =
    page.codes[0] || page.families[0] || "Parametri rilevati";
  return `${page.catalogName} · pag. ${page.page} · ${reference}`;
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
