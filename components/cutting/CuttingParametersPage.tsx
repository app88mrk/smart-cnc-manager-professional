"use client";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  Gauge,
  RotateCw,
  Ruler,
  Search,
  Timer,
} from "lucide-react";

import CatalogManager from "@/components/cutting/CatalogManager";
import {
  catalogToolsFromCatalogs,
  type CatalogParameterSet,
  type CatalogToolRecord,
  type ImportedCatalog,
} from "@/lib/catalogImport";
import {
  type CuttingOperation,
  type CuttingProfile,
  formatCuttingNumber,
  operationLabels,
  profileLabels,
} from "@/lib/cuttingParameters";
import type { Machine } from "@/types";

type CuttingParametersPageProps = {
  machines: Machine[];
};

const materialNames: Record<string, string> = {
  P: "P · Acciai",
  M: "M · Acciai inossidabili",
  K: "K · Ghise",
  N: "N · Materiali non ferrosi",
  S: "S · Superleghe e titanio",
  H: "H · Materiali temprati",
};

export default function CuttingParametersPage({
  machines,
}: CuttingParametersPageProps) {
  const [catalogs, setCatalogs] = useState<ImportedCatalog[]>([]);
  const [catalogId, setCatalogId] = useState("all");
  const [operation, setOperation] =
    useState<CuttingOperation>("drilling");
  const [query, setQuery] = useState("");
  const [toolId, setToolId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [parameterSetId, setParameterSetId] = useState("");
  const [profile, setProfile] =
    useState<CuttingProfile>("conservative");
  const [diameter, setDiameter] = useState("10");
  const [teeth, setTeeth] = useState("2");
  const [cutLength, setCutLength] = useState("50");
  const [vc, setVc] = useState("");
  const [feed, setFeed] = useState("");
  const [ap, setAp] = useState("");
  const [ae, setAe] = useState("");
  const [machineId, setMachineId] = useState("");
  const [maxRpm, setMaxRpm] = useState("");
  const [maxFeed, setMaxFeed] = useState("");

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
  const visibleTools = useMemo(() => {
    const tokens = foldText(query).split(/\s+/).filter(Boolean);

    return operationTools
      .filter((tool) =>
        tokens.every((token) => tool.searchText.includes(token)),
      )
      .sort(
        (left, right) =>
          left.article.localeCompare(right.article, "it", {
            numeric: true,
          }) || left.page - right.page,
      );
  }, [operationTools, query]);

  const selectedTool =
    visibleTools.find((tool) => tool.id === toolId) ||
    visibleTools[0] ||
    null;
  const materialOptions = useMemo(
    () => materialsForTool(selectedTool),
    [selectedTool],
  );
  const parameterSets = useMemo(
    () =>
      selectedTool
        ? parameterSetsForMaterial(selectedTool, materialId)
        : [],
    [materialId, selectedTool],
  );
  const selectedParameterSet =
    parameterSets.find((set) => set.id === parameterSetId) ||
    parameterSets[0] ||
    null;

  useEffect(() => {
    if (!visibleTools.some((tool) => tool.id === toolId)) {
      setToolId(visibleTools[0]?.id || "");
    }
  }, [toolId, visibleTools]);

  useEffect(() => {
    if (!materialOptions.includes(materialId)) {
      setMaterialId(materialOptions[0] || "");
    }
  }, [materialId, materialOptions]);

  useEffect(() => {
    if (
      !parameterSets.some((parameterSet) => parameterSet.id === parameterSetId)
    ) {
      setParameterSetId(parameterSets[0]?.id || "");
    }
  }, [parameterSetId, parameterSets]);

  useEffect(() => {
    if (!selectedTool) {
      return;
    }

    if (selectedTool.diameter) {
      setDiameter(selectedTool.diameter);
    }
    if (selectedTool.teeth) {
      setTeeth(selectedTool.teeth);
    }
  }, [selectedTool]);

  useEffect(() => {
    if (!selectedParameterSet) {
      setVc("");
      setFeed("");
      setAp("");
      setAe("");
      return;
    }

    setVc(
      formatEditableValue(
        valueForCatalogProfile(selectedParameterSet.vc, profile),
        2,
      ),
    );
    setFeed(
      formatEditableValue(
        valueForCatalogProfile(selectedParameterSet.feed, profile),
        3,
      ),
    );
    setAp(
      selectedParameterSet.ap
        ? formatEditableValue(
            valueForCatalogProfile(selectedParameterSet.ap, profile),
            3,
          )
        : "",
    );
    setAe(
      selectedParameterSet.ae
        ? formatEditableValue(
            valueForCatalogProfile(selectedParameterSet.ae, profile),
            3,
          )
        : "",
    );
  }, [profile, selectedParameterSet]);

  const feedMode =
    selectedParameterSet?.feedKind === "fz"
      ? "per-tooth"
      : "per-revolution";
  const apUnit = selectedParameterSet?.apUnit || "mm";
  const aeUnit = selectedParameterSet?.aeUnit || "mm";
  const sourcePage =
    selectedParameterSet?.sourcePage || selectedTool?.page || 0;

  const result = useMemo(() => {
    const diameterValue = positiveNumber(diameter);
    const vcValue = positiveNumber(vc);
    const feedValue = positiveNumber(feed);
    const teethValue = Math.max(1, positiveNumber(teeth));
    const rpmLimit = positiveNumber(maxRpm);
    const feedLimit = positiveNumber(maxFeed);

    const requestedRpm =
      diameterValue && vcValue
        ? (1000 * vcValue) / (Math.PI * diameterValue)
        : 0;
    const rpm =
      rpmLimit > 0
        ? Math.min(requestedRpm, rpmLimit)
        : requestedRpm;
    const requestedFeed =
      feedMode === "per-tooth"
        ? rpm * teethValue * feedValue
        : rpm * feedValue;
    const machineFeed =
      feedLimit > 0
        ? Math.min(requestedFeed, feedLimit)
        : requestedFeed;
    const length = positiveNumber(cutLength);

    return {
      rpm,
      machineFeed,
      timeMinutes:
        machineFeed > 0 && length > 0 ? length / machineFeed : 0,
      rpmLimited: rpmLimit > 0 && requestedRpm > rpmLimit,
      feedLimited: feedLimit > 0 && requestedFeed > feedLimit,
    };
  }, [
    cutLength,
    diameter,
    feed,
    feedMode,
    maxFeed,
    maxRpm,
    teeth,
    vc,
  ]);

  const calculationReady =
    Boolean(selectedTool && selectedParameterSet) &&
    positiveNumber(diameter) > 0 &&
    positiveNumber(vc) > 0 &&
    positiveNumber(feed) > 0 &&
    (operation !== "milling" || positiveNumber(teeth) > 0);

  function selectMachine(value: string) {
    setMachineId(value);
    const machine = machines.find((item) => item.id === value);
    const parsedRpm = machine
      ? parseSpindleRpm(machine.spindle)
      : null;

    if (parsedRpm) {
      setMaxRpm(String(parsedRpm));
    }
  }

  function changeOperation(nextOperation: CuttingOperation) {
    setOperation(nextOperation);
    setQuery("");
    setToolId("");
    setMaterialId("");
    setParameterSetId("");
  }

  function changeCatalog(nextCatalogId: string) {
    setCatalogId(nextCatalogId);
    setToolId("");
    setMaterialId("");
    setParameterSetId("");
  }

  return (
    <>
      <div className="pageHead cuttingHead">
        <div>
          <p>STEP 12 · CALCOLO PROFESSIONALE</p>
          <h1>Parametri di taglio</h1>
          <span>
            Scegli l’utensile dalla lista del catalogo e carica
            automaticamente Vc, avanzamento, ap e ae.
          </span>
        </div>

        <div className="catalogBadge">
          <BookOpen size={18} />
          <div>
            <b>{selectedTool?.catalogName || "Catalogo 56"}</b>
            <span>
              {allTools.length
                ? `${allTools.length} utensili utilizzabili`
                : "Caricamento lista utensili…"}
            </span>
          </div>
        </div>
      </div>

      <section className="cuttingLayout" id="cutting-calculator">
        <div className="panel cuttingInputs">
          <div className="cuttingSectionTitle">
            <Calculator size={19} />
            <div>
              <b>Dati di lavorazione</b>
              <span>Scegli lavorazione, utensile e materiale.</span>
            </div>
          </div>

          <div className="operationTabs" role="tablist">
            {(
              Object.keys(operationLabels) as CuttingOperation[]
            ).map((item) => (
              <button
                type="button"
                role="tab"
                aria-selected={operation === item}
                key={item}
                className={operation === item ? "active" : ""}
                onClick={() => changeOperation(item)}
              >
                {operationLabels[item]}
              </button>
            ))}
          </div>

          <div className="cuttingFormGrid">
            <label className="full">
              <span>Catalogo</span>
              <select
                value={catalogId}
                onChange={(event) => changeCatalog(event.target.value)}
              >
                <option value="all">Tutti i cataloghi disponibili</option>
                {catalogs.map((catalog) => (
                  <option value={catalog.id} key={catalog.id}>
                    {catalog.name} · {catalog.toolCount || 0} utensili
                  </option>
                ))}
              </select>
            </label>

            <label className="full catalogSimpleSearch">
              <span>Cerca nella lista</span>
              <div>
                <Search size={16} />
                <input
                  value={query}
                  placeholder="Codice, modello, DNMG, punta HSS, fresa HM…"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setToolId("");
                  }}
                />
              </div>
              <small>
                {visibleTools.length}{" "}
                {visibleTools.length === 1
                  ? "utensile disponibile"
                  : "utensili disponibili"}
              </small>
            </label>

            <label className="full">
              <span>Utensile dal catalogo</span>
              <select
                value={selectedTool?.id || ""}
                disabled={!visibleTools.length}
                onChange={(event) => {
                  setToolId(event.target.value);
                  setMaterialId("");
                  setParameterSetId("");
                }}
              >
                {!visibleTools.length && (
                  <option value="">
                    Nessun utensile trovato con questi filtri
                  </option>
                )}
                {visibleTools.map((tool) => (
                  <option value={tool.id} key={tool.id}>
                    {toolOptionLabel(tool)}
                  </option>
                ))}
              </select>
            </label>

            <label className="full">
              <span>Materiale da lavorare</span>
              <select
                value={materialId}
                disabled={!materialOptions.length}
                onChange={(event) => {
                  setMaterialId(event.target.value);
                  setParameterSetId("");
                }}
              >
                {!materialOptions.length && (
                  <option value="">Materiale non indicato</option>
                )}
                {materialOptions.map((material) => (
                  <option value={material} key={material}>
                    {materialLabel(material)}
                  </option>
                ))}
              </select>
            </label>

            {parameterSets.length > 1 && (
              <label className="full">
                <span>Set parametri e pagina fonte</span>
                <select
                  value={selectedParameterSet?.id || ""}
                  onChange={(event) =>
                    setParameterSetId(event.target.value)
                  }
                >
                  {parameterSets.map((parameterSet, index) => (
                    <option
                      value={parameterSet.id}
                      key={parameterSet.id}
                    >
                      {index + 1}. {parameterSet.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <span>
                {operation === "turning"
                  ? "Diametro pezzo"
                  : "Diametro utensile"}{" "}
                (mm)
              </span>
              <input
                inputMode="decimal"
                value={diameter}
                onChange={(event) => setDiameter(event.target.value)}
              />
            </label>

            {operation === "milling" && (
              <label>
                <span>Taglienti effettivi (Z)</span>
                <input
                  inputMode="numeric"
                  value={teeth}
                  onChange={(event) => setTeeth(event.target.value)}
                />
              </label>
            )}

            <label>
              <span>Lunghezza lavorata (mm)</span>
              <input
                inputMode="decimal"
                value={cutLength}
                onChange={(event) => setCutLength(event.target.value)}
              />
            </label>

            <label>
              <span>Profilo</span>
              <select
                value={profile}
                onChange={(event) =>
                  setProfile(event.target.value as CuttingProfile)
                }
              >
                {(
                  Object.keys(profileLabels) as CuttingProfile[]
                ).map((item) => (
                  <option key={item} value={item}>
                    {profileLabels[item]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Vc (m/min)</span>
              <input
                inputMode="decimal"
                value={vc}
                onChange={(event) => setVc(event.target.value)}
              />
            </label>

            <label>
              <span>
                {feedMode === "per-tooth"
                  ? "fz (mm/dente)"
                  : "f (mm/giro)"}
              </span>
              <input
                inputMode="decimal"
                value={feed}
                onChange={(event) => setFeed(event.target.value)}
              />
            </label>

            <label>
              <span>ap · Profondità di taglio ({apUnit})</span>
              <input
                inputMode="decimal"
                placeholder="Non indicato"
                value={ap}
                onChange={(event) => setAp(event.target.value)}
              />
            </label>

            <label>
              <span>ae · Impegno radiale ({aeUnit})</span>
              <input
                inputMode="decimal"
                placeholder="Non indicato"
                value={ae}
                onChange={(event) => setAe(event.target.value)}
              />
            </label>
          </div>

          <div className="machineLimits">
            <div className="cuttingSectionTitle compact">
              <Gauge size={18} />
              <div>
                <b>Limiti macchina</b>
                <span>Facoltativi, usati per gli avvisi.</span>
              </div>
            </div>

            <div className="cuttingFormGrid">
              <label className="full">
                <span>Macchina</span>
                <select
                  value={machineId}
                  onChange={(event) =>
                    selectMachine(event.target.value)
                  }
                >
                  <option value="">Nessuna macchina selezionata</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.brand} {machine.model}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Giri massimi (rpm)</span>
                <input
                  inputMode="numeric"
                  placeholder="es. 12000"
                  value={maxRpm}
                  onChange={(event) => setMaxRpm(event.target.value)}
                />
              </label>
              <label>
                <span>Avanzamento massimo (mm/min)</span>
                <input
                  inputMode="numeric"
                  placeholder="es. 8000"
                  value={maxFeed}
                  onChange={(event) => setMaxFeed(event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="cuttingResults">
          <section className="panel resultPanel">
            <div className="cuttingSectionTitle">
              <CheckCircle2 size={19} />
              <div>
                <b>Risultato calcolo</b>
                <span>Valori arrotondati per l’impostazione.</span>
              </div>
            </div>

            {calculationReady ? (
              <>
                <div className="resultGrid">
                  <ResultCard
                    icon={<RotateCw size={19} />}
                    label="Mandrino"
                    value={`${formatCuttingNumber(
                      Math.round(result.rpm),
                      0,
                    )} rpm`}
                    warning={result.rpmLimited}
                  />
                  <ResultCard
                    icon={<Ruler size={19} />}
                    label="Avanzamento"
                    value={`${formatCuttingNumber(
                      Math.round(result.machineFeed),
                      0,
                    )} mm/min`}
                    warning={result.feedLimited}
                  />
                  <ResultCard
                    icon={<Timer size={19} />}
                    label="Tempo stimato"
                    value={formatTime(result.timeMinutes)}
                  />
                </div>

                {(result.rpmLimited || result.feedLimited) && (
                  <div className="limitWarning">
                    <AlertTriangle size={18} />
                    <span>
                      Il risultato è stato limitato ai valori massimi
                      della macchina. Verifica il carico truciolo.
                    </span>
                  </div>
                )}

                <dl className="calculationDetails">
                  <div>
                    <dt>Formula giri</dt>
                    <dd>n = (1.000 × Vc) / (π × D)</dd>
                  </div>
                  <div>
                    <dt>Formula avanzamento</dt>
                    <dd>
                      {feedMode === "per-tooth"
                        ? "Vf = n × Z × fz"
                        : "Vf = n × f"}
                    </dd>
                  </div>
                  <div>
                    <dt>Intervallo catalogo Vc</dt>
                    <dd>
                      {selectedParameterSet?.vc
                        ? `${selectedParameterSet.vc} m/min`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Profondità ap</dt>
                    <dd>{ap ? `${ap} ${apUnit}` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Impegno ae</dt>
                    <dd>{ae ? `${ae} ${aeUnit}` : "—"}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="resultAwaiting">
                <Calculator size={25} />
                <b>Scegli un utensile dalla lista</b>
                <span>
                  Inserisci diametro e lunghezza per ottenere giri,
                  avanzamento e tempo stimato.
                </span>
              </div>
            )}
          </section>

          {selectedTool && selectedParameterSet ? (
            <section className="panel sourcePanel">
              <div className="sourceTop">
                <div>
                  <span>{selectedTool.family}</span>
                  <h2>{selectedTool.article}</h2>
                </div>
                <b>Pag. {sourcePage}</b>
              </div>

              <div className="sourceTags">
                <span>{selectedTool.category}</span>
                {selectedTool.toolMaterial && (
                  <span>{selectedTool.toolMaterial}</span>
                )}
                {selectedTool.radius && (
                  <span>R {selectedTool.radius} mm</span>
                )}
                {materialId && (
                  <span>{materialLabel(materialId)}</span>
                )}
              </div>

              <div className="catalogParameterSetSummary">
                <b>Parametri selezionati</b>
                <span>
                  Vc {selectedParameterSet.vc} m/min ·{" "}
                  {selectedParameterSet.feedKind === "fz"
                    ? "fz"
                    : "f"}{" "}
                  {selectedParameterSet.feed}{" "}
                  {selectedParameterSet.feedUnit || ""}
                </span>
                {(selectedParameterSet.ap ||
                  selectedParameterSet.ae) && (
                  <span>
                    {selectedParameterSet.ap
                      ? `ap ${selectedParameterSet.ap} ${
                          selectedParameterSet.apUnit || "mm"
                        }`
                      : ""}
                    {selectedParameterSet.ap &&
                    selectedParameterSet.ae
                      ? " · "
                      : ""}
                    {selectedParameterSet.ae
                      ? `ae ${selectedParameterSet.ae} ${
                          selectedParameterSet.aeUnit || "mm"
                        }`
                      : ""}
                  </span>
                )}
              </div>

              <p>{selectedTool.excerpt}</p>
              <small>
                Fonte: {selectedTool.catalogName}, pagina {sourcePage}.
              </small>
            </section>
          ) : (
            <section className="panel sourcePanel waitingSourcePanel">
              <div className="sourceTop">
                <div>
                  <span>Catalogo</span>
                  <h2>Nessun utensile selezionato</h2>
                </div>
              </div>
            </section>
          )}

          <div className="cuttingDisclaimer">
            <AlertTriangle size={18} />
            <span>
              Valori iniziali del costruttore: partire dal profilo
              prudente e correggere in base a serraggio, sporgenza,
              refrigerazione, stabilità e potenza disponibili.
            </span>
          </div>
        </div>
      </section>

      <CatalogManager
        activeCatalogId={selectedTool?.catalogId}
        activePageId={
          selectedParameterSet?.sourcePageId || selectedTool?.pageId
        }
        catalogFilterId={
          catalogId === "all" ? undefined : catalogId
        }
        enableCalculation={false}
        initiallyExpanded={false}
        onCatalogsChange={setCatalogs}
        onClearCalculation={() => undefined}
        onUseForCalculation={() => undefined}
      />
    </>
  );
}

type ResultCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  warning?: boolean;
};

function ResultCard({
  icon,
  label,
  value,
  warning = false,
}: ResultCardProps) {
  return (
    <div className={`resultCard ${warning ? "warning" : ""}`}>
      <i>{icon}</i>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function materialsForTool(tool: CatalogToolRecord | null) {
  if (!tool) {
    return [] as string[];
  }

  return Array.from(
    new Set([
      ...tool.materials,
      ...tool.parameterSets
        .map((parameterSet) => parameterSet.material)
        .filter(Boolean),
    ]),
  ).sort();
}

function parameterSetsForMaterial(
  tool: CatalogToolRecord,
  material: string,
) {
  if (!material) {
    return tool.parameterSets;
  }

  const matching = tool.parameterSets.filter((parameterSet) =>
    parameterSetSupportsMaterial(parameterSet, material),
  );
  return matching.length ? matching : tool.parameterSets;
}

function parameterSetSupportsMaterial(
  parameterSet: CatalogParameterSet,
  material: string,
) {
  if (parameterSet.material) {
    return parameterSet.material === material;
  }

  const isoMatch = parameterSet.label.match(
    /\bISO\s+([NPHMSK](?:\s*,\s*[NPHMSK])*)/i,
  );
  if (!isoMatch) {
    return true;
  }

  return isoMatch[1]
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .includes(material.toUpperCase());
}

function toolOptionLabel(tool: CatalogToolRecord) {
  return [
    tool.article,
    tool.family && tool.family !== tool.article ? tool.family : "",
    tool.radius ? `R ${tool.radius}` : "",
    `pag. ${tool.page}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function materialLabel(material: string) {
  return materialNames[material] || material;
}

function valueForCatalogProfile(
  value: string,
  profile: CuttingProfile,
) {
  const numbers = [
    ...value.replace(/,/g, ".").matchAll(/\d+(?:\.\d+)?/g),
  ]
    .map((match) => Number(match[0]))
    .filter((item) => Number.isFinite(item));

  if (!numbers.length) {
    return 0;
  }
  if (numbers.length === 1) {
    return numbers[0];
  }

  const minimum = Math.min(numbers[0], numbers[1]);
  const maximum = Math.max(numbers[0], numbers[1]);
  const share =
    profile === "conservative"
      ? 0
      : profile === "standard"
        ? 0.5
        : 1;

  return minimum + (maximum - minimum) * share;
}

function formatEditableValue(value: number, digits: number) {
  const multiplier = 10 ** digits;
  return String(Math.round(value * multiplier) / multiplier);
}

function positiveNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseSpindleRpm(value: string) {
  const match = value.match(/\d[\d.\s]*/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0].replace(/[^\d]/g, ""));
  return parsed > 0 ? parsed : null;
}

function formatTime(minutes: number) {
  if (!minutes || !Number.isFinite(minutes)) {
    return "—";
  }

  if (minutes < 1) {
    return `${formatCuttingNumber(minutes * 60, 1)} sec`;
  }

  return `${formatCuttingNumber(minutes, 2)} min`;
}

function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
