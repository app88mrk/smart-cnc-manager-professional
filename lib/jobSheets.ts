import {
  normalizeToolDetails,
  parseToolNumber,
} from "./tools.ts";
import type {
  JobQualityCheck,
  JobSheetDetails,
  JobSheetOperation,
  Machine,
  RecordItem,
} from "../types/index.ts";

export const JOB_SHEET_MARKER = "[SCHEDA_LAVORAZIONE_CNC_V1]";

export function createEmptyJobRecord(): RecordItem {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    module: "jobs",
    title: "",
    subtitle: "",
    status: "Pianificata",
    machineId: "",
    machine: "",
    notes: JOB_SHEET_MARKER,
    jobSheet: createEmptyJobSheet(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createEmptyJobSheet(): JobSheetDetails {
  return {
    version: 1,
    orderCode: "",
    customer: "",
    drawingCode: "",
    drawingRevision: "",
    partName: "",
    materialId: "",
    rawMaterial: "",
    quantity: "1",
    dueDate: "",
    clamping: "",
    fixture: "",
    workOffset: "G54",
    setupNotes: "",
    estimatedSetupMinutes: "",
    actualSetupMinutes: "",
    operations: [createJobOperation(1)],
    qualityChecks: [],
    operator: "",
    producedQuantity: "0",
    scrapQuantity: "0",
    outcome: "Da verificare",
    startedAt: "",
    completedAt: "",
    finalNotes: "",
    approved: false,
    accountedToolMinutes: {},
  };
}

export function createJobOperation(sequence: number): JobSheetOperation {
  return {
    id: crypto.randomUUID(),
    sequence,
    name: `OP${String(sequence * 10).padStart(2, "0")}`,
    description: "",
    toolId: "",
    programId: "",
    calculationId: "",
    estimatedMinutes: "",
    actualMinutes: "",
    completed: false,
  };
}

export function createQualityCheck(): JobQualityCheck {
  return {
    id: crypto.randomUUID(),
    characteristic: "",
    nominal: "",
    tolerance: "",
    measured: "",
    instrument: "",
    result: "Da controllare",
  };
}

export function normalizeJobSheet(record: RecordItem): JobSheetDetails {
  if (record.jobSheet) {
    return {
      ...createEmptyJobSheet(),
      ...record.jobSheet,
      operations: record.jobSheet.operations?.length
        ? record.jobSheet.operations
        : [createJobOperation(1)],
      qualityChecks: record.jobSheet.qualityChecks || [],
      accountedToolMinutes: record.jobSheet.accountedToolMinutes || {},
    };
  }

  const legacyToolId = noteValue(record.notes, "Utensile ID");
  const legacyMinutes = numeric(
    noteValue(record.notes, "Tempo utensile minuti")
  );
  const accountedMinutes = numeric(
    noteValue(record.notes, "Tempo contabilizzato minuti")
  );

  return {
    ...createEmptyJobSheet(),
    materialId: noteValue(record.notes, "Materiale ID"),
    quantity: noteValue(record.notes, "Quantità") || "1",
    outcome: noteValue(record.notes, "Esito") || "Da verificare",
    finalNotes: noteValue(record.notes, "Note operative"),
    operations: [
      {
        ...createJobOperation(1),
        description: record.title,
        toolId: legacyToolId,
        programId: noteValue(record.notes, "Programma ID"),
        calculationId: noteValue(record.notes, "Calcolo ID"),
        actualMinutes: legacyMinutes ? String(legacyMinutes) : "",
        completed: record.status === "Completata",
      },
    ],
    accountedToolMinutes:
      legacyToolId && accountedMinutes
        ? { [legacyToolId]: accountedMinutes }
        : {},
  };
}

export function buildJobRecord({
  original,
  sheet,
  status,
  machine,
  material,
}: {
  original: RecordItem;
  sheet: JobSheetDetails;
  status: string;
  machine?: Machine;
  material?: RecordItem;
}): RecordItem {
  const timestamp = new Date().toISOString();
  const partName = sheet.partName.trim() || original.title.trim();
  const title = [sheet.orderCode.trim(), partName]
    .filter(Boolean)
    .join(" · ");
  const machineName = machine
    ? `${machine.brand} ${machine.model}`
    : original.machine;
  const completedOperations = sheet.operations.filter(
    (operation) => operation.completed
  ).length;

  return {
    ...original,
    title: title || "Lavorazione CNC",
    subtitle: [
      sheet.customer,
      material?.title,
      machineName,
      `${completedOperations}/${sheet.operations.length} operazioni`,
    ]
      .filter(Boolean)
      .join(" · "),
    status,
    machineId: machine?.id || original.machineId,
    machine: machineName,
    notes: buildSummaryNotes(sheet, status),
    jobSheet: sheet,
    updatedAt: timestamp,
  };
}

export function desiredToolMinutes(
  sheet: JobSheetDetails,
  status: string
) {
  if (status !== "Completata") return {};
  return sheet.operations.reduce<Record<string, number>>(
    (totals, operation) => {
      const minutes = numeric(operation.actualMinutes);
      if (operation.toolId && minutes > 0) {
        totals[operation.toolId] =
          (totals[operation.toolId] || 0) + minutes;
      }
      return totals;
    },
    {}
  );
}

export function buildJobToolUpdates({
  original,
  nextSheet,
  status,
  tools,
}: {
  original: RecordItem;
  nextSheet: JobSheetDetails;
  status: string;
  tools: RecordItem[];
}): { sheet: JobSheetDetails; records: RecordItem[] } {
  const previous = normalizeJobSheet(original).accountedToolMinutes;
  const desired = desiredToolMinutes(nextSheet, status);
  const toolIds = new Set([
    ...Object.keys(previous),
    ...Object.keys(desired),
  ]);
  const timestamp = new Date().toISOString();
  const updates = Array.from(toolIds).flatMap((toolId) => {
    const delta = (desired[toolId] || 0) - (previous[toolId] || 0);
    if (Math.abs(delta) < 0.0001) return [];
    const record = tools.find((tool) => tool.id === toolId);
    if (!record) return [];
    const tool = normalizeToolDetails(record);
    const usedHours = Math.max(
      0,
      parseToolNumber(tool.usedHours) + delta / 60
    );
    const updated: RecordItem = {
      ...record,
      tool: {
        ...tool,
        usedHours: String(Math.round(usedHours * 1000) / 1000),
        lastUsedAt: delta > 0 ? timestamp.slice(0, 10) : tool.lastUsedAt,
      },
      updatedAt: timestamp,
    };
    return [updated];
  });

  return {
    sheet: { ...nextSheet, accountedToolMinutes: desired },
    records: updates,
  };
}

export function jobSheetProgress(record: RecordItem) {
  const sheet = normalizeJobSheet(record);
  const required = [
    sheet.orderCode,
    sheet.partName || record.title,
    record.machineId,
    sheet.materialId,
    sheet.operations.some((operation) => operation.description),
    sheet.operations.some((operation) => operation.toolId),
    sheet.qualityChecks.length > 0,
    sheet.operator,
  ];
  const complete = required.filter(Boolean).length;
  return Math.round((complete / required.length) * 100);
}

export function totalOperationMinutes(
  operations: JobSheetOperation[],
  field: "estimatedMinutes" | "actualMinutes"
) {
  return operations.reduce(
    (total, operation) => total + numeric(operation[field]),
    0
  );
}

export function numeric(value: string) {
  const parsed = Number.parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function noteValue(notes: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return notes.match(new RegExp(`(?:^|\\n)${escaped}:\\s*(.*)$`, "im"))?.[1]?.trim() || "";
}

function buildSummaryNotes(sheet: JobSheetDetails, status: string) {
  return [
    JOB_SHEET_MARKER,
    `Commessa: ${sheet.orderCode}`,
    `Cliente: ${sheet.customer}`,
    `Disegno: ${sheet.drawingCode}${sheet.drawingRevision ? ` Rev. ${sheet.drawingRevision}` : ""}`,
    `Quantità: ${sheet.quantity}`,
    `Operazioni: ${sheet.operations.length}`,
    `Controlli qualità: ${sheet.qualityChecks.length}`,
    `Stato: ${status}`,
    `Esito: ${sheet.outcome}`,
    `Note operative: ${sheet.finalNotes.replace(/\r?\n/g, " • ")}`,
  ].join("\n");
}
