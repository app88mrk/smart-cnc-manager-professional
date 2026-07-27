"use client";

import {
  ChangeEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BookOpen,
  CheckCircle2,
  FileSearch,
  FileUp,
  Library,
  LoaderCircle,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  CatalogImportCancelledError,
  CatalogImportProgress,
  ImportedCatalog,
  catalogPageExcerpt,
  deleteImportedCatalog,
  extractCatalogFromFile,
  formatCatalogFileSize,
  loadImportedCatalogs,
  saveImportedCatalog,
  searchCatalogPages,
} from "@/lib/catalogImport";

const MAX_VISIBLE_RESULTS = 80;
const quickSearches = [
  "CNMG",
  "DNMG",
  "punte HSS",
  "frese HM",
  "Vc",
  "avanzamento",
];

export default function CatalogManager() {
  const fileInput = useRef<HTMLInputElement>(null);
  const cancelRequested = useRef(false);
  const [catalogs, setCatalogs] = useState<ImportedCatalog[]>(
    [],
  );
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [progress, setProgress] =
    useState<CatalogImportProgress | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [catalogId, setCatalogId] = useState("all");
  const [pendingDelete, setPendingDelete] = useState("");

  useEffect(() => {
    let active = true;

    loadImportedCatalogs()
      .then((storedCatalogs) => {
        if (active) {
          setCatalogs(storedCatalogs);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "L’archivio locale dei cataloghi non è disponibile in questo browser.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const results = useMemo(
    () =>
      searchCatalogPages(catalogs, deferredQuery, catalogId),
    [catalogId, catalogs, deferredQuery],
  );
  const visibleResults = results.slice(0, MAX_VISIBLE_RESULTS);
  const totals = useMemo(
    () =>
      catalogs.reduce(
        (summary, catalog) => ({
          pages: summary.pages + catalog.pageCount,
          parameterPages:
            summary.parameterPages + catalog.parameterPageCount,
          codes: summary.codes + catalog.codeCount,
        }),
        { pages: 0, parameterPages: 0, codes: 0 },
      ),
    [catalogs],
  );

  async function importCatalogs(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = [...(event.target.files || [])].filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
    );
    event.target.value = "";

    if (!files.length || busy) {
      return;
    }

    setBusy(true);
    setExpanded(true);
    setError("");
    setFeedback("");
    cancelRequested.current = false;
    let completed = 0;

    try {
      for (const file of files) {
        const catalog = await extractCatalogFromFile(file, {
          onProgress: setProgress,
          shouldCancel: () => cancelRequested.current,
        });

        if (!catalog.textPageCount) {
          throw new Error(
            `“${file.name}” non contiene testo selezionabile. Serve una versione con OCR.`,
          );
        }

        await saveImportedCatalog(catalog);
        setCatalogs((current) => [
          catalog,
          ...current.filter((item) => item.id !== catalog.id),
        ]);
        completed += 1;
      }

      navigator.storage?.persist?.().catch(() => false);
      setFeedback(
        `${completed} ${
          completed === 1 ? "catalogo indicizzato" : "cataloghi indicizzati"
        } e pronto per la ricerca.`,
      );
    } catch (importError) {
      if (importError instanceof CatalogImportCancelledError) {
        setFeedback("Importazione annullata.");
      } else {
        setError(
          importError instanceof Error
            ? importError.message
            : "Importazione del catalogo non riuscita.",
        );
      }
    } finally {
      setBusy(false);
      setProgress(null);
      cancelRequested.current = false;
    }
  }

  async function removeCatalog(catalog: ImportedCatalog) {
    if (pendingDelete !== catalog.id) {
      setPendingDelete(catalog.id);
      return;
    }

    try {
      await deleteImportedCatalog(catalog.id);
      setCatalogs((current) =>
        current.filter((item) => item.id !== catalog.id),
      );
      if (catalogId === catalog.id) {
        setCatalogId("all");
      }
      setPendingDelete("");
      setFeedback(`Catalogo “${catalog.name}” eliminato.`);
      setError("");
    } catch {
      setError("Non è stato possibile eliminare il catalogo.");
    }
  }

  return (
    <section className="panel catalogManager">
      <div className="catalogManagerHead">
        <div className="cuttingSectionTitle">
          <Library size={20} />
          <div>
            <b>Archivio cataloghi</b>
            <span>
              Carica PDF e cerca automaticamente codici e parametri.
            </span>
          </div>
        </div>

        <div className="catalogManagerActions">
          {busy && (
            <button
              className="catalogCancel"
              type="button"
              onClick={() => {
                cancelRequested.current = true;
              }}
            >
              <X size={16} />
              Annulla
            </button>
          )}
          <button
            className="catalogToggle"
            type="button"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Nascondi archivio" : "Mostra archivio"}
          </button>
          <button
            className="primary"
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {busy ? (
              <LoaderCircle className="spinner" size={17} />
            ) : (
              <FileUp size={17} />
            )}
            {busy ? "Indicizzazione…" : "Carica catalogo PDF"}
          </button>
          <input
            ref={fileInput}
            className="catalogFileInput"
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={importCatalogs}
          />
        </div>
      </div>

      {busy && progress && (
        <div className="catalogProgress">
          <div>
            <span>{progress.fileName}</span>
            <b>
              Pagina {progress.page} di {progress.totalPages}
            </b>
          </div>
          <progress
            value={progress.page}
            max={progress.totalPages}
          />
          <small>
            I cataloghi grandi possono richiedere alcuni minuti. Puoi
            continuare a usare l’app dopo il completamento.
          </small>
        </div>
      )}

      {error && <div className="catalogMessage error">{error}</div>}
      {feedback && (
        <div className="catalogMessage success">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {expanded && (
        <>
          {!ready ? (
            <div className="catalogLoading">
              <LoaderCircle className="spinner" size={20} />
              Apertura archivio locale…
            </div>
          ) : catalogs.length === 0 ? (
            <div className="catalogEmpty">
              <FileSearch size={29} />
              <div>
                <b>Nessun catalogo caricato</b>
                <span>
                  Premi “Carica catalogo PDF”. L’indice resta salvato
                  in questo browser.
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="catalogStats">
                <div>
                  <span>Cataloghi</span>
                  <b>{catalogs.length}</b>
                </div>
                <div>
                  <span>Pagine</span>
                  <b>{totals.pages}</b>
                </div>
                <div>
                  <span>Pagine con parametri</span>
                  <b>{totals.parameterPages}</b>
                </div>
                <div>
                  <span>Codici rilevati</span>
                  <b>{totals.codes}</b>
                </div>
              </div>

              <div className="catalogCards">
                {catalogs.map((catalog) => (
                  <article className="catalogCard" key={catalog.id}>
                    <BookOpen size={18} />
                    <div>
                      <b>{catalog.name}</b>
                      <span>
                        {formatCatalogFileSize(catalog.fileSize)} ·{" "}
                        {catalog.pageCount} pagine ·{" "}
                        {catalog.parameterPageCount} con parametri
                      </span>
                    </div>
                    <button
                      className={
                        pendingDelete === catalog.id
                          ? "confirm"
                          : ""
                      }
                      type="button"
                      title={
                        pendingDelete === catalog.id
                          ? "Conferma eliminazione"
                          : "Elimina catalogo"
                      }
                      onClick={() => removeCatalog(catalog)}
                    >
                      <Trash2 size={15} />
                      {pendingDelete === catalog.id && "Conferma"}
                    </button>
                  </article>
                ))}
              </div>

              <div className="catalogSearchBar">
                <label>
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(event) =>
                      setQuery(event.target.value)
                    }
                    placeholder="Cerca codice, CNMG, punta HSS, Vc, materiale…"
                  />
                  {query && (
                    <button
                      type="button"
                      title="Cancella ricerca"
                      onClick={() => setQuery("")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>
                <select
                  value={catalogId}
                  onChange={(event) =>
                    setCatalogId(event.target.value)
                  }
                >
                  <option value="all">Tutti i cataloghi</option>
                  {catalogs.map((catalog) => (
                    <option value={catalog.id} key={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="catalogQuickSearches">
                {quickSearches.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setQuery(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="catalogResultHead">
                <b>
                  {results.length}{" "}
                  {results.length === 1
                    ? "pagina trovata"
                    : "pagine trovate"}
                </b>
                {results.length > MAX_VISIBLE_RESULTS && (
                  <span>
                    Mostrate le prime {MAX_VISIBLE_RESULTS}: affina la
                    ricerca.
                  </span>
                )}
              </div>

              <div className="catalogResults">
                {visibleResults.map((page) => (
                  <article
                    className="catalogResultCard"
                    key={page.id}
                  >
                    <div className="catalogResultTop">
                      <div>
                        <span>{page.catalogName}</span>
                        <b>Pagina {page.page}</b>
                      </div>
                      <div className="catalogResultTags">
                        {page.families.slice(0, 4).map((family) => (
                          <span key={family}>{family}</span>
                        ))}
                        {page.brands.slice(0, 2).map((brand) => (
                          <span key={brand}>{brand}</span>
                        ))}
                      </div>
                    </div>

                    {page.codes.length > 0 && (
                      <div className="catalogCodes">
                        <b>Codici</b>
                        <span>{page.codes.slice(0, 10).join(" · ")}</span>
                      </div>
                    )}

                    <div className="catalogParameterGrid">
                      <ParameterValues
                        label="Vc"
                        values={page.parameters.vc}
                        suffix="m/min"
                      />
                      <ParameterValues
                        label="f"
                        values={page.parameters.feed}
                        suffix="mm/giro"
                      />
                      <ParameterValues
                        label="fz"
                        values={page.parameters.fz}
                        suffix="mm/dente"
                      />
                      <ParameterValues
                        label="ap"
                        values={page.parameters.ap}
                        suffix="mm"
                      />
                      <ParameterValues
                        label="ae"
                        values={page.parameters.ae}
                        suffix="mm"
                      />
                    </div>

                    <p>{catalogPageExcerpt(page, deferredQuery)}</p>
                    <small>
                      Valori rilevati sulla pagina: verificare la
                      colonna associata a materiale, grado e geometria.
                    </small>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function ParameterValues({
  label,
  values,
  suffix,
}: {
  label: string;
  values: string[];
  suffix: string;
}) {
  if (!values.length) {
    return null;
  }

  return (
    <div>
      <b>{label}</b>
      <span>
        {values.slice(0, 8).join(" · ")} {suffix}
      </span>
    </div>
  );
}
