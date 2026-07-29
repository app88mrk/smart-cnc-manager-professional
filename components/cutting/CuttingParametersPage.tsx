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
  Timer,
} from "lucide-react";

import {
  CuttingOperation,
  CuttingProfile,
  cuttingPresets,
  formatCuttingNumber,
  operationLabels,
  profileLabels,
} from "@/lib/cuttingParameters";
import { Machine } from "@/types";
import CatalogManager from "@/components/cutting/CatalogManager";
import CatalogGuidedCalculator from "@/components/cutting/CatalogGuidedCalculator";
import type {
  CatalogCalculationSelection,
  ImportedCatalog,
} from "@/lib/catalogImport";

type CuttingParametersPageProps = {
  machines: Machine[];
};

type CalculationSource = "catalog" | "manual";

export default function CuttingParametersPage({
  machines,
}: CuttingParametersPageProps) {
  const [sourceMode, setSourceMode] =
    useState<CalculationSource>("catalog");
  const [availableCatalogs, setAvailableCatalogs] = useState<
    ImportedCatalog[]
  >([]);
  const [operation, setOperation] =
    useState<CuttingOperation>("drilling");
  const operationPresets = useMemo(
    () =>
      cuttingPresets.filter(
        (preset) => preset.operation === operation,
      ),
    [operation],
  );
  const turningShapes = useMemo(
    () =>
      Array.from(
        new Set(
          operationPresets
            .map((preset) => preset.insertShape)
            .filter((shape): shape is string => Boolean(shape)),
        ),
      ),
    [operationPresets],
  );
  const [insertShape, setInsertShape] = useState("");
  const [profile, setProfile] =
    useState<CuttingProfile>("conservative");
  const [diameter, setDiameter] = useState("");
  const [teeth, setTeeth] = useState("");
  const [cutLength, setCutLength] = useState("");
  const [vc, setVc] = useState("");
  const [feed, setFeed] = useState("");
  const [ap, setAp] = useState("");
  const [ae, setAe] = useState("");
  const [catalogSelection, setCatalogSelection] =
    useState<CatalogCalculationSelection | null>(null);
  const [machineId, setMachineId] = useState("");
  const [maxRpm, setMaxRpm] = useState("");
  const [maxFeed, setMaxFeed] = useState("");

  const effectiveFeedMode = catalogSelection
    ? catalogSelection.feedKind === "fz"
      ? "per-tooth"
      : "per-revolution"
    : operation === "milling"
      ? "per-tooth"
      : "per-revolution";
  const calculationEnabled =
    sourceMode === "manual" || Boolean(catalogSelection);

  useEffect(() => {
    if (!catalogSelection) {
      return;
    }

    setVc(
      String(
        roundValue(
          valueForCatalogProfile(catalogSelection.vc, profile),
          2,
        ),
      ),
    );
    setFeed(
      String(
        roundValue(
          valueForCatalogProfile(
            catalogSelection.feed,
            profile,
          ),
          3,
        ),
      ),
    );
  }, [catalogSelection, profile]);

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
      effectiveFeedMode === "per-tooth"
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
        machineFeed > 0 && length > 0
          ? length / machineFeed
          : 0,
      rpmLimited: rpmLimit > 0 && requestedRpm > rpmLimit,
      feedLimited:
        feedLimit > 0 && requestedFeed > feedLimit,
    };
  }, [
    cutLength,
    diameter,
    feed,
    maxFeed,
    maxRpm,
    effectiveFeedMode,
    teeth,
    vc,
  ]);
  const calculationReady =
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

  function resetWorkData() {
    setOperation("drilling");
    setInsertShape("");
    setProfile("conservative");
    setDiameter("");
    setTeeth("");
    setCutLength("");
    setVc("");
    setFeed("");
    setAp("");
    setAe("");
  }

  function selectCatalogCalculation() {
    setCatalogSelection(null);
    setSourceMode("catalog");
    resetWorkData();
  }

  function selectManualCalculation() {
    setCatalogSelection(null);
    setSourceMode("manual");
    resetWorkData();
  }

  function clearCatalogCalculation() {
    setCatalogSelection(null);
    resetWorkData();
  }

  function useCatalogSelection(
    selection: CatalogCalculationSelection,
  ) {
    const selectionProfile =
      selection.profile || "conservative";
    resetWorkData();
    setSourceMode("catalog");
    setCatalogSelection(selection);
    setOperation(selection.operation);
    setProfile(selectionProfile);

    if (selection.operation === "turning") {
      const matchingShape = cuttingPresets.find(
        (item) =>
          item.operation === "turning" &&
          item.insertShape === selection.family,
      )?.insertShape;

      if (matchingShape) {
        setInsertShape(matchingShape);
      }
    }

    setVc(
      String(
        roundValue(
          valueForCatalogProfile(selection.vc, selectionProfile),
          2,
        ),
      ),
    );
    setFeed(
      String(
        roundValue(
          valueForCatalogProfile(selection.feed, selectionProfile),
          3,
        ),
      ),
    );
    setAp(selection.ap);
    setAe(selection.ae);
    if (
      selection.operation !== "turning" &&
      selection.diameter
    ) {
      setDiameter(selection.diameter);
    }
    if (selection.operation === "milling" && selection.teeth) {
      setTeeth(selection.teeth);
    }

    requestAnimationFrame(() => {
      document
        .getElementById("cutting-calculator")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      <div className="pageHead cuttingHead">
        <div>
          <p>STEP 16 · CALCOLO GUIDATO</p>
          <h1>Parametri di taglio</h1>
          <span>
            Calcola dai cataloghi che hai caricato oppure inserisci
            ogni parametro manualmente.
          </span>
        </div>

        <div className="catalogBadge">
          <BookOpen size={18} />
          <div>
            <b>
              {catalogSelection
                ? catalogSelection.catalogName
                : sourceMode === "manual"
                  ? "Calcolo manuale"
                  : `${availableCatalogs.length} ${
                      availableCatalogs.length === 1
                        ? "catalogo disponibile"
                        : "cataloghi disponibili"
                    }`}
            </b>
            <span>
              {catalogSelection
                ? `Pagina ${catalogSelection.page} in uso`
                : sourceMode === "manual"
                  ? "Dati inseriti a mano"
                  : "Ricerca guidata nei PDF caricati"}
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
              <span>
                {catalogSelection
                  ? "Valori ricavati dal catalogo caricato."
                  : sourceMode === "manual"
                    ? "Inserisci manualmente i dati richiesti."
                    : "Trova utensile e parametri nei tuoi PDF."}
              </span>
            </div>
          </div>

          <div
            className="calculationModeTabs"
            aria-label="Modalità di calcolo"
          >
            <button
              type="button"
              className={`calculationModeButton ${
                sourceMode === "catalog" ? "active" : ""
              }`}
              onClick={selectCatalogCalculation}
            >
              <i>
                <BookOpen size={17} />
              </i>
              <span>
                <b>Da catalogo</b>
                <small>Usa i PDF caricati da te</small>
              </span>
            </button>

            <button
              className={`calculationModeButton ${
                sourceMode === "manual" ? "active" : ""
              }`}
              type="button"
              onClick={selectManualCalculation}
            >
              <i>
                <Calculator size={17} />
              </i>
              <span>
                <b>Calcolo manuale</b>
                <small>Inserisci tutti i dati a mano</small>
              </span>
            </button>
          </div>

          {sourceMode === "catalog" && (
            <CatalogGuidedCalculator
              activeSelection={catalogSelection}
              catalogs={availableCatalogs}
              onApply={useCatalogSelection}
            />
          )}

          {catalogSelection && (
            <div className="catalogAppliedBanner">
              <CheckCircle2 size={17} />
              <div>
                <b>Dati catalogo applicati</b>
                <span>
                  {catalogSelection.article || "Articolo non indicato"}{" "}
                  {catalogSelection.radius
                    ? `· R ${catalogSelection.radius} mm `
                    : ""}
                  · pagina {catalogSelection.page}
                </span>
              </div>
              <button
                type="button"
                onClick={clearCatalogCalculation}
              >
                Azzera dati catalogo
              </button>
            </div>
          )}

          {sourceMode === "manual" && (
            <>
              <div className="manualCalculationIntro">
                <Calculator size={17} />
                <span>
                  Nessun dato del catalogo viene applicato. Scegli la
                  lavorazione e compila i valori richiesti.
                </span>
              </div>
              <div className="operationTabs" role="tablist">
                {(
                  Object.keys(operationLabels) as CuttingOperation[]
                ).map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={operation === item ? "active" : ""}
                    onClick={() => {
                      setOperation(item);
                      setInsertShape("");
                      setFeed("");
                      setTeeth("");
                    }}
                  >
                    {operationLabels[item]}
                  </button>
                ))}
              </div>
            </>
          )}

          {calculationEnabled ? (
            <>
              <div className="cuttingFormGrid">
            {operation === "turning" && (
              <label className="full">
                <span>Forma placchetta</span>
                <select
                  value={insertShape}
                  disabled={
                    !calculationEnabled || sourceMode === "catalog"
                  }
                  onChange={(event) =>
                    setInsertShape(event.target.value)
                  }
                >
                  <option value="">Scegli la forma…</option>
                  {turningShapes.map((shape) => (
                    <option value={shape} key={shape}>
                      {shape}
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
                placeholder="0"
                value={diameter}
                disabled={!calculationEnabled}
                onChange={(event) =>
                  setDiameter(event.target.value)
                }
              />
            </label>

            {operation === "milling" && (
              <label>
                <span>Taglienti effettivi (Z)</span>
                <input
                  inputMode="numeric"
                  placeholder="0"
                  value={teeth}
                  disabled={!calculationEnabled}
                  onChange={(event) =>
                    setTeeth(event.target.value)
                  }
                />
              </label>
            )}

            <label>
              <span>Lunghezza lavorata (mm)</span>
              <input
                inputMode="decimal"
                placeholder="0"
                value={cutLength}
                disabled={!calculationEnabled}
                onChange={(event) =>
                  setCutLength(event.target.value)
                }
              />
            </label>

            {catalogSelection && (
              <label>
                <span>Profilo intervallo catalogo</span>
                <select
                  value={profile}
                  onChange={(event) =>
                    setProfile(
                      event.target.value as CuttingProfile,
                    )
                  }
                >
                  {(
                    Object.keys(
                      profileLabels,
                    ) as CuttingProfile[]
                  ).map((item) => (
                    <option key={item} value={item}>
                      {profileLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <span>Vc (m/min)</span>
              <input
                inputMode="decimal"
                placeholder="0"
                value={vc}
                disabled={!calculationEnabled}
                onChange={(event) => setVc(event.target.value)}
              />
            </label>

            <label>
              <span>
                {effectiveFeedMode === "per-tooth"
                  ? "fz (mm/dente)"
                  : "f (mm/giro)"}
              </span>
              <input
                inputMode="decimal"
                placeholder="0"
                value={feed}
                disabled={!calculationEnabled}
                onChange={(event) =>
                  setFeed(event.target.value)
                }
              />
            </label>

            <label>
              <span>ap · Profondità di taglio (mm)</span>
              <input
                inputMode="decimal"
                placeholder="0"
                value={ap}
                disabled={!calculationEnabled}
                onChange={(event) => setAp(event.target.value)}
              />
            </label>

            <label>
              <span>ae · Impegno radiale (mm)</span>
              <input
                inputMode="decimal"
                placeholder="0"
                value={ae}
                disabled={!calculationEnabled}
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
                      <option value="">
                        Nessuna macchina selezionata
                      </option>
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
                      onChange={(event) =>
                        setMaxRpm(event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Avanzamento massimo (mm/min)</span>
                    <input
                      inputMode="numeric"
                      placeholder="es. 8000"
                      value={maxFeed}
                      onChange={(event) =>
                        setMaxFeed(event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="catalogDataPending">
              <BookOpen size={18} />
              <span>
                Scegli un utensile dai risultati. Poi inserirai solo
                diametro, lunghezza e gli eventuali limiti della
                macchina.
              </span>
            </div>
          )}
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
                      della macchina. Verifica che il nuovo
                      avanzamento mantenga un carico truciolo adatto.
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
                      {effectiveFeedMode === "per-tooth"
                        ? "Vf = n × Z × fz"
                        : "Vf = n × f"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {catalogSelection
                        ? "Intervallo catalogo Vc"
                        : "Vc utilizzata"}
                    </dt>
                    <dd>
                      {catalogSelection
                        ? `${catalogSelection.vc} m/min`
                        : vc
                          ? `${vc} m/min`
                          : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Profondità ap</dt>
                    <dd>{ap ? `${ap} mm` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Impegno ae</dt>
                    <dd>{ae ? `${ae} mm` : "—"}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="resultAwaiting">
                <Calculator size={24} />
                <b>Il risultato apparirà qui</b>
                <span>
                  {sourceMode === "catalog" && !catalogSelection
                    ? "Carica o scegli un utensile dal catalogo."
                    : operation === "milling" && !teeth
                      ? "Inserisci diametro, numero di taglienti, Vc e fz."
                      : "Inserisci almeno diametro, Vc e avanzamento."}
                </span>
              </div>
            )}
          </section>

          {catalogSelection && (
            <section className="panel sourcePanel catalogSourcePanel">
              <div className="sourceTop">
                <div>
                  <span>Catalogo PDF caricato</span>
                  <h2>{catalogSelection.catalogName}</h2>
                </div>
                <b>
                  {catalogSelection.article ||
                    `Pagina ${catalogSelection.page}`}
                </b>
              </div>

              <div className="sourceTags">
                {catalogSelection.family && (
                  <span>{catalogSelection.family}</span>
                )}
                {catalogSelection.material && (
                  <span>{catalogSelection.material}</span>
                )}
                {catalogSelection.toolMaterial && (
                  <span>{catalogSelection.toolMaterial}</span>
                )}
                {catalogSelection.diameter && (
                  <span>Ø {catalogSelection.diameter} mm</span>
                )}
                {catalogSelection.radius && (
                  <span>R {catalogSelection.radius} mm</span>
                )}
                {catalogSelection.teeth && (
                  <span>Z {catalogSelection.teeth}</span>
                )}
                <span>Pagina {catalogSelection.page}</span>
                <span>Vc {catalogSelection.vc} m/min</span>
                <span>
                  {catalogSelection.feedKind === "fz" ? "fz" : "f"}{" "}
                  {catalogSelection.feed}
                </span>
              </div>

              {catalogSelection.parameterSetLabel && (
                <div className="catalogParameterSetSummary">
                  <b>Set parametri scelto</b>
                  <span>{catalogSelection.parameterSetLabel}</span>
                </div>
              )}

              <p>{catalogSelection.excerpt}</p>
              <small>
                Fonte selezionata dall’archivio cataloghi. I valori
                restano modificabili nei campi del calcolatore.
              </small>
            </section>
          )}

          <div className="cuttingDisclaimer">
            <AlertTriangle size={18} />
            <span>
              {catalogSelection
                ? "Valori estratti dal PDF: verifica che Vc, avanzamento e profondità appartengano alla stessa colonna di materiale, grado e geometria prima della produzione."
                : sourceMode === "manual"
                  ? "Valori manuali: confrontali con il catalogo del costruttore e parti con condizioni prudenti prima della produzione."
                  : "Scegli un utensile nella ricerca guidata. Il calcolo userà soltanto i valori presenti nei cataloghi caricati da te."}
            </span>
          </div>
        </div>
      </section>

      <CatalogManager
        activeCatalogId={catalogSelection?.catalogId}
        activePageId={catalogSelection?.pageId}
        enableCalculation={false}
        initiallyExpanded={false}
        onCatalogsChange={setAvailableCatalogs}
        onClearCalculation={clearCatalogCalculation}
        onUseForCalculation={useCatalogSelection}
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

function positiveNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function roundValue(value: number, digits: number) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
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
