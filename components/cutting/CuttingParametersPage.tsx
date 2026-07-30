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

type CalculationMode = "base" | "tpc";

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
  const [calculationMode, setCalculationMode] =
    useState<CalculationMode>("base");
  const [diameter, setDiameter] = useState("10");
  const [teeth, setTeeth] = useState("2");
  const [cutLength, setCutLength] = useState("50");
  const [vc, setVc] = useState("");
  const [feed, setFeed] = useState("");
  const [ap, setAp] = useState("");
  const [ae, setAe] = useState("");
  const [engagementWidth, setEngagementWidth] = useState("");
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
    const catalogAe = selectedParameterSet.ae
      ? valueForCatalogProfile(selectedParameterSet.ae, profile)
      : 0;
    setAe(
      catalogAe
        ? formatEditableValue(catalogAe, 3)
        : "",
    );
    setEngagementWidth(
      catalogAe
        ? formatEditableValue(
            selectedParameterSet.aeUnit === "×D"
              ? catalogAe * positiveNumber(diameter)
              : catalogAe,
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
    const radialWidth = positiveNumber(engagementWidth);

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
    const radialRatio =
      diameterValue > 0
        ? Math.min(1, radialWidth / diameterValue)
        : 0;
    const engagementAngleRadians =
      radialRatio > 0
        ? Math.acos(Math.max(-1, Math.min(1, 1 - 2 * radialRatio)))
        : 0;
    const chipThickness =
      feedValue > 0 && engagementAngleRadians > 0
        ? feedValue *
          Math.sin(Math.min(engagementAngleRadians, Math.PI / 2))
        : 0;

    return {
      rpm,
      machineFeed,
      radialRatio,
      engagementAngle:
        (engagementAngleRadians * 180) / Math.PI,
      chipThickness,
      timeMinutes:
        machineFeed > 0 && length > 0 ? length / machineFeed : 0,
      rpmLimited: rpmLimit > 0 && requestedRpm > rpmLimit,
      feedLimited: feedLimit > 0 && requestedFeed > feedLimit,
    };
  }, [
    cutLength,
    diameter,
    engagementWidth,
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
  const tpcReady =
    operation === "milling" &&
    positiveNumber(diameter) > 0 &&
    positiveNumber(feed) > 0 &&
    positiveNumber(engagementWidth) > 0;
  const activeCalculationReady =
    operation === "milling" && calculationMode === "tpc"
      ? tpcReady
      : calculationReady;

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
    setCalculationMode("base");
    setQuery("");
    setToolId("");
    setMaterialId("");
    setParameterSetId("");
  }

  function resetCalculation() {
    setDiameter("");
    setTeeth(operation === "milling" ? "1" : "");
    setCutLength("");
    setVc("");
    setFeed("");
    setAp("");
    setAe("");
    setEngagementWidth("");
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
        <div className="panel cuttingInputs machineDataPanel">
          <div className="cuttingSectionTitle">
            <Calculator size={19} />
            <div>
              <b>Dati di lavorazione</b>
              <span>
                Seleziona l’articolo e inserisci i dati nelle schede.
              </span>
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

          <div className="cuttingSetupGrid">
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
          </div>

          {operation === "milling" && (
            <div className="calculationModeTabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={calculationMode === "base"}
                className={calculationMode === "base" ? "active" : ""}
                onClick={() => setCalculationMode("base")}
              >
                Fresatura
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={calculationMode === "tpc"}
                className={calculationMode === "tpc" ? "active" : ""}
                onClick={() => setCalculationMode("tpc")}
              >
                TPC · Spessore truciolo
              </button>
            </div>
          )}

          <div className="machineDataIntro">
            <div>
              <span>Inserimento dei dati di base</span>
              <b>
                {operation === "milling" && calculationMode === "tpc"
                  ? "Calcolo TPC"
                  : operationLabels[operation]}
              </b>
            </div>
            <small>I risultati si aggiornano automaticamente.</small>
          </div>

          {operation === "milling" && calculationMode === "tpc" ? (
            <div className="machineDataGrid">
              <MachineDataOutput
                label="Codice articolo"
                value={selectedTool?.article || "—"}
                meta={selectedTool?.family || "Nessun utensile selezionato"}
                wide
                article
              />
              <MachineDataField
                label="Diametro"
                symbol="D"
                value={diameter}
                unit="mm"
                onChange={setDiameter}
              />
              <MachineDataOutput
                label="Rapporto tra ae e D"
                value={
                  tpcReady
                    ? formatCuttingNumber(result.radialRatio, 3)
                    : "0"
                }
              />
              <MachineDataField
                label="Larghezza di fresatura"
                symbol="ae"
                value={engagementWidth}
                unit="mm"
                onChange={setEngagementWidth}
              />
              <MachineDataField
                label="Avanzamento al dente"
                symbol="fz"
                value={feed}
                unit="mm/d"
                onChange={setFeed}
              />
              <MachineDataOutput
                label="Angolo di attacco"
                symbol="φ"
                value={
                  tpcReady
                    ? formatCuttingNumber(result.engagementAngle, 1)
                    : "0"
                }
                unit="°"
              />
              <MachineDataOutput
                label="Spessore massimo truciolo"
                symbol="hmax"
                value={
                  tpcReady
                    ? formatCuttingNumber(result.chipThickness, 4)
                    : "0"
                }
                unit="mm"
              />
            </div>
          ) : (
            <div className="machineDataGrid">
              <MachineDataOutput
                label="Codice articolo"
                value={selectedTool?.article || "—"}
                meta={selectedTool?.family || "Nessun utensile selezionato"}
                wide
                article
              />
              <MachineDataField
                label={
                  operation === "turning"
                    ? "Diametro pezzo"
                    : "Diametro utensile"
                }
                symbol="D"
                value={diameter}
                unit="mm"
                onChange={setDiameter}
              />
              {operation === "milling" ? (
                <MachineDataField
                  label="Taglienti"
                  symbol="Z"
                  value={teeth}
                  unit=""
                  inputMode="numeric"
                  onChange={setTeeth}
                />
              ) : (
                <MachineDataOutput
                  label="Tipo di avanzamento"
                  value="Per giro"
                  meta="Valore f"
                />
              )}
              <MachineDataField
                label="Velocità di taglio"
                symbol="Vc"
                value={vc}
                unit="m/min"
                onChange={setVc}
                wide
              />
              <MachineDataField
                label={
                  feedMode === "per-tooth"
                    ? "Avanzamento al dente"
                    : "Avanzamento al giro"
                }
                symbol={feedMode === "per-tooth" ? "fz" : "f"}
                value={feed}
                unit={
                  feedMode === "per-tooth"
                    ? "mm/d"
                    : "mm/giro"
                }
                onChange={setFeed}
                wide
              />
              <MachineDataOutput
                label="Numero di giri"
                symbol="n"
                value={
                  calculationReady
                    ? formatCuttingNumber(Math.round(result.rpm), 0)
                    : "0"
                }
                unit="giri/min"
                wide
                result
              />
              <MachineDataOutput
                label="Velocità di avanzamento"
                symbol="Vf"
                value={
                  calculationReady
                    ? formatCuttingNumber(
                        Math.round(result.machineFeed),
                        0,
                      )
                    : "0"
                }
                unit="mm/min"
                wide
                result
              />
            </div>
          )}

          <button
            type="button"
            className="newCalculationButton"
            onClick={resetCalculation}
          >
            <Calculator size={18} />
            Effettua un nuovo calcolo
          </button>

          <details className="cuttingAdvanced">
            <summary>Parametri aggiuntivi</summary>
            <div className="cuttingFormGrid">
              <label>
                <span>Lunghezza lavorata (mm)</span>
                <input
                  inputMode="decimal"
                  value={cutLength}
                  onChange={(event) => setCutLength(event.target.value)}
                />
              </label>
              <label>
                <span>ap · Profondità ({apUnit})</span>
                <input
                  inputMode="decimal"
                  placeholder="Non indicato"
                  value={ap}
                  onChange={(event) => setAp(event.target.value)}
                />
              </label>
              <label>
                <span>ae · Catalogo ({aeUnit})</span>
                <input
                  inputMode="decimal"
                  placeholder="Non indicato"
                  value={ae}
                  onChange={(event) => setAe(event.target.value)}
                />
              </label>
            </div>
          </details>

          <details className="cuttingAdvanced machineLimits">
            <summary>
              <Gauge size={17} />
              Limiti macchina
            </summary>
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
          </details>
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

            {activeCalculationReady ? (
              <>
                <div className="resultGrid">
                  {operation === "milling" &&
                  calculationMode === "tpc" ? (
                    <>
                      <ResultCard
                        icon={<Ruler size={19} />}
                        label="Rapporto ae/D"
                        value={formatCuttingNumber(
                          result.radialRatio,
                          3,
                        )}
                      />
                      <ResultCard
                        icon={<RotateCw size={19} />}
                        label="Angolo φ"
                        value={`${formatCuttingNumber(
                          result.engagementAngle,
                          1,
                        )}°`}
                      />
                      <ResultCard
                        icon={<Gauge size={19} />}
                        label="Spessore hmax"
                        value={`${formatCuttingNumber(
                          result.chipThickness,
                          4,
                        )} mm`}
                      />
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                {calculationMode !== "tpc" &&
                  (result.rpmLimited || result.feedLimited) && (
                  <div className="limitWarning">
                    <AlertTriangle size={18} />
                    <span>
                      Il risultato è stato limitato ai valori massimi
                      della macchina. Verifica il carico truciolo.
                    </span>
                  </div>
                )}

                {operation === "milling" &&
                calculationMode === "tpc" ? (
                  <dl className="calculationDetails">
                    <div>
                      <dt>Rapporto radiale</dt>
                      <dd>ae / D</dd>
                    </div>
                    <div>
                      <dt>Angolo d’attacco</dt>
                      <dd>φ = arccos(1 − 2 × ae/D)</dd>
                    </div>
                    <div>
                      <dt>Spessore massimo</dt>
                      <dd>hmax = fz × sin(φ)</dd>
                    </div>
                    <div>
                      <dt>Codice articolo</dt>
                      <dd>{selectedTool?.article || "—"}</dd>
                    </div>
                  </dl>
                ) : (
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
                      <dt>Codice articolo</dt>
                      <dd>{selectedTool?.article || "—"}</dd>
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
                )}
              </>
            ) : (
              <div className="resultAwaiting">
                <Calculator size={25} />
                <b>Completa i dati del calcolo</b>
                <span>
                  {operation === "milling" &&
                  calculationMode === "tpc"
                    ? "Inserisci diametro, larghezza ae e avanzamento fz."
                    : "Inserisci diametro, velocità di taglio e avanzamento."}
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

type MachineDataFieldProps = {
  label: string;
  symbol?: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
  inputMode?: "decimal" | "numeric";
  wide?: boolean;
};

function MachineDataField({
  label,
  symbol,
  value,
  unit,
  onChange,
  inputMode = "decimal",
  wide = false,
}: MachineDataFieldProps) {
  return (
    <label className={`machineDataCard ${wide ? "wide" : ""}`}>
      <span>
        {label}
        {symbol ? ` [${symbol}]` : ""}
      </span>
      <div>
        <input
          aria-label={`${label}${symbol ? ` ${symbol}` : ""}`}
          inputMode={inputMode}
          placeholder="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {unit && <b>{unit}</b>}
      </div>
    </label>
  );
}

type MachineDataOutputProps = {
  label: string;
  value: string;
  symbol?: string;
  unit?: string;
  meta?: string;
  wide?: boolean;
  article?: boolean;
  result?: boolean;
};

function MachineDataOutput({
  label,
  value,
  symbol,
  unit = "",
  meta,
  wide = false,
  article = false,
  result = false,
}: MachineDataOutputProps) {
  return (
    <div
      className={[
        "machineDataCard",
        "output",
        wide ? "wide" : "",
        article ? "article" : "",
        result ? "calculated" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>
        {label}
        {symbol ? ` [${symbol}]` : ""}
      </span>
      <div>
        <strong>{value}</strong>
        {unit && <b>{unit}</b>}
      </div>
      {meta && <small>{meta}</small>}
    </div>
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
