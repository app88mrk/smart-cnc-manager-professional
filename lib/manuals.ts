import type {
  ManualCategory,
  ManualDetails,
  RecordItem,
} from "../types/index.ts";

export const manualCategoryLabels: Record<ManualCategory, string> = {
  catalog: "Cataloghi utensili",
  machine: "Manuali macchina",
  procedure: "Procedure operative",
  drawing: "Disegni e schemi",
  maintenance: "Manutenzione",
  quality: "Qualità e collaudo",
  safety: "Sicurezza",
  other: "Altri documenti",
};

export function createEmptyManualDetails(): ManualDetails {
  return {
    version: 1,
    category: "other",
    documentCode: "",
    manufacturer: "",
    revision: "01",
    issueDate: new Date().toISOString().slice(0, 10),
    reviewDate: "",
    language: "Italiano",
    owner: "",
    confidentiality: "Uso interno",
    tags: [],
    openCount: 0,
    lastOpenedAt: "",
  };
}

export function normalizeManualDetails(record: RecordItem): ManualDetails {
  if (record.manual) {
    return {
      ...createEmptyManualDetails(),
      ...record.manual,
      tags: record.manual.tags || [],
    };
  }

  return {
    ...createEmptyManualDetails(),
    category: inferManualCategory(record),
    documentCode: noteValue(record.notes, "Codice documento"),
    manufacturer: noteValue(record.notes, "Costruttore"),
    revision:
      noteValue(record.notes, "Revisione") ||
      record.subtitle.match(/(?:rev(?:isione)?\.?\s*)([\w.-]+)/i)?.[1] ||
      "01",
    issueDate: noteValue(record.notes, "Data emissione"),
    reviewDate: noteValue(record.notes, "Prossima revisione"),
    language: noteValue(record.notes, "Lingua") || "Italiano",
    owner: noteValue(record.notes, "Responsabile"),
    confidentiality:
      noteValue(record.notes, "Riservatezza") === "Riservato"
        ? "Riservato"
        : noteValue(record.notes, "Riservatezza") === "Pubblico"
          ? "Pubblico"
          : "Uso interno",
    tags: noteValue(record.notes, "Tag")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

export function inferManualCategory(record: RecordItem): ManualCategory {
  if (record.manual?.category) return record.manual.category;
  const source = normalize(
    `${record.title} ${record.subtitle} ${record.notes} ${record.fileName || ""}`
  );
  if (
    record.notes.includes("[CATALOGO_PARAMETRI]") ||
    /catalog|utensil|insert|fres|punte|placchett/.test(source)
  ) return "catalog";
  if (/sicurezz|safety|dpi|risch|emergenza/.test(source)) return "safety";
  if (/qualit|collaud|tolleranz|controll|misur/.test(source)) return "quality";
  if (/manutenz|lubrific|service|ricambi|spare/.test(source)) return "maintenance";
  if (record.machineId || /manuale macchina|istruzioni macchina|cnc/.test(source)) return "machine";
  if (/procedur|checklist|istruzion|setup|attrezzaggio/.test(source)) return "procedure";
  if (/disegn|schema|drawing|dwg|dxf|elettric|pneumatic|idraulic/.test(source)) return "drawing";
  return "other";
}

export function manualCompleteness(record: RecordItem) {
  const details = normalizeManualDetails(record);
  const fields = [
    record.title,
    record.subtitle,
    record.fileUrl,
    details.documentCode,
    details.revision,
    details.issueDate,
    details.category !== "other",
    details.language,
    details.owner,
    details.tags.length > 0,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function isManualReviewOverdue(record: RecordItem) {
  const reviewDate = normalizeManualDetails(record).reviewDate;
  if (!reviewDate || record.status === "Archiviato") return false;
  return dateAtNoon(reviewDate).getTime() < startToday().getTime();
}

export function manualReviewState(record: RecordItem) {
  if (record.status === "Archiviato") return "archived";
  const reviewDate = normalizeManualDetails(record).reviewDate;
  if (!reviewDate) return "unscheduled";
  const days = Math.ceil(
    (dateAtNoon(reviewDate).getTime() - startToday().getTime()) / 86400000
  );
  if (days < 0) return "overdue";
  if (days <= 30) return "dueSoon";
  return "valid";
}

export function isTopManual(record: RecordItem) {
  return /^s[iì]$/i.test(noteValue(record.notes, "Manuale TOP"));
}

export function cleanManualNotes(notes: string) {
  return notes
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith("[") &&
        !/^(Manuale TOP|Codice documento|Costruttore|Revisione|Data emissione|Prossima revisione|Lingua|Responsabile|Riservatezza|Tag):/i.test(line)
    )
    .join("\n")
    .trim();
}

export function fileExtension(record: RecordItem) {
  const extension = (record.fileName || "").split(".").pop();
  return extension && extension !== record.fileName
    ? extension.toUpperCase()
    : "DOC";
}

export function noteValue(notes: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return notes.match(new RegExp(`(?:^|\\n)${escaped}:\\s*(.*)$`, "im"))?.[1]?.trim() || "";
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function startToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00`);
}
