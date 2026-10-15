import type {
  RecordItem,
  ToolCategory,
  ToolDetails,
} from "../types/index.ts";

export const toolCategories: ToolCategory[] = [
  "Fresa",
  "Punta",
  "Maschio",
  "Bareno",
  "Tornitura",
  "Inserto",
  "Portautensile",
  "Altro",
];

export type ToolAlert = "critical" | "warning" | "ok";

export function createEmptyToolDetails(): ToolDetails {
  return {
    code: "",
    category: "Fresa",
    manufacturer: "",
    material: "",
    coating: "",
    diameter: "",
    cuttingLength: "",
    totalLength: "",
    fluteCount: "",
    holder: "",
    location: "",
    supplier: "",
    unitCost: "",
    quantity: "1",
    minStock: "1",
    lifeHours: "",
    usedHours: "0",
    lastUsedAt: "",
  };
}

export function normalizeToolDetails(
  record: Pick<RecordItem, "tool" | "subtitle">
): ToolDetails {
  return {
    ...createEmptyToolDetails(),
    ...(record.tool || {}),
    code: record.tool?.code || legacyCode(record.subtitle),
  };
}

export function buildToolSubtitle(tool: ToolDetails) {
  return [
    tool.code,
    tool.diameter ? `Ø ${formatNumber(tool.diameter)} mm` : "",
    tool.holder,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function isLowStock(record: RecordItem) {
  if (!record.tool) {
    return false;
  }

  const tool = normalizeToolDetails(record);
  const quantity = parseToolNumber(tool.quantity);
  const threshold = parseToolNumber(tool.minStock);

  return threshold > 0 && quantity <= threshold;
}

export function isOutOfStock(record: RecordItem) {
  if (!record.tool) {
    return false;
  }

  return parseToolNumber(
    normalizeToolDetails(record).quantity
  ) <= 0;
}

export function isLifeExpired(record: RecordItem) {
  const tool = normalizeToolDetails(record);
  const total = parseToolNumber(tool.lifeHours);
  const used = parseToolNumber(tool.usedHours);

  return total > 0 && used >= total;
}

export function toolLifePercentage(record: RecordItem) {
  const tool = normalizeToolDetails(record);
  const total = parseToolNumber(tool.lifeHours);

  if (total <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((parseToolNumber(tool.usedHours) / total) * 100)
  );
}

export function remainingToolHours(record: RecordItem) {
  const tool = normalizeToolDetails(record);
  const total = parseToolNumber(tool.lifeHours);

  if (total <= 0) {
    return null;
  }

  return Math.max(
    0,
    total - parseToolNumber(tool.usedHours)
  );
}

export function getToolAlert(record: RecordItem): ToolAlert {
  if (isOutOfStock(record) || isLifeExpired(record)) {
    return "critical";
  }

  if (
    isLowStock(record) ||
    record.status === "Da riaffilare"
  ) {
    return "warning";
  }

  return "ok";
}

export function toolMatchesFilter(
  record: RecordItem,
  filter: "all" | ToolAlert
) {
  return filter === "all" || getToolAlert(record) === filter;
}

export function parseToolNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatToolNumber(value: number) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2,
  }).format(value);
}

function legacyCode(subtitle: string) {
  return subtitle.split(/[·/]/)[0]?.trim() || "";
}

function formatNumber(value: string) {
  return formatToolNumber(parseToolNumber(value));
}
