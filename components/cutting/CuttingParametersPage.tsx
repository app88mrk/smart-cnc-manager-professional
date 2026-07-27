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
  feedForDiameter,
  formatCuttingNumber,
  formatRange,
  materialLabels,
  materialsForPreset,
  operationLabels,
  profileLabels,
  valueForProfile,
} from "@/lib/cuttingParameters";
import { Machine } from "@/types";

type CuttingParametersPageProps = {
  machines: Machine[];
};

export default function CuttingParametersPage({
  machines,
}: CuttingParametersPageProps) {
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
  const [insertShape, setInsertShape] = useState("CNMG");
  const availablePresets = useMemo(
    () =>
      operation === "turning"
        ? operationPresets.filter(
            (preset) => preset.insertShape === insertShape,
          )
        : operationPresets,
    [insertShape, operation, operationPresets],
  );
  const [presetId, setPresetId] = useState(
    cuttingPresets[0].id,
  );
  const preset =
    availablePresets.find((item) => item.id === presetId) ||
    availablePresets[0];
  const availableMaterials = useMemo(
    () => materialsForPreset(preset),
    [preset],
  );
  const [materialId, setMaterialId] = useState(
    availableMaterials[0],
  );
  const [profile, setProfile] =
    useState<CuttingProfile>("conservative");
  const [diameter, setDiameter] = useState("10");
  const [teeth, setTeeth] = useState(
    String(preset.defaultTeeth || 2),
  );
  const [cutLength, setCutLength] = useState("50");
  const [vc, setVc] = useState("0");
  const [feed, setFeed] = useState("0");
  const [machineId, setMachineId] = useState("");
  const [maxRpm, setMaxRpm] = useState("");
  const [maxFeed, setMaxFeed] = useState("");

  const recommendation =
    preset.materials[materialId] ||
    preset.materials[availableMaterials[0]]!;
  const numericDiameter = positiveNumber(diameter);

  useEffect(() => {
    if (
      operation === "turning" &&
      turningShapes.length &&
      !turningShapes.includes(insertShape)
    ) {
      setInsertShape(turningShapes[0]);
    }
  }, [insertShape, operation, turningShapes]);

  useEffect(() => {
    if (!availablePresets.some((item) => item.id === presetId)) {
      setPresetId(availablePresets[0].id);
    }
  }, [availablePresets, presetId]);

  useEffect(() => {
    if (!availableMaterials.includes(materialId)) {
      setMaterialId(availableMaterials[0]);
    }
  }, [availableMaterials, materialId]);

  useEffect(() => {
    const currentMaterial =
      preset.materials[materialId] ||
      preset.materials[availableMaterials[0]];

    if (!currentMaterial) {
      return;
    }

    const suggestedFeed =
      currentMaterial.feed !== undefined
        ? valueForProfile(currentMaterial.feed, profile)
        : feedForDiameter(
            preset.diameterFeed,
            numericDiameter || preset.diameterMin || 10,
          );
    const feedMultiplier =
      profile === "conservative"
        ? 0.9
        : profile === "productive"
          ? 1.1
          : 1;

    setVc(
      String(
        roundValue(
          valueForProfile(currentMaterial.vc, profile),
          2,
        ),
      ),
    );
    setFeed(
      String(
        roundValue(
          (suggestedFeed || 0.1) *
            (currentMaterial.feed === undefined
              ? feedMultiplier
              : 1),
          3,
        ),
      ),
    );
  }, [
    availableMaterials,
    materialId,
    numericDiameter,
    preset,
    profile,
  ]);

  useEffect(() => {
    setTeeth(String(preset.defaultTeeth || 2));
    setDiameter((current) => {
      const currentDiameter = positiveNumber(current);

      if (
        preset.diameterMin &&
        (currentDiameter < preset.diameterMin ||
          (preset.diameterMax &&
            currentDiameter > preset.diameterMax))
      ) {
        return String(preset.diameterMin);
      }

      return current;
    });
  }, [preset]);

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
      preset.feedMode === "per-tooth"
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
    preset.feedMode,
    teeth,
    vc,
  ]);

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

  return (
    <>
      <div className="pageHead cuttingHead">
        <div>
          <p>STEP 12 · CALCOLO PROFESSIONALE</p>
          <h1>Parametri di taglio</h1>
          <span>
            Valori di partenza dal catalogo Hoffmann Group 56,
            con fonte e pagina sempre visibili.
          </span>
        </div>

        <div className="catalogBadge">
          <BookOpen size={18} />
          <div>
            <b>Catalogo 56</b>
            <span>Valido dal 01/08/2025</span>
          </div>
        </div>
      </div>

      <section className="cuttingLayout">
        <div className="panel cuttingInputs">
          <div className="cuttingSectionTitle">
            <Calculator size={19} />
            <div>
              <b>Dati di lavorazione</b>
              <span>Scegli utensile, materiale e macchina.</span>
            </div>
          </div>

          <div className="operationTabs" role="tablist">
            {(
              Object.keys(operationLabels) as CuttingOperation[]
            ).map((item) => (
              <button
                key={item}
                className={operation === item ? "active" : ""}
                onClick={() => setOperation(item)}
              >
                {operationLabels[item]}
              </button>
            ))}
          </div>

          <div className="cuttingFormGrid">
            {operation === "turning" && (
              <label className="full">
                <span>Forma placchetta</span>
                <select
                  value={insertShape}
                  onChange={(event) =>
                    setInsertShape(event.target.value)
                  }
                >
                  {turningShapes.map((shape) => {
                    const count = operationPresets.filter(
                      (item) => item.insertShape === shape,
                    ).length;

                    return (
                      <option value={shape} key={shape}>
                        {shape} · {count}{" "}
                        {count === 1 ? "scheda" : "schede"}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}

            <label className="full">
              <span>Utensile dal catalogo</span>
              <select
                value={preset.id}
                onChange={(event) =>
                  setPresetId(event.target.value)
                }
              >
                {availablePresets.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.article} · {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="full">
              <span>Materiale da lavorare</span>
              <select
                value={materialId}
                onChange={(event) =>
                  setMaterialId(
                    event.target.value as typeof materialId,
                  )
                }
              >
                {availableMaterials.map((item) => (
                  <option value={item} key={item}>
                    {materialLabels[item]}
                  </option>
                ))}
              </select>
            </label>

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
                  value={teeth}
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
                value={cutLength}
                onChange={(event) =>
                  setCutLength(event.target.value)
                }
              />
            </label>

            <label>
              <span>Profilo</span>
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
                {preset.feedMode === "per-tooth"
                  ? "fz (mm/dente)"
                  : "f (mm/giro)"}
              </span>
              <input
                inputMode="decimal"
                value={feed}
                onChange={(event) =>
                  setFeed(event.target.value)
                }
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
                  della macchina. Verifica che il nuovo avanzamento
                  mantenga un carico truciolo adatto.
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
                  {preset.feedMode === "per-tooth"
                    ? "Vf = n × Z × fz"
                    : "Vf = n × f"}
                </dd>
              </div>
              <div>
                <dt>Valore catalogo Vc</dt>
                <dd>{formatRange(recommendation.vc, " m/min")}</dd>
              </div>
              <div>
                <dt>Profondità ap</dt>
                <dd>{formatRange(recommendation.ap, " mm")}</dd>
              </div>
              <div>
                <dt>Impegno ae</dt>
                <dd>{recommendation.ae || "Vedi nota utensile"}</dd>
              </div>
            </dl>
          </section>

          <section className="panel sourcePanel">
            <div className="sourceTop">
              <div>
                <span>{preset.family}</span>
                <h2>{preset.name}</h2>
              </div>
              <b>{preset.article}</b>
            </div>

            <div className="sourceTags">
              {preset.insertShape && (
                <span>Forma {preset.insertShape}</span>
              )}
              <span>{preset.toolMaterial}</span>
              <span>{preset.coating}</span>
              <span>Pagina {preset.page}</span>
            </div>

            <p>{preset.note}</p>

            {preset.diameterMin && (
              <small>
                Campo presente nel catalogo: Ø{" "}
                {formatCuttingNumber(preset.diameterMin)}–
                {formatCuttingNumber(preset.diameterMax || 0)} mm.
              </small>
            )}
          </section>

          <div className="cuttingDisclaimer">
            <AlertTriangle size={18} />
            <span>
              Valori iniziali del costruttore: partire dal profilo
              prudente e correggere in base a sporgenza, serraggio,
              refrigerazione, stabilità e potenza disponibili.
            </span>
          </div>
        </div>
      </section>
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
