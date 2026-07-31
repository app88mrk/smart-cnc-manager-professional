"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Database,
  Pencil,
  Save,
  X,
} from "lucide-react";

import CatalogImporter from "@/components/cutting/CatalogImporter";
import {
  calculateFeed,
  calculateFeedForTargetChipThickness,
  calculateMachiningTime,
  calculateMaximumChipThickness,
  calculateMrr,
  calculateRpm,
  CuttingOperation,
  estimatePowerKw,
  MaterialIsoGroup,
} from "@/lib/cuttingCalculations";
import {
  normalizeToolDetails,
  parseToolNumber,
} from "@/lib/tools";
import { Machine, RecordItem } from "@/types";

type CalculatorTab = CuttingOperation | "chip" | "power";

type CalculatorValues = {
  articleCode: string;
  diameter: string;
  teeth: string;
  cuttingSpeed: string;
  feedPerTooth: string;
  feedPerRev: string;
  axialDepth: string;
  radialWidth: string;
  length: string;
  passes: string;
  approachAngle: string;
  targetChipThickness: string;
};

type Props = {
  records: RecordItem[];
  machines: Machine[];
  busy: boolean;
  saveCalculation: (record: RecordItem) => Promise<void>;
  deleteCalculation: (record: RecordItem) => Promise<void>;
  saveCatalog: (
    record: RecordItem,
    file: File,
    onUploadProgress: (percent: number) => void
  ) => Promise<void>;
  saveImportedParameters: (
    records: RecordItem[],
    onProgress?: (percent: number) => void
  ) => Promise<void>;
  notifySuccess: (message: string) => void;
};

const catalogMarker = "[CATALOGO_PARAMETRI]";
const calculationMarker = "[CALCOLO_PARAMETRI_V5]";

const operationLabels: Record<CuttingOperation, string> = {
  milling: "Fresatura",
  drilling: "Foratura",
  turning: "Tornitura",
};

const initialValues: CalculatorValues = {
  articleCode: "",
  diameter: "0",
  teeth: "0",
  cuttingSpeed: "0",
  feedPerTooth: "0",
  feedPerRev: "0",
  axialDepth: "0",
  radialWidth: "0",
  length: "0",
  passes: "0",
  approachAngle: "0",
  targetChipThickness: "0",
};

export default function CuttingParametersPage({
  records,
  machines,
  busy,
  saveCalculation,
  deleteCalculation,
  saveCatalog,
  saveImportedParameters,
  notifySuccess,
}: Props) {
  const tools = useMemo(
    () =>
      records.filter(
        (record) =>
          record.module === "tools" &&
          !record.notes.includes("[IMPORT_CATALOGO]")
      ),
    [records]
  );
  const materials = useMemo(
    () => records.filter((record) => record.module === "materials"),
    [records]
  );
  const catalogs = useMemo(
    () =>
      records.filter(
        (record) =>
          record.module === "manuals" &&
          record.notes.includes(catalogMarker)
      ),
    [records]
  );
  const savedCalculations = useMemo(
    () =>
      records.filter(
        (record) =>
          record.module === "cutting" ||
          (record.module === "jobs" &&
            (record.notes.includes(calculationMarker) ||
              /^(Fresatura|Foratura|Tornitura)\s*·/i.test(record.title)))
      ),
    [records]
  );

  const [tab, setTab] = useState<CalculatorTab>("milling");
  const [operation, setOperation] =
    useState<CuttingOperation>("milling");
  const [selectedToolId, setSelectedToolId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [materialGroup, setMaterialGroup] =
    useState<MaterialIsoGroup>("P");
  const [values, setValues] =
    useState<CalculatorValues>(initialValues);
  const [calculationName, setCalculationName] = useState("");
  const [editingCalculationId, setEditingCalculationId] =
    useState("");
  const [localError, setLocalError] = useState("");

  const numeric = useMemo(
    () => ({
      diameter: parseNumber(values.diameter),
      teeth: parseNumber(values.teeth),
      cuttingSpeed: parseNumber(values.cuttingSpeed),
      feedPerTooth: parseNumber(values.feedPerTooth),
      feedPerRev: parseNumber(values.feedPerRev),
      axialDepth: parseNumber(values.axialDepth),
      radialWidth: parseNumber(values.radialWidth),
      length: parseNumber(values.length),
      passes: parseNumber(values.passes),
      approachAngle: parseNumber(values.approachAngle),
      targetChipThickness: parseNumber(values.targetChipThickness),
    }),
    [values]
  );

  const rpm = calculateRpm(numeric.cuttingSpeed, numeric.diameter);
  const activeFeedValue =
    operation === "milling"
      ? numeric.feedPerTooth
      : numeric.feedPerRev;
  const feed =
    operation === "milling" && numeric.teeth <= 0
      ? 0
      : calculateFeed(
          operation,
          rpm,
          activeFeedValue,
          numeric.teeth
        );
  const machiningTime = calculateMachiningTime(
    numeric.length,
    feed,
    numeric.passes
  );
  const mrr = calculateMrr(
    operation,
    numeric.diameter,
    numeric.axialDepth,
    numeric.radialWidth,
    feed
  );
  const power = estimatePowerKw(materialGroup, mrr);
  const maximumChipThickness = calculateMaximumChipThickness(
    numeric.diameter,
    numeric.radialWidth,
    numeric.feedPerTooth,
    numeric.approachAngle
  );
  const compensatedFeedPerTooth =
    calculateFeedForTargetChipThickness(
      numeric.diameter,
      numeric.radialWidth,
      numeric.targetChipThickness,
      numeric.approachAngle
    );
  const selectedMachine = machines.find(
    (machine) => machine.id === selectedMachineId
  );
  const spindleLimit = parseSpindleLimit(selectedMachine?.spindle || "");
  const exceedsSpindle = spindleLimit > 0 && rpm > spindleLimit;
  const validCalculation =
    numeric.diameter > 0 &&
    numeric.cuttingSpeed > 0 &&
    activeFeedValue > 0 &&
    (operation !== "milling" || numeric.teeth > 0);

  function updateValue(key: keyof CalculatorValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setLocalError("");
  }

  function openTab(nextTab: CalculatorTab) {
    setTab(nextTab);

    if (
      nextTab === "milling" ||
      nextTab === "drilling" ||
      nextTab === "turning"
    ) {
      setOperation(nextTab);
    }
  }

  function selectTool(toolId: string) {
    setSelectedToolId(toolId);
    setLocalError("");

    if (!toolId) {
      setValues((current) => ({ ...current, articleCode: "" }));
      return;
    }

    const record = tools.find((tool) => tool.id === toolId);

    if (!record) {
      return;
    }

    const tool = normalizeToolDetails(record);
    const detectedOperation = operationFromTool(tool.category);
    const noteParameters = readParameters(record.notes);
    const toolDiameter = parseToolNumber(tool.diameter);
    const importedFeedPerTooth =
      noteParameters.feedPerTooth || currentDecimal(values.feedPerTooth);

    setOperation(detectedOperation);
    setTab(detectedOperation);
    setValues((current) => ({
      ...current,
      articleCode: tool.code,
      diameter: positiveText(tool.diameter, current.diameter),
      teeth: positiveText(tool.fluteCount, current.teeth),
      cuttingSpeed: noteParameters.cuttingSpeed || current.cuttingSpeed,
      feedPerTooth: importedFeedPerTooth,
      feedPerRev: noteParameters.feedPerRev || current.feedPerRev,
      axialDepth: noteParameters.axialDepth || current.axialDepth,
      radialWidth:
        noteParameters.radialWidth ||
        (toolDiameter > 0
          ? decimalText(toolDiameter * 0.4)
          : current.radialWidth),
      targetChipThickness: importedFeedPerTooth,
    }));
  }

  function selectMaterial(materialId: string) {
    setSelectedMaterialId(materialId);
    const material = materials.find((item) => item.id === materialId);

    if (material) {
      setMaterialGroup(detectMaterialGroup(material));
    }
  }

  function resetCalculationForm() {
    setValues(initialValues);
    setCalculationName("");
    setEditingCalculationId("");
    setSelectedToolId("");
    setSelectedMaterialId("");
    setSelectedMachineId("");
    setSelectedCatalogId("");
    setMaterialGroup("P");
    setLocalError("");
  }

  function editSavedCalculation(record: RecordItem) {
    const savedType = savedOperation(record);

    if (!savedType) {
      return;
    }

    setOperation(savedType);
    setTab(savedType);
    setCalculationName(record.title);
    setEditingCalculationId(record.id);
    setSelectedMachineId(record.machineId || "");
    setSelectedToolId(savedText(record.notes, "Utensile ID"));
    setSelectedMaterialId(savedText(record.notes, "Materiale ID"));
    setSelectedCatalogId(savedText(record.notes, "Catalogo ID"));
    setMaterialGroup(savedMaterialGroup(record.notes));
    setValues({
      articleCode: savedText(record.notes, "Codice articolo"),
      diameter: savedNumber(record.notes, "Diametro"),
      teeth: savedNumber(record.notes, "Taglienti"),
      cuttingSpeed: savedNumber(record.notes, "Vc"),
      feedPerTooth: savedNumber(record.notes, "fz"),
      feedPerRev: savedNumber(record.notes, "f"),
      axialDepth: savedNumber(record.notes, "ap"),
      radialWidth: savedNumber(record.notes, "ae"),
      length: savedNumber(record.notes, "Lunghezza lavorata"),
      passes: savedNumber(record.notes, "Numero passate"),
      approachAngle: savedNumber(record.notes, "Angolo di attacco"),
      targetChipThickness: savedNumber(record.notes, "hmax desiderato"),
    });
    setLocalError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeSavedCalculation(record: RecordItem) {
    if (!window.confirm(`Eliminare il calcolo “${record.title}”?`)) {
      return;
    }

    try {
      await deleteCalculation(record);

      if (editingCalculationId === record.id) {
        resetCalculationForm();
      }

      notifySuccess(`Calcolo “${record.title}” eliminato dallo storico.`);
    } catch {
      // L'errore viene già mostrato da useRecords.
    }
  }

  async function handleSave() {
    if (!calculationName.trim()) {
      setLocalError("Inserisci un nome per il calcolo prima di salvarlo.");
      return;
    }

    if (!validCalculation) {
      setLocalError(
        "Inserisci diametro, velocità di taglio e avanzamento validi prima di salvare."
      );
      return;
    }

    const now = new Date().toISOString();
    const machineName = selectedMachine
      ? `${selectedMachine.brand} ${selectedMachine.model}`.trim()
      : "";
    const material = materials.find(
      (item) => item.id === selectedMaterialId
    );
    const tool = tools.find((item) => item.id === selectedToolId);
    const catalog = catalogs.find(
      (item) => item.id === selectedCatalogId
    );
    const code = values.articleCode.trim() || "Manuale";
    const operationLabel = operationLabels[operation];
    const existingRecord = savedCalculations.find(
      (record) => record.id === editingCalculationId
    );

    const notes = [
      calculationMarker,
      `Tipo calcolo: ${operation}`,
      `Operazione: ${operationLabel}`,
      `Codice articolo: ${code}`,
      selectedToolId ? `Utensile ID: ${selectedToolId}` : "",
      selectedMaterialId ? `Materiale ID: ${selectedMaterialId}` : "",
      selectedCatalogId ? `Catalogo ID: ${selectedCatalogId}` : "",
      tool ? `Utensile: ${tool.title}` : "Utensile: inserimento manuale",
      material
        ? `Materiale: ${material.title} (ISO ${materialGroup})`
        : `Materiale: manuale (ISO ${materialGroup})`,
      catalog ? `Catalogo di riferimento: ${catalog.title}` : "",
      `Diametro: ${formatNumber(numeric.diameter)} mm`,
      operation === "milling"
        ? `Taglienti: ${formatNumber(numeric.teeth)}`
        : "",
      `Vc: ${formatNumber(numeric.cuttingSpeed)} m/min`,
      operation === "milling"
        ? `fz: ${formatNumber(numeric.feedPerTooth, 3)} mm/dente`
        : `f: ${formatNumber(numeric.feedPerRev, 3)} mm/giro`,
      `Numero di giri: ${formatNumber(rpm)} giri/min`,
      `Velocità di avanzamento: ${formatNumber(feed)} mm/min`,
      `ap: ${formatNumber(numeric.axialDepth)} mm`,
      operation === "milling"
        ? `ae: ${formatNumber(numeric.radialWidth)} mm`
        : "",
      `Lunghezza lavorata: ${formatNumber(numeric.length)} mm`,
      `Numero passate: ${formatNumber(numeric.passes)}`,
      `Angolo di attacco: ${formatNumber(numeric.approachAngle, 2)}°`,
      `hmax desiderato: ${formatNumber(numeric.targetChipThickness, 3)} mm`,
      `MRR: ${formatNumber(mrr, 2)} cm³/min`,
      `Potenza stimata: ${formatNumber(power, 2)} kW`,
      machiningTime > 0
        ? `Tempo stimato: ${formatNumber(machiningTime, 2)} min`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await saveCalculation({
        id: editingCalculationId || createId("cutting"),
        module: "cutting",
        title: calculationName.trim(),
        subtitle: `${operationLabel} · ${code} · n ${formatNumber(rpm)} rpm · Vf ${formatNumber(feed)} mm/min`,
        status: "Salvato",
        machineId: selectedMachineId,
        machine: machineName,
        notes,
        createdAt: existingRecord?.createdAt || now,
        updatedAt: now,
      });
      notifySuccess(
        editingCalculationId
          ? `Calcolo “${calculationName.trim()}” modificato.`
          : `Calcolo “${calculationName.trim()}” salvato nello storico.`
      );
      resetCalculationForm();
    } catch {
      // L'errore viene già mostrato da useRecords.
    }
  }

  return (
    <section className="cuttingCalculator">
      <div className="pageHead cuttingPageHead">
        <div>
          <span>CALCOLATORE CNC V5</span>
          <h1>Parametri di taglio</h1>
          <p>
            Seleziona i dati dagli archivi Firebase oppure inseriscili
            manualmente. Tutti i valori restano modificabili.
          </p>
        </div>

        <div className="cuttingHeadIcon" aria-hidden="true">
          <Calculator size={28} />
        </div>
      </div>

      <div className="cuttingSourcePanel">
        <div className="cuttingSourceTitle">
          <Database size={18} />
          <div>
            <b>Dati di partenza</b>
            <small>Archivi dell’app o inserimento manuale</small>
          </div>
        </div>

        <div className="cuttingSourceGrid">
          <label>
            <span>Utensile dall’archivio</span>
            <select
              value={selectedToolId}
              onChange={(event) => selectTool(event.target.value)}
            >
              <option value="">Inserimento manuale</option>
              {tools.map((record) => {
                const tool = normalizeToolDetails(record);
                const diameter = parseToolNumber(tool.diameter);

                return (
                  <option key={record.id} value={record.id}>
                    {[tool.code, record.title, diameter > 0 ? `Ø ${formatNumber(diameter)} mm` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </option>
                );
              })}
            </select>
          </label>

          <label>
            <span>Materiale da lavorare</span>
            <select
              value={selectedMaterialId}
              onChange={(event) => selectMaterial(event.target.value)}
            >
              <option value="">Materiale manuale</option>
              {materials.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Gruppo ISO</span>
            <select
              value={materialGroup}
              onChange={(event) =>
                setMaterialGroup(event.target.value as MaterialIsoGroup)
              }
            >
              <option value="P">P · Acciai</option>
              <option value="M">M · Inossidabili</option>
              <option value="K">K · Ghise</option>
              <option value="N">N · Non ferrosi</option>
              <option value="S">S · Superleghe</option>
              <option value="H">H · Temprati</option>
            </select>
          </label>

          <label>
            <span>Macchina</span>
            <select
              value={selectedMachineId}
              onChange={(event) => setSelectedMachineId(event.target.value)}
            >
              <option value="">Nessuna macchina</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.brand} {machine.model}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Catalogo di riferimento</span>
            <select
              value={selectedCatalogId}
              onChange={(event) =>
                setSelectedCatalogId(event.target.value)
              }
            >
              <option value="">Nessun catalogo</option>
              {catalogs.map((catalog) => (
                <option key={catalog.id} value={catalog.id}>
                  {catalog.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="cuttingArticleCode">
          <span>Codice articolo</span>
          <input
            value={values.articleCode}
            onChange={(event) =>
              updateValue("articleCode", event.target.value)
            }
            placeholder="Codice utensile o inserimento manuale"
          />
        </label>
      </div>

      <CatalogImporter
        existingCalculations={savedCalculations}
        catalogs={catalogs}
        busy={busy}
        saveCatalog={saveCatalog}
        saveImportedParameters={saveImportedParameters}
        notifySuccess={notifySuccess}
        selectCatalog={setSelectedCatalogId}
      />

      <div className="cuttingTabs" role="tablist" aria-label="Calcoli disponibili">
        {([
          ["milling", "Fresatura"],
          ["drilling", "Foratura"],
          ["turning", "Tornitura"],
          ["chip", "TPC"],
          ["power", "Potenza"],
        ] as [CalculatorTab, string][]).map(([tabId, label]) => (
          <button
            key={tabId}
            type="button"
            className={tab === tabId ? "active" : ""}
            onClick={() => openTab(tabId)}
            role="tab"
            aria-selected={tab === tabId}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cuttingWorkspace">
        {tab === "milling" && (
          <BaseOperationFields
            operation="milling"
            values={values}
            updateValue={updateValue}
          />
        )}

        {tab === "drilling" && (
          <BaseOperationFields
            operation="drilling"
            values={values}
            updateValue={updateValue}
          />
        )}

        {tab === "turning" && (
          <BaseOperationFields
            operation="turning"
            values={values}
            updateValue={updateValue}
          />
        )}

        {tab === "chip" && (
          <div className="cuttingPanel">
            <div className="cuttingPanelHead">
              <div>
                <span>SPESSORE MASSIMO DEL TRUCIOLO</span>
                <h2>Compensazione TPC</h2>
              </div>
              <small>Calcolo riferito alla fresatura</small>
            </div>

            <div className="cuttingInputGrid">
              <NumberField label="Diametro" unit="mm" value={values.diameter} onChange={(value) => updateValue("diameter", value)} />
              <NumberField label="Larghezza ae" unit="mm" value={values.radialWidth} onChange={(value) => updateValue("radialWidth", value)} />
              <NumberField label="Avanzamento fz" unit="mm/dente" value={values.feedPerTooth} onChange={(value) => updateValue("feedPerTooth", value)} />
              <NumberField label="Angolo di attacco φ" unit="°" value={values.approachAngle} onChange={(value) => updateValue("approachAngle", value)} />
              <NumberField label="hmax desiderato" unit="mm" value={values.targetChipThickness} onChange={(value) => updateValue("targetChipThickness", value)} />
            </div>

            <div className="cuttingResults three">
              <ResultCard label="Rapporto ae / D" value={numeric.diameter > 0 ? numeric.radialWidth / numeric.diameter : 0} decimals={3} />
              <ResultCard label="Spessore hmax" value={maximumChipThickness} unit="mm" decimals={3} />
              <ResultCard label="fz compensato" value={compensatedFeedPerTooth} unit="mm/dente" decimals={3} accent />
            </div>
          </div>
        )}

        {tab === "power" && (
          <div className="cuttingPanel">
            <div className="cuttingPanelHead">
              <div>
                <span>STIMA TECNOLOGICA</span>
                <h2>Potenza e tempo di lavorazione</h2>
              </div>
              <small>{operationLabels[operation]} · ISO {materialGroup}</small>
            </div>

            <div className="cuttingInputGrid">
              <NumberField label="Profondità ap" unit="mm" value={values.axialDepth} onChange={(value) => updateValue("axialDepth", value)} />
              {operation === "milling" && (
                <NumberField label="Larghezza ae" unit="mm" value={values.radialWidth} onChange={(value) => updateValue("radialWidth", value)} />
              )}
              <NumberField label="Lunghezza lavorata" unit="mm" value={values.length} onChange={(value) => updateValue("length", value)} />
              <NumberField label="Numero passate" value={values.passes} onChange={(value) => updateValue("passes", value)} />
            </div>

            <div className="cuttingResults three">
              <ResultCard label="Asportazione MRR" value={mrr} unit="cm³/min" decimals={2} />
              <ResultCard label="Potenza stimata" value={power} unit="kW" decimals={2} accent />
              <ResultCard label="Tempo stimato" value={machiningTime} unit="min" decimals={2} />
            </div>

            <p className="cuttingDisclaimer">
              La potenza è una stima orientativa basata sul gruppo ISO. Verifica sempre i limiti della macchina e i dati del costruttore.
            </p>
          </div>
        )}

        {(tab === "milling" || tab === "drilling" || tab === "turning") && (
          <div className="cuttingResults">
            <ResultCard label="Numero di giri n" value={rpm} unit="giri/min" accent />
            <ResultCard label="Velocità avanzamento Vf" value={feed} unit="mm/min" accent />
          </div>
        )}

        {exceedsSpindle && (
          <div className="cuttingWarning">
            <AlertTriangle size={18} />
            Il risultato di {formatNumber(rpm)} giri/min supera il limite rilevato della macchina ({formatNumber(spindleLimit)} giri/min).
          </div>
        )}

        {localError && (
          <div className="cuttingWarning error">
            <AlertTriangle size={18} />
            {localError}
          </div>
        )}

        <SavedCalculations
          records={savedCalculations}
          operation={operation}
          busy={busy}
          onEdit={editSavedCalculation}
          onDelete={removeSavedCalculation}
        />

        <div className="cuttingActions">
          <label className="cuttingSaveName">
            <span>Nome del calcolo *</span>
            <input
              value={calculationName}
              onChange={(event) => {
                setCalculationName(event.target.value);
                setLocalError("");
              }}
              placeholder={`Es. ${operationLabels[operation]} supporto 125`}
              maxLength={80}
            />
          </label>

          <div className="cuttingSaveButtons">
            {editingCalculationId && (
              <button
                type="button"
                onClick={resetCalculationForm}
                disabled={busy}
              >
                Annulla modifica
              </button>
            )}
            <button
              type="button"
              className="primary"
              onClick={handleSave}
              disabled={busy || !validCalculation}
            >
              <Save size={17} />
              {busy
                ? "Salvataggio…"
                : editingCalculationId
                  ? "Salva modifiche"
                  : "Salva nello storico"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SavedCalculations({
  records,
  operation,
  busy,
  onEdit,
  onDelete,
}: {
  records: RecordItem[];
  operation: CuttingOperation;
  busy: boolean;
  onEdit: (record: RecordItem) => void;
  onDelete: (record: RecordItem) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(24);
  const matchingRecords = records
    .filter((record) => savedOperation(record) === operation);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRecords = normalizedQuery
    ? matchingRecords.filter((record) =>
        `${record.title} ${record.subtitle} ${record.notes}`
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : matchingRecords;
  const visibleRecords = filteredRecords.slice(0, visibleLimit);

  return (
    <section className="cuttingSaved">
      <div className="cuttingSavedHead">
        <div>
          <span>STORICO DEL CALCOLO</span>
          <h3>Calcoli {operationLabels[operation].toLowerCase()} salvati</h3>
        </div>
        <b>{matchingRecords.length}</b>
      </div>

      {matchingRecords.length > 12 && (
        <div className="cuttingHistorySearch">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleLimit(24);
            }}
            placeholder="Cerca codice articolo, descrizione, Vc o avanzamento…"
            aria-label="Cerca nello storico del calcolo"
          />
          <small>
            {filteredRecords.length} risultati
          </small>
        </div>
      )}

      {filteredRecords.length ? (
        <div className="cuttingSavedGrid">
          {visibleRecords.map((record) => {
            const code =
              record.notes.match(/Codice articolo:\s*(.+)/i)?.[1] ||
              "Manuale";

            return (
              <article key={record.id}>
                <div className="cuttingSavedTop">
                  <span>{code}</span>
                  <small>{formatDateTime(record.updatedAt)}</small>
                </div>
                <b>{record.title}</b>
                <p>{record.subtitle}</p>
                {record.machine && <small>Macchina: {record.machine}</small>}
                <div className="cuttingSavedActions">
                  <button
                    type="button"
                    onClick={() => onEdit(record)}
                    disabled={busy}
                    title="Modifica calcolo"
                    aria-label={`Modifica ${record.title}`}
                  >
                    <Pencil size={15} />
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="delete"
                    onClick={() => onDelete(record)}
                    disabled={busy}
                    title="Elimina calcolo"
                    aria-label={`Elimina ${record.title}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="cuttingSavedEmpty">
          Nessun calcolo salvato per {operationLabels[operation].toLowerCase()}.
          Il prossimo comparirà qui automaticamente.
        </p>
      )}

      {filteredRecords.length > visibleLimit && (
        <button
          type="button"
          className="cuttingHistoryMore"
          onClick={() => setVisibleLimit((current) => current + 24)}
        >
          Mostra altri parametri
        </button>
      )}
    </section>
  );
}

function BaseOperationFields({
  operation,
  values,
  updateValue,
}: {
  operation: CuttingOperation;
  values: CalculatorValues;
  updateValue: (key: keyof CalculatorValues, value: string) => void;
}) {
  return (
    <div className="cuttingPanel">
      <div className="cuttingPanelHead">
        <div>
          <span>DATI DI BASE</span>
          <h2>{operationLabels[operation]}</h2>
        </div>
        <small>Valori modificabili</small>
      </div>

      <div className="cuttingInputGrid">
        <NumberField label="Diametro D" unit="mm" value={values.diameter} onChange={(value) => updateValue("diameter", value)} />
        {operation === "milling" && (
          <NumberField label="Taglienti z" value={values.teeth} onChange={(value) => updateValue("teeth", value)} />
        )}
        <NumberField label="Velocità di taglio Vc" unit="m/min" value={values.cuttingSpeed} onChange={(value) => updateValue("cuttingSpeed", value)} />
        {operation === "milling" ? (
          <NumberField label="Avanzamento al dente fz" unit="mm/dente" value={values.feedPerTooth} onChange={(value) => updateValue("feedPerTooth", value)} />
        ) : (
          <NumberField label="Avanzamento al giro f" unit="mm/giro" value={values.feedPerRev} onChange={(value) => updateValue("feedPerRev", value)} />
        )}
        <NumberField label={operation === "turning" ? "Profondità passata ap" : "Profondità assiale ap"} unit="mm" value={values.axialDepth} onChange={(value) => updateValue("axialDepth", value)} />
        {operation === "milling" && (
          <NumberField label="Larghezza radiale ae" unit="mm" value={values.radialWidth} onChange={(value) => updateValue("radialWidth", value)} />
        )}
        <NumberField label={operation === "drilling" ? "Profondità foro" : "Lunghezza lavorata"} unit="mm" value={values.length} onChange={(value) => updateValue("length", value)} />
        <NumberField label="Numero passate" value={values.passes} onChange={(value) => updateValue("passes", value)} />
      </div>
    </div>
  );
}

function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="cuttingField">
      <span>{label}</span>
      <div>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {unit && <small>{unit}</small>}
      </div>
    </label>
  );
}

function ResultCard({
  label,
  value,
  unit,
  decimals = 0,
  accent = false,
}: {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  accent?: boolean;
}) {
  return (
    <div className={`cuttingResult ${accent ? "accent" : ""}`}>
      <span>{label}</span>
      <div>
        <strong>{formatNumber(value, decimals)}</strong>
        {unit && <small>{unit}</small>}
      </div>
    </div>
  );
}

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function positiveText(value: string, fallback: string) {
  return parseToolNumber(value) > 0 ? value : fallback;
}

function currentDecimal(value: string) {
  return parseNumber(value) > 0 ? value : "0";
}

function decimalText(value: number) {
  return String(Number(value.toFixed(3))).replace(".", ",");
}

function operationFromTool(category: string): CuttingOperation {
  if (category === "Punta" || category === "Maschio") {
    return "drilling";
  }

  if (category === "Tornitura" || category === "Inserto" || category === "Bareno") {
    return "turning";
  }

  return "milling";
}

function readParameters(notes: string) {
  return {
    cuttingSpeed: findParameter(notes, "Vc"),
    feedPerTooth: findParameter(notes, "fz"),
    feedPerRev: findParameter(notes, "f(?!z)"),
    axialDepth: findParameter(notes, "ap"),
    radialWidth: findParameter(notes, "ae"),
  };
}

function findParameter(notes: string, keyPattern: string) {
  const match = notes.match(
    new RegExp(`(?:^|\\s|[;,])${keyPattern}\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)`, "i")
  );
  return match?.[1] || "";
}

function detectMaterialGroup(record: RecordItem): MaterialIsoGroup {
  const source = `${record.title} ${record.subtitle} ${record.notes}`;
  const explicit = source.match(/(?:ISO|gruppo)\s*[:=-]?\s*([PMKNSH])\b/i);

  if (explicit) {
    return explicit[1].toUpperCase() as MaterialIsoGroup;
  }

  if (/inox|inossid|stainless/i.test(source)) return "M";
  if (/ghisa|cast iron/i.test(source)) return "K";
  if (/allumin|rame|ottone|non ferro/i.test(source)) return "N";
  if (/titan|inconel|superlega/i.test(source)) return "S";
  if (/temprat|hardened/i.test(source)) return "H";
  return "P";
}

function parseSpindleLimit(value: string) {
  const compact = value.replace(/\s/g, "");
  const match = compact.match(/(\d+(?:[.,]\d+)?)/);

  if (!match) {
    return 0;
  }

  const raw = match[1];
  const normalized = /^\d{1,3}[.,]\d{3}$/.test(raw)
    ? raw.replace(/[.,]/, "")
    : raw.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

function savedOperation(record: RecordItem): CuttingOperation | null {
  const explicit = record.notes.match(
    /Tipo calcolo:\s*(milling|drilling|turning)/i
  )?.[1];

  if (explicit) {
    return explicit.toLowerCase() as CuttingOperation;
  }

  if (/^Fresatura\s*·/i.test(record.title)) return "milling";
  if (/^Foratura\s*·/i.test(record.title)) return "drilling";
  if (/^Tornitura\s*·/i.test(record.title)) return "turning";
  return null;
}

function savedText(notes: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = notes.match(
    new RegExp(`(?:^|\\n)${escapedLabel}:\\s*(.+)$`, "im")
  );
  return match?.[1]?.trim() || "";
}

function savedNumber(notes: string, label: string) {
  const value = savedText(notes, label).match(/-?\d+(?:[.,]\d+)?/)?.[0];
  return value || "0";
}

function savedMaterialGroup(notes: string): MaterialIsoGroup {
  const match = notes.match(/\bISO\s+([PMKNSH])\b/i)?.[1];
  return (match?.toUpperCase() as MaterialIsoGroup) || "P";
}

function createId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data non disponibile";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
