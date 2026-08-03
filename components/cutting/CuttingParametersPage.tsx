"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Calculator,
  CheckCircle2,
  ChevronDown,
  History,
  Library,
  Pencil,
  Printer,
  Save,
  Settings2,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import CatalogImporter from "@/components/cutting/CatalogImporter";
import CatalogParameterLibrary from "@/components/cutting/CatalogParameterLibrary";
import HistoricalRecommendation, {
  HistoricalValues,
} from "@/components/cutting/HistoricalRecommendation";
import ProfessionalCuttingPanel, {
  CuttingOutcome,
  CuttingStrategy,
  MachineCheck,
} from "@/components/cutting/ProfessionalCuttingPanel";
import SetupAnalysisPanel from "@/components/cutting/SetupAnalysisPanel";
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
type CuttingSection = "calculator" | "library" | "catalogs" | "history";
type SupportPanel = "analysis" | "professional" | "experience" | null;

type CatalogBaseValues = {
  cuttingSpeed: number;
  feed: number;
};

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
  deleteCalculations: (records: RecordItem[]) => Promise<void>;
  saveCatalog: (
    record: RecordItem,
    file: File,
    onUploadProgress: (percent: number) => void
  ) => Promise<void>;
  saveImportedParameters: (
    records: RecordItem[],
    onProgress?: (percent: number) => void
  ) => Promise<void>;
  deleteCatalog: (record: RecordItem) => Promise<void>;
  notifySuccess: (message: string) => void;
};

const catalogMarker = "[CATALOGO_PARAMETRI]";
const calculationMarker = "[CALCOLO_PARAMETRI_V5]";
const importedParameterMarker = "[IMPORT_CATALOGO]";

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
  passes: "1",
  approachAngle: "90",
  targetChipThickness: "0",
};

export default function CuttingParametersPage({
  records,
  machines,
  busy,
  saveCalculation,
  deleteCalculation,
  deleteCalculations,
  saveCatalog,
  saveImportedParameters,
  deleteCatalog,
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
  const jobs = useMemo(
    () =>
      records.filter(
        (record) =>
          record.module === "jobs" &&
          !record.notes.includes(calculationMarker) &&
          !/^(Fresatura|Foratura|Tornitura)\s*·/i.test(record.title)
      ),
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
          (record.module === "cutting" &&
            !record.notes.includes(importedParameterMarker)) ||
          (record.module === "jobs" &&
            (record.notes.includes(calculationMarker) ||
              /^(Fresatura|Foratura|Tornitura)\s*·/i.test(record.title)))
      ),
    [records]
  );
  const catalogParameters = useMemo(
    () =>
      records.filter(
        (record) => record.notes.includes(importedParameterMarker)
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
  const [section, setSection] = useState<CuttingSection>("calculator");
  const [supportPanel, setSupportPanel] = useState<SupportPanel>(null);
  const [strategy, setStrategy] =
    useState<CuttingStrategy>("manual");
  const [catalogBase, setCatalogBase] =
    useState<CatalogBaseValues | null>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [outcome, setOutcome] =
    useState<CuttingOutcome>("Da testare");
  const [favorite, setFavorite] = useState(false);
  const [experienceNotes, setExperienceNotes] = useState("");

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
  const selectedMaterial = materials.find(
    (material) => material.id === selectedMaterialId
  );
  const spindleLimit = parseSpindleLimit(selectedMachine?.spindle || "");
  const machinePowerLimit = parseMachineNoteLimit(
    selectedMachine?.notes || "",
    /potenza(?:\s+massima)?[^\d]*(\d+(?:[.,]\d+)?)\s*k\s*w/i
  );
  const machineFeedLimit = parseMachineNoteLimit(
    selectedMachine?.notes || "",
    /avanzamento(?:\s+massimo)?[^\d]*(\d+(?:[.,]\d+)?)\s*mm\s*\/\s*min/i
  );
  const machineTorqueLimit = parseMachineNoteLimit(
    selectedMachine?.notes || "",
    /coppia(?:\s+massima)?[^\d]*(\d+(?:[.,]\d+)?)\s*n\s*m/i
  );
  const estimatedTorque = rpm > 0 ? (9550 * power) / rpm : 0;
  const exceedsSpindle = spindleLimit > 0 && rpm > spindleLimit;
  const exceedsFeed = machineFeedLimit > 0 && feed > machineFeedLimit;
  const exceedsPower = machinePowerLimit > 0 && power > machinePowerLimit;
  const exceedsTorque =
    machineTorqueLimit > 0 && estimatedTorque > machineTorqueLimit;
  const machineChecks = useMemo<MachineCheck[]>(() => {
    if (!selectedMachine) return [];
    const checks: MachineCheck[] = [];

    if (spindleLimit > 0) {
      checks.push({
        label: "Numero di giri",
        value: `${formatNumber(rpm)} giri/min`,
        limit: `${formatNumber(spindleLimit)} giri/min`,
        exceeded: exceedsSpindle,
      });
    }
    if (machineFeedLimit > 0) {
      checks.push({
        label: "Avanzamento",
        value: `${formatNumber(feed)} mm/min`,
        limit: `${formatNumber(machineFeedLimit)} mm/min`,
        exceeded: exceedsFeed,
      });
    }
    if (machinePowerLimit > 0) {
      checks.push({
        label: "Potenza stimata",
        value: `${formatNumber(power, 2)} kW`,
        limit: `${formatNumber(machinePowerLimit, 2)} kW`,
        exceeded: exceedsPower,
      });
    }
    if (machineTorqueLimit > 0) {
      checks.push({
        label: "Coppia stimata",
        value: `${formatNumber(estimatedTorque, 1)} Nm`,
        limit: `${formatNumber(machineTorqueLimit, 1)} Nm`,
        exceeded: exceedsTorque,
      });
    }

    return checks;
  }, [
    exceedsFeed,
    exceedsPower,
    exceedsSpindle,
    exceedsTorque,
    estimatedTorque,
    feed,
    machineFeedLimit,
    machinePowerLimit,
    machineTorqueLimit,
    power,
    rpm,
    selectedMachine,
    spindleLimit,
  ]);
  const validCalculation =
    numeric.diameter > 0 &&
    numeric.cuttingSpeed > 0 &&
    activeFeedValue > 0 &&
    (operation !== "milling" || numeric.teeth > 0);
  const setupReadiness = [
    {
      label: "Codice articolo",
      complete: Boolean(values.articleCode.trim()),
      detail: values.articleCode.trim() || "Consigliato per confronti precisi",
    },
    {
      label: "Materiale",
      complete: true,
      detail: selectedMaterial?.title || `Selezione manuale · ISO ${materialGroup}`,
    },
    {
      label: "Parametri di taglio",
      complete: validCalculation,
      detail: validCalculation
        ? "Diametro, Vc e avanzamento validi"
        : "Completa diametro, Vc, avanzamento e taglienti",
    },
    {
      label: "Macchina",
      complete: Boolean(selectedMachineId),
      detail: selectedMachine
        ? `${selectedMachine.brand} ${selectedMachine.model}`.trim()
        : "Consigliata per verificare i limiti",
    },
    {
      label: "Nome del calcolo",
      complete: Boolean(calculationName.trim()),
      detail: calculationName.trim() || "Obbligatorio per il salvataggio",
    },
  ];

  function updateValue(key: keyof CalculatorValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    if (
      key === "cuttingSpeed" ||
      key === "feedPerTooth" ||
      key === "feedPerRev"
    ) {
      setStrategy("manual");
    }
    setLocalError("");
  }

  function applyStrategy(nextStrategy: CuttingStrategy) {
    setStrategy(nextStrategy);
    if (nextStrategy === "manual" || !catalogBase) return;

    const factor =
      nextStrategy === "conservative"
        ? 0.85
        : nextStrategy === "productive"
          ? 1.1
          : 1;
    setValues((current) => ({
      ...current,
      cuttingSpeed: decimalText(catalogBase.cuttingSpeed * factor),
      ...(operation === "milling"
        ? { feedPerTooth: decimalText(catalogBase.feed * factor) }
        : { feedPerRev: decimalText(catalogBase.feed * factor) }),
    }));
  }

  function applyMachineLimits() {
    const speedFactor =
      exceedsSpindle && rpm > 0 ? spindleLimit / rpm : 1;
    const feedAfterSpeed = feed * speedFactor;
    const powerAfterSpeed = power * speedFactor;
    const feedFactor = Math.min(
      1,
      exceedsFeed && feedAfterSpeed > 0
        ? machineFeedLimit / feedAfterSpeed
        : 1,
      exceedsPower && powerAfterSpeed > 0
        ? machinePowerLimit / powerAfterSpeed
        : 1,
      exceedsTorque && estimatedTorque > 0
        ? machineTorqueLimit / estimatedTorque
        : 1
    );

    setValues((current) => ({
      ...current,
      cuttingSpeed: decimalText(numeric.cuttingSpeed * speedFactor),
      ...(operation === "milling"
        ? { feedPerTooth: decimalText(numeric.feedPerTooth * feedFactor) }
        : { feedPerRev: decimalText(numeric.feedPerRev * feedFactor) }),
    }));
    setStrategy("manual");
    notifySuccess("Parametri adeguati ai limiti macchina rilevati.");
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
    setCatalogBase(null);
    setStrategy("manual");
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
    setStrategy("manual");
    setCatalogBase(null);
    setSelectedJobId("");
    setOutcome("Da testare");
    setFavorite(false);
    setExperienceNotes("");
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
    setSelectedJobId(savedText(record.notes, "Lavorazione ID"));
    setMaterialGroup(savedMaterialGroup(record.notes));
    setStrategy(savedStrategy(record.notes));
    setCatalogBase(null);
    setOutcome(savedOutcome(record.notes));
    setFavorite(/^s[iì]$/i.test(savedText(record.notes, "Preferito")));
    setExperienceNotes(savedText(record.notes, "Note risultato"));
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
    setSection("calculator");
    setLocalError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function useCatalogParameter(record: RecordItem) {
    const parameterOperation = savedOperation(record);

    if (!parameterOperation) {
      setLocalError("Il tipo di lavorazione del parametro non è riconoscibile.");
      return;
    }

    const catalogId = savedText(record.notes, "Catalogo ID");
    const savedFeedPerTooth = savedNumber(record.notes, "fz");
    const savedFeedPerRev = savedNumber(record.notes, "f");
    const feedPerTooth =
      parseNumber(savedFeedPerTooth) > 0
        ? savedFeedPerTooth
        : parameterOperation === "milling"
          ? savedFeedPerRev
          : "0";
    const tool = record.tool ? normalizeToolDetails(record) : null;
    const parameterFeed = parseNumber(
      parameterOperation === "milling"
        ? feedPerTooth
        : parseNumber(savedFeedPerRev) > 0
          ? savedFeedPerRev
          : savedFeedPerTooth
    );
    const parameterSpeed = parseNumber(savedNumber(record.notes, "Vc"));

    setOperation(parameterOperation);
    setTab(parameterOperation);
    setEditingCalculationId("");
    setCalculationName("");
    setOutcome("Da testare");
    setFavorite(false);
    setExperienceNotes("");
    setSelectedToolId("");
    setStrategy("recommended");
    setCatalogBase({
      cuttingSpeed: parameterSpeed,
      feed: parameterFeed,
    });
    setSelectedCatalogId(
      catalogs.some((catalog) => catalog.id === catalogId)
        ? catalogId
        : ""
    );
    setValues((current) => ({
      ...current,
      articleCode:
        savedText(record.notes, "Codice articolo") || tool?.code || "",
      diameter:
        positiveSavedNumber(record.notes, "Diametro") ||
        positiveText(tool?.diameter || "", "0"),
      teeth:
        positiveSavedNumber(record.notes, "Taglienti") ||
        positiveText(tool?.fluteCount || "", "0"),
      cuttingSpeed: savedNumber(record.notes, "Vc"),
      feedPerTooth,
      feedPerRev:
        parseNumber(savedFeedPerRev) > 0
          ? savedFeedPerRev
          : parameterOperation !== "milling"
            ? savedFeedPerTooth
            : "0",
      axialDepth: savedNumber(record.notes, "ap"),
      radialWidth: savedNumber(record.notes, "ae"),
      targetChipThickness:
        parameterOperation === "milling"
          ? feedPerTooth
          : current.targetChipThickness,
    }));
    setSection("calculator");
    setLocalError("");
    notifySuccess(
      `Parametri “${record.title}” caricati nel calcolatore.`
    );
    window.requestAnimationFrame(() => {
      document
        .querySelector(".cuttingTabs")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function useHistoricalValues(historicalValues: HistoricalValues) {
    setValues((current) => ({
      ...current,
      diameter: historicalValues.diameter,
      teeth:
        operation === "milling"
          ? historicalValues.teeth
          : current.teeth,
      cuttingSpeed: historicalValues.cuttingSpeed,
      feedPerTooth:
        operation === "milling"
          ? historicalValues.feedPerTooth
          : current.feedPerTooth,
      feedPerRev:
        operation === "milling"
          ? current.feedPerRev
          : historicalValues.feedPerRev,
      axialDepth: historicalValues.axialDepth,
      radialWidth:
        operation === "milling"
          ? historicalValues.radialWidth
          : current.radialWidth,
      targetChipThickness:
        operation === "milling"
          ? historicalValues.feedPerTooth
          : current.targetChipThickness,
    }));
    setCatalogBase(null);
    setStrategy("manual");
    setOutcome("Da testare");
    setSection("calculator");
    setLocalError("");
    notifySuccess("Valori medi della tua esperienza caricati nel calcolatore.");
    window.requestAnimationFrame(() => {
      document
        .querySelector(".cuttingTabs")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

  async function removeCatalogParameters(recordsToDelete: RecordItem[]) {
    if (!recordsToDelete.length) return false;

    const confirmed = window.confirm(
      recordsToDelete.length === 1
        ? `Eliminare il parametro catalogo “${recordsToDelete[0].title}”? Il PDF originale resterà nell’archivio.`
        : `Eliminare definitivamente i ${recordsToDelete.length} parametri catalogo selezionati? I PDF originali resteranno nell’archivio.`
    );

    if (!confirmed) return false;

    try {
      await deleteCalculations(recordsToDelete);
      notifySuccess(
        recordsToDelete.length === 1
          ? "Parametro catalogo eliminato."
          : `${recordsToDelete.length} parametri catalogo eliminati.`
      );
      return true;
    } catch {
      // L'errore viene già mostrato da useRecords.
      return false;
    }
  }

  async function clearSavedHistory(recordsToDelete: RecordItem[]) {
    if (!recordsToDelete.length) return;

    const label = operationLabels[operation].toLowerCase();
    const confirmed = window.confirm(
      `Eliminare definitivamente tutto lo storico di ${label} (${recordsToDelete.length} elementi)? Cataloghi, manuali e utensili non verranno eliminati.`
    );

    if (!confirmed) return;

    try {
      await deleteCalculations(recordsToDelete);

      if (
        recordsToDelete.some(
          (record) => record.id === editingCalculationId
        )
      ) {
        resetCalculationForm();
      }

      notifySuccess(
        `Storico di ${label} eliminato correttamente.`
      );
    } catch {
      // L'errore viene già mostrato da useRecords.
    }
  }

  async function toggleSavedFavorite(record: RecordItem) {
    const nextFavorite = !/^s[iì]$/i.test(
      savedText(record.notes, "Preferito")
    );

    try {
      await saveCalculation({
        ...record,
        notes: replaceNoteValue(
          record.notes,
          "Preferito",
          nextFavorite ? "Sì" : "No"
        ),
        updatedAt: new Date().toISOString(),
      });
      notifySuccess(
        nextFavorite
          ? `Calcolo “${record.title}” aggiunto ai preferiti.`
          : `Calcolo “${record.title}” rimosso dai preferiti.`
      );
    } catch {
      // L'errore viene già mostrato da useRecords.
    }
  }

  function printSavedCalculation(record: RecordItem) {
    const printWindow = window.open("", "_blank", "width=900,height=760");

    if (!printWindow) {
      setLocalError(
        "Il browser ha bloccato la scheda di stampa. Consenti i popup e riprova."
      );
      return;
    }

    const rows = record.notes
      .split("\n")
      .filter((line) => line && !line.startsWith("["))
      .map((line) => {
        const separator = line.indexOf(":");
        const label = separator >= 0 ? line.slice(0, separator) : "Nota";
        const value = separator >= 0 ? line.slice(separator + 1) : line;
        return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value.trim())}</td></tr>`;
      })
      .join("");

    printWindow.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escapeHtml(record.title)}</title><style>body{font-family:Arial,sans-serif;color:#10243d;margin:34px}header{border-bottom:3px solid #1769e0;padding-bottom:14px;margin-bottom:22px}header span{color:#1769e0;font-weight:700;font-size:12px}h1{margin:5px 0;font-size:26px}p{color:#53697d}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d8e2eb;padding:8px 10px;text-align:left;vertical-align:top}th{width:32%;background:#eef5fc}footer{margin-top:22px;color:#718395;font-size:10px}@media print{button{display:none}}</style></head><body><header><span>SMART CNC MANAGER · SCHEDA DI LAVORAZIONE</span><h1>${escapeHtml(record.title)}</h1><p>${escapeHtml(record.subtitle)}</p></header><table>${rows}</table><footer>Documento generato il ${escapeHtml(new Date().toLocaleString("it-IT"))}. Verificare sempre i dati del costruttore e i limiti della macchina.</footer><script>window.onload=()=>window.print();<\/script></body></html>`);
    printWindow.document.close();
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
    const job = jobs.find((item) => item.id === selectedJobId);

    const notes = [
      calculationMarker,
      `Tipo calcolo: ${operation}`,
      `Operazione: ${operationLabel}`,
      `Codice articolo: ${code}`,
      selectedToolId ? `Utensile ID: ${selectedToolId}` : "",
      selectedMaterialId ? `Materiale ID: ${selectedMaterialId}` : "",
      selectedCatalogId ? `Catalogo ID: ${selectedCatalogId}` : "",
      selectedJobId ? `Lavorazione ID: ${selectedJobId}` : "",
      tool ? `Utensile: ${tool.title}` : "Utensile: inserimento manuale",
      material
        ? `Materiale: ${material.title} (ISO ${materialGroup})`
        : `Materiale: manuale (ISO ${materialGroup})`,
      catalog ? `Catalogo di riferimento: ${catalog.title}` : "",
      job ? `Lavorazione collegata: ${job.title}` : "",
      `Strategia: ${strategyLabel(strategy)}`,
      `Esito: ${outcome}`,
      `Preferito: ${favorite ? "Sì" : "No"}`,
      experienceNotes.trim()
        ? `Note risultato: ${singleLine(experienceNotes)}`
        : "",
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
        status: outcome === "Da testare" ? "Salvato" : outcome,
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
    <section className="cuttingCalculator cuttingOrganized">
      <div className="pageHead cuttingPageHead cuttingOrganizedHead">
        <div>
          <span>CALCOLATORE CNC PROFESSIONALE</span>
          <h1>Parametri di taglio</h1>
          <p>
            Un flusso ordinato: scegli i dati, calcola, verifica e salva.
            Cataloghi e storico restano in aree separate.
          </p>
        </div>
        <div className="cuttingHeadIcon" aria-hidden="true">
          <Calculator size={28} />
        </div>
      </div>

      <nav className="cuttingSectionNav" aria-label="Sezioni parametri di taglio">
        <button type="button" className={section === "calculator" ? "active" : ""} onClick={() => setSection("calculator")}>
          <span><Calculator size={19} /></span>
          <div><b>Calcolo</b><small>Inserimento e risultati</small></div>
        </button>
        <button type="button" className={section === "library" ? "active" : ""} onClick={() => setSection("library")}>
          <span><Library size={19} /></span>
          <div><b>Parametri catalogo</b><small>Utensili già estratti</small></div>
          <em>{catalogParameters.length}</em>
        </button>
        <button type="button" className={section === "catalogs" ? "active" : ""} onClick={() => setSection("catalogs")}>
          <span><UploadCloud size={19} /></span>
          <div><b>Cataloghi PDF</b><small>Carica e analizza</small></div>
          <em>{catalogs.length}</em>
        </button>
        <button type="button" className={section === "history" ? "active" : ""} onClick={() => setSection("history")}>
          <span><History size={19} /></span>
          <div><b>Storico</b><small>Calcoli salvati</small></div>
          <em>{savedCalculations.length}</em>
        </button>
      </nav>

      {section === "calculator" && (
        <div className="cuttingOrderedView">
          <section className="cuttingFlowStep">
            <header className="cuttingFlowHead">
              <span>1</span>
              <div><small>PREPARAZIONE</small><h2>Dati di partenza</h2><p>Seleziona utensile, materiale e macchina oppure compila manualmente.</p></div>
              {(selectedToolId || values.articleCode || selectedMaterialId || selectedMachineId) && <CheckCircle2 size={20} />}
            </header>

            <div className="cuttingSourcePanel cuttingSourceOrdered">
              <div className="cuttingSourceGrid">
                <label>
                  <span>Utensile dall’archivio</span>
                  <select value={selectedToolId} onChange={(event) => selectTool(event.target.value)}>
                    <option value="">Inserimento manuale</option>
                    {tools.map((record) => {
                      const tool = normalizeToolDetails(record);
                      const diameter = parseToolNumber(tool.diameter);
                      return <option key={record.id} value={record.id}>{[tool.code, record.title, diameter > 0 ? `Ø ${formatNumber(diameter)} mm` : ""].filter(Boolean).join(" · ")}</option>;
                    })}
                  </select>
                </label>
                <label>
                  <span>Materiale da lavorare</span>
                  <select value={selectedMaterialId} onChange={(event) => selectMaterial(event.target.value)}>
                    <option value="">Materiale manuale</option>
                    {materials.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}
                  </select>
                </label>
                <label>
                  <span>Gruppo ISO</span>
                  <select value={materialGroup} onChange={(event) => setMaterialGroup(event.target.value as MaterialIsoGroup)}>
                    <option value="P">P · Acciai</option><option value="M">M · Inossidabili</option><option value="K">K · Ghise</option><option value="N">N · Non ferrosi</option><option value="S">S · Superleghe</option><option value="H">H · Temprati</option>
                  </select>
                </label>
                <label>
                  <span>Macchina</span>
                  <select value={selectedMachineId} onChange={(event) => setSelectedMachineId(event.target.value)}>
                    <option value="">Nessuna macchina</option>
                    {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.brand} {machine.model}</option>)}
                  </select>
                </label>
                <label>
                  <span>Catalogo di riferimento</span>
                  <select value={selectedCatalogId} onChange={(event) => setSelectedCatalogId(event.target.value)}>
                    <option value="">Nessun catalogo</option>
                    {catalogs.map((catalog) => <option key={catalog.id} value={catalog.id}>{catalog.title}</option>)}
                  </select>
                </label>
                <label className="cuttingArticleCode">
                  <span>Codice articolo</span>
                  <input value={values.articleCode} onChange={(event) => updateValue("articleCode", event.target.value)} placeholder="Codice utensile o inserimento manuale" />
                </label>
              </div>
            </div>
          </section>

          <section className="cuttingFlowStep cuttingCalculationStep">
            <header className="cuttingFlowHead">
              <span>2</span>
              <div><small>CALCOLO PRINCIPALE</small><h2>Inserimento parametri e risultati</h2><p>Scegli la lavorazione. Vengono mostrati solo i campi necessari.</p></div>
              {validCalculation && <CheckCircle2 size={20} />}
            </header>

            <div className="cuttingTabs" role="tablist" aria-label="Calcoli disponibili">
              {([["milling", "Fresatura"], ["drilling", "Foratura"], ["turning", "Tornitura"], ["chip", "TPC"], ["power", "Potenza"]] as [CalculatorTab, string][]).map(([tabId, label]) => (
                <button key={tabId} type="button" className={tab === tabId ? "active" : ""} onClick={() => openTab(tabId)} role="tab" aria-selected={tab === tabId}>{label}</button>
              ))}
            </div>

            <div className="cuttingWorkspace">
              {tab === "milling" && <BaseOperationFields operation="milling" values={values} updateValue={updateValue} />}
              {tab === "drilling" && <BaseOperationFields operation="drilling" values={values} updateValue={updateValue} />}
              {tab === "turning" && <BaseOperationFields operation="turning" values={values} updateValue={updateValue} />}

              {tab === "chip" && (
                <div className="cuttingPanel">
                  <div className="cuttingPanelHead"><div><span>SPESSORE MASSIMO DEL TRUCIOLO</span><h2>Compensazione TPC</h2></div><small>Calcolo riferito alla fresatura</small></div>
                  <div className="cuttingInputGrid">
                    <NumberField label="Diametro" unit="mm" value={values.diameter} onChange={(value) => updateValue("diameter", value)} />
                    <NumberField label="Larghezza ae" unit="mm" value={values.radialWidth} onChange={(value) => updateValue("radialWidth", value)} />
                    <NumberField label="Avanzamento fz" unit="mm/dente" value={values.feedPerTooth} onChange={(value) => updateValue("feedPerTooth", value)} />
                    <NumberField label="Angolo di attacco φ" unit="°" value={values.approachAngle} onChange={(value) => updateValue("approachAngle", value)} />
                    <NumberField label="hmax desiderato" unit="mm" value={values.targetChipThickness} onChange={(value) => updateValue("targetChipThickness", value)} />
                  </div>
                  <div className="cuttingResults three"><ResultCard label="Rapporto ae / D" value={numeric.diameter > 0 ? numeric.radialWidth / numeric.diameter : 0} decimals={3} /><ResultCard label="Spessore hmax" value={maximumChipThickness} unit="mm" decimals={3} /><ResultCard label="fz compensato" value={compensatedFeedPerTooth} unit="mm/dente" decimals={3} accent /></div>
                </div>
              )}

              {tab === "power" && (
                <div className="cuttingPanel">
                  <div className="cuttingPanelHead"><div><span>STIMA TECNOLOGICA</span><h2>Potenza e tempo di lavorazione</h2></div><small>{operationLabels[operation]} · ISO {materialGroup}</small></div>
                  <div className="cuttingInputGrid">
                    <NumberField label="Profondità ap" unit="mm" value={values.axialDepth} onChange={(value) => updateValue("axialDepth", value)} />
                    {operation === "milling" && <NumberField label="Larghezza ae" unit="mm" value={values.radialWidth} onChange={(value) => updateValue("radialWidth", value)} />}
                    <NumberField label="Lunghezza lavorata" unit="mm" value={values.length} onChange={(value) => updateValue("length", value)} />
                    <NumberField label="Numero passate" value={values.passes} onChange={(value) => updateValue("passes", value)} />
                  </div>
                  <div className="cuttingResults three"><ResultCard label="Asportazione MRR" value={mrr} unit="cm³/min" decimals={2} /><ResultCard label="Potenza stimata" value={power} unit="kW" decimals={2} accent /><ResultCard label="Tempo stimato" value={machiningTime} unit="min" decimals={2} /></div>
                  <p className="cuttingDisclaimer">La potenza è una stima orientativa. Verifica sempre i limiti della macchina e i dati del costruttore.</p>
                </div>
              )}

              {(tab === "milling" || tab === "drilling" || tab === "turning") && <div className="cuttingResults cuttingPrimaryResults"><ResultCard label="Numero di giri n" value={rpm} unit="giri/min" accent /><ResultCard label="Velocità avanzamento Vf" value={feed} unit="mm/min" accent /></div>}
            </div>
          </section>

          <section className="cuttingFlowStep cuttingSupportStep">
            <header className="cuttingFlowHead">
              <span>3</span>
              <div><small>VERIFICA FACOLTATIVA</small><h2>Analisi e ottimizzazione</h2><p>Apri soltanto lo strumento che ti serve, senza affollare il calcolo.</p></div>
            </header>
            <div className="cuttingSupportChooser">
              <button type="button" className={supportPanel === "analysis" ? "active" : ""} onClick={() => setSupportPanel(supportPanel === "analysis" ? null : "analysis")}><CheckCircle2 size={18} /><span><b>Analisi setup</b><small>Rischi, limiti e qualità del calcolo</small></span></button>
              <button type="button" className={supportPanel === "professional" ? "active" : ""} onClick={() => setSupportPanel(supportPanel === "professional" ? null : "professional")}><Settings2 size={18} /><span><b>Strategia e macchina</b><small>Profilo, commessa ed esito</small></span></button>
              <button type="button" className={supportPanel === "experience" ? "active" : ""} onClick={() => setSupportPanel(supportPanel === "experience" ? null : "experience")}><History size={18} /><span><b>Esperienza storica</b><small>Valori medi già utilizzati</small></span></button>
            </div>
            {supportPanel && (
              <div className="cuttingSupportContent">
                {supportPanel === "analysis" && <SetupAnalysisPanel operation={operation} materialGroup={materialGroup} strategy={strategyLabel(strategy)} articleCode={values.articleCode} machineName={selectedMachine ? `${selectedMachine.brand} ${selectedMachine.model}`.trim() : ""} valid={validCalculation} metrics={{ rpm, feed, mrr, power, torque: estimatedTorque, machiningTime }} limits={{ spindle: spindleLimit, feed: machineFeedLimit, power: machinePowerLimit, torque: machineTorqueLimit }} inputs={{ diameter: numeric.diameter, teeth: numeric.teeth, cuttingSpeed: numeric.cuttingSpeed, feedValue: activeFeedValue, axialDepth: numeric.axialDepth, radialWidth: numeric.radialWidth, length: numeric.length, passes: numeric.passes }} onApplyMachineLimits={applyMachineLimits} />}
                {supportPanel === "professional" && <ProfessionalCuttingPanel strategy={strategy} materialGroup={materialGroup} hasCatalogBase={Boolean(catalogBase)} onStrategyChange={applyStrategy} jobs={jobs} selectedJobId={selectedJobId} onJobChange={setSelectedJobId} outcome={outcome} onOutcomeChange={setOutcome} favorite={favorite} onFavoriteChange={setFavorite} experienceNotes={experienceNotes} onExperienceNotesChange={setExperienceNotes} machineName={selectedMachine ? `${selectedMachine.brand} ${selectedMachine.model}`.trim() : ""} machineChecks={machineChecks} onApplyMachineLimits={applyMachineLimits} />}
                {supportPanel === "experience" && <HistoricalRecommendation records={savedCalculations} operation={operation} materialGroup={materialGroup} machineId={selectedMachineId} articleCode={values.articleCode} busy={busy} readiness={setupReadiness} onUse={useHistoricalValues} />}
              </div>
            )}
          </section>

          <section className="cuttingFlowStep cuttingSaveStep">
            <header className="cuttingFlowHead"><span>4</span><div><small>ARCHIVIAZIONE</small><h2>Salva il calcolo</h2><p>Assegna un nome chiaro. Lo ritroverai nella sezione Storico.</p></div></header>
            {localError && <div className="cuttingWarning error"><AlertTriangle size={18} />{localError}</div>}
            <div className="cuttingActions">
              <label className="cuttingSaveName"><span>Nome del calcolo *</span><input value={calculationName} onChange={(event) => { setCalculationName(event.target.value); setLocalError(""); }} placeholder={`Es. ${operationLabels[operation]} supporto 125`} maxLength={80} /></label>
              <div className="cuttingSaveButtons">
                {editingCalculationId && <button type="button" onClick={resetCalculationForm} disabled={busy}>Annulla modifica</button>}
                <button type="button" className="primary" onClick={handleSave} disabled={busy || !validCalculation}><Save size={17} />{busy ? "Salvataggio…" : editingCalculationId ? "Salva modifiche" : "Salva nello storico"}</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {section === "library" && (
        <div className="cuttingStandaloneSection">
          <header><span><Library size={21} /></span><div><small>ARCHIVIO STRUTTURATO</small><h2>Parametri estratti dai cataloghi</h2><p>Scegli una scheda verificata e trasferiscila nel calcolatore.</p></div></header>
          <CatalogParameterLibrary records={catalogParameters} catalogs={catalogs} operation={operation} busy={busy} onUse={useCatalogParameter} onDelete={removeCatalogParameters} onManageCatalogs={() => setSection("catalogs")} />
        </div>
      )}

      {section === "catalogs" && (
        <div className="cuttingStandaloneSection">
          <header><span><UploadCloud size={21} /></span><div><small>GESTIONE SORGENTI</small><h2>Cataloghi PDF</h2><p>Carica, analizza e controlla i dati prima dell’importazione.</p></div></header>
          <CatalogImporter existingParameters={catalogParameters} catalogs={catalogs} busy={busy} saveCatalog={saveCatalog} saveImportedParameters={saveImportedParameters} deleteCatalog={deleteCatalog} notifySuccess={notifySuccess} selectCatalog={setSelectedCatalogId} />
        </div>
      )}

      {section === "history" && (
        <div className="cuttingStandaloneSection">
          <header><span><Archive size={21} /></span><div><small>RISULTATI CONSOLIDATI</small><h2>Storico dei calcoli</h2><p>Consulta, modifica, stampa o riutilizza i calcoli salvati.</p></div></header>
          <div className="cuttingHistoryOperationSwitch">
            {(["milling", "drilling", "turning"] as CuttingOperation[]).map((value) => <button key={value} type="button" className={operation === value ? "active" : ""} onClick={() => { setOperation(value); setTab(value); }}>{operationLabels[value]}<em>{savedCalculations.filter((record) => savedOperation(record) === value).length}</em></button>)}
          </div>
          <SavedCalculations records={savedCalculations} operation={operation} busy={busy} onEdit={editSavedCalculation} onDelete={removeSavedCalculation} onClear={clearSavedHistory} onFavorite={toggleSavedFavorite} onPrint={printSavedCalculation} />
        </div>
      )}
    </section>
  );
}

function SavedCalculations({
  records,
  operation,
  busy,
  onEdit,
  onDelete,
  onClear,
  onFavorite,
  onPrint,
}: {
  records: RecordItem[];
  operation: CuttingOperation;
  busy: boolean;
  onEdit: (record: RecordItem) => void;
  onDelete: (record: RecordItem) => void | Promise<void>;
  onClear: (records: RecordItem[]) => void | Promise<void>;
  onFavorite: (record: RecordItem) => void | Promise<void>;
  onPrint: (record: RecordItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(24);
  const matchingRecords = records
    .filter((record) => savedOperation(record) === operation)
    .sort(
      (first, second) =>
        Number(isFavorite(second)) - Number(isFavorite(first))
    );
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
        <div className="cuttingSavedHeadActions">
          <b>{matchingRecords.length}</b>
          {matchingRecords.length > 0 && (
            <button
              type="button"
              onClick={() => onClear(matchingRecords)}
              disabled={busy}
            >
              <Trash2 size={14} />
              Elimina storico
            </button>
          )}
        </div>
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
                  <div>
                    {isFavorite(record) && (
                      <Star size={13} fill="currentColor" />
                    )}
                    <small>{formatDateTime(record.updatedAt)}</small>
                  </div>
                </div>
                <b>{record.title}</b>
                <p>{record.subtitle}</p>
                {record.machine && <small>Macchina: {record.machine}</small>}
                <small>
                  Esito: {savedText(record.notes, "Esito") || "Da testare"}
                  {savedText(record.notes, "Strategia")
                    ? ` · ${savedText(record.notes, "Strategia")}`
                    : ""}
                </small>
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
                    onClick={() => onFavorite(record)}
                    disabled={busy}
                    title={isFavorite(record) ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                    aria-label={isFavorite(record) ? `Rimuovi ${record.title} dai preferiti` : `Aggiungi ${record.title} ai preferiti`}
                  >
                    <Star size={15} fill={isFavorite(record) ? "currentColor" : "none"} />
                    {isFavorite(record) ? "Preferito" : "Preferiti"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onPrint(record)}
                    disabled={busy}
                    title="Stampa o salva in PDF"
                    aria-label={`Stampa ${record.title}`}
                  >
                    <Printer size={15} />
                    PDF
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedConfigured =
    parseNumber(values.axialDepth) > 0 ||
    parseNumber(values.radialWidth) > 0 ||
    parseNumber(values.length) > 0 ||
    parseNumber(values.passes) > 1;

  return (
    <div className="cuttingPanel">
      <div className="cuttingPanelHead">
        <div>
          <span>DATI DI BASE</span>
          <h2>{operationLabels[operation]}</h2>
        </div>
        <small>Valori modificabili</small>
      </div>

      <div className="cuttingInputGrid cuttingInputGridBase">
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
      </div>

      <button
        type="button"
        className={`cuttingAdvancedToggle ${advancedOpen ? "active" : ""}`}
        onClick={() => setAdvancedOpen((current) => !current)}
        aria-expanded={advancedOpen}
      >
        <Settings2 size={16} />
        <span>
          <b>Parametri avanzati</b>
          <small>ap, ae, lunghezza lavorata e numero passate</small>
        </span>
        {advancedConfigured && <em>Valori inseriti</em>}
        <ChevronDown size={16} />
      </button>

      {advancedOpen && (
        <div className="cuttingAdvancedBlock">
          <div className="cuttingInputGrid">
            <NumberField label={operation === "turning" ? "Profondità passata ap" : "Profondità assiale ap"} unit="mm" value={values.axialDepth} onChange={(value) => updateValue("axialDepth", value)} />
            {operation === "milling" && (
              <NumberField label="Larghezza radiale ae" unit="mm" value={values.radialWidth} onChange={(value) => updateValue("radialWidth", value)} />
            )}
            <NumberField label={operation === "drilling" ? "Profondità foro" : "Lunghezza lavorata"} unit="mm" value={values.length} onChange={(value) => updateValue("length", value)} />
            <NumberField label="Numero passate" value={values.passes} onChange={(value) => updateValue("passes", value)} />
          </div>
        </div>
      )}
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

function parseMachineNoteLimit(value: string, pattern: RegExp) {
  const raw = value.match(pattern)?.[1];
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function strategyLabel(strategy: CuttingStrategy) {
  if (strategy === "conservative") return "Prudente";
  if (strategy === "recommended") return "Consigliato";
  if (strategy === "productive") return "Produttivo";
  return "Manuale";
}

function savedStrategy(notes: string): CuttingStrategy {
  const value = savedText(notes, "Strategia").toLowerCase();
  if (value === "prudente") return "conservative";
  if (value === "consigliato") return "recommended";
  if (value === "produttivo") return "productive";
  return "manual";
}

function savedOutcome(notes: string): CuttingOutcome {
  const value = savedText(notes, "Esito") as CuttingOutcome;
  return [
    "Da testare",
    "Ottimo",
    "Regolare",
    "Vibrazioni",
    "Usura elevata",
    "Rottura utensile",
  ].includes(value)
    ? value
    : "Da testare";
}

function isFavorite(record: RecordItem) {
  return /^s[iì]$/i.test(savedText(record.notes, "Preferito"));
}

function singleLine(value: string) {
  return value.replace(/\s*\r?\n\s*/g, " · ").trim();
}

function replaceNoteValue(notes: string, label: string, value: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\n)${escapedLabel}:.*(?=\\n|$)`, "i");
  return pattern.test(notes)
    ? notes.replace(pattern, `$1${label}: ${value}`)
    : `${notes}\n${label}: ${value}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

function savedOperation(record: RecordItem): CuttingOperation | null {
  if (record.notes.includes(importedParameterMarker)) {
    const describedOperation = operationFromImportedDescription(
      `${savedText(record.notes, "Categoria utensile")} ${record.title}`
    );
    if (describedOperation) return describedOperation;
  }

  const explicit = record.notes.match(
    /Tipo calcolo:\s*(milling|drilling|turning)/i
  )?.[1];

  if (explicit) {
    return explicit.toLowerCase() as CuttingOperation;
  }

  if (record.tool?.category) {
    return operationFromTool(record.tool.category);
  }

  if (/^Fresatura\s*·/i.test(record.title)) return "milling";
  if (/^Foratura\s*·/i.test(record.title)) return "drilling";
  if (/^Tornitura\s*·/i.test(record.title)) return "turning";
  return null;
}

function operationFromImportedDescription(
  value: string
): CuttingOperation | null {
  if (/\b(fresa|frese|milling|mill)\b/i.test(value)) return "milling";
  if (/\b(punta|punte|drill|maschio|maschi|tap|bareno|alesatore|alesatori|reamer)\b/i.test(value)) {
    return "drilling";
  }
  if (/\b(tornitura|turning|inserto|inserti|placchetta|placchette|cnmg|dnmg|wnmg)\b/i.test(value)) {
    return "turning";
  }
  return null;
}

function positiveSavedNumber(notes: string, label: string) {
  const value = savedNumber(notes, label);
  return parseNumber(value) > 0 ? value : "";
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
