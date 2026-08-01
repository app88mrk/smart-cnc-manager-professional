import { RecordItem, ToolCategory } from "@/types";

export type CatalogProgress = {
  current: number;
  total: number;
  message: string;
};

export type CatalogCandidate = {
  id: string;
  selected: boolean;
  valid: boolean;
  duplicate: boolean;
  errors: string[];
  warnings: string[];
  sourcePage?: number;
  code: string;
  name: string;
  category: ToolCategory;
  diameter: number;
  cuttingLength: number;
  teeth: number;
  toolMaterial: string;
  coating: string;
  cuttingSpeed: number;
  feed: number;
  feedKind: "fz" | "f";
  axialDepth: number;
  radialWidth: number;
};

type UnknownRow = Record<string, unknown>;

const aliases = {
  code: ["code", "codice", "cod", "item", "sku", "articolo", "article"],
  name: ["name", "nome", "descrizione", "description", "designation", "prodotto"],
  category: ["type", "tipo", "categoria", "category", "tooltype", "utensile"],
  diameter: ["diameter", "diametro", "diam", "d", "ø"],
  cuttingLength: ["cuttinglength", "lunghezzataglio", "lc", "larghezza"],
  teeth: ["teeth", "taglienti", "denti", "z", "flutes"],
  toolMaterial: ["toolmaterial", "materialeutensile", "substrate", "material"],
  coating: ["coating", "rivestimento", "coat"],
  cuttingSpeed: ["vc", "cuttingspeed", "velocitataglio"],
  feed: ["fz", "fn", "f", "feed", "feedpertooth", "avanzamento"],
  axialDepth: ["ap", "profonditataglio", "axialdepth"],
  radialWidth: ["ae", "larghezzataglio", "radialwidth"],
} as const;

export async function analyzeCatalogFile(
  file: File,
  onProgress: (progress: CatalogProgress) => void
) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  let candidates: CatalogCandidate[];

  if (extension === "pdf") {
    candidates = await parsePdf(file, onProgress);
  } else if (extension === "xlsx") {
    onProgress({ current: 0, total: 1, message: "Lettura del file Excel…" });
    candidates = await parseExcel(file);
    onProgress({ current: 1, total: 1, message: "File Excel analizzato" });
  } else if (extension === "json") {
    candidates = parseRows(parseJson(await file.text()));
  } else if (
    extension === "csv" ||
    extension === "tsv" ||
    extension === "txt"
  ) {
    candidates = parseRows(parseDelimited(await file.text()));
  } else if (extension === "xls") {
    throw new Error(
      "Il vecchio formato .xls non è supportato: salvalo come .xlsx o CSV."
    );
  } else {
    throw new Error(
      "Formato non supportato. Usa PDF, XLSX, CSV, JSON, TSV o TXT."
    );
  }

  return deduplicateCandidates(candidates);
}

export function validateCatalogCandidates(
  candidates: CatalogCandidate[],
  existingParameters: RecordItem[]
) {
  const existingCodes = new Set(
    existingParameters
      .map(
        (record) =>
          record.tool?.code ||
          record.notes.match(/Codice articolo:\s*(.+)/i)?.[1] ||
          ""
      )
      .filter(Boolean)
      .map(normalizeCode)
  );
  const seenCodes = new Set<string>();

  return candidates.map((candidate) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const code = normalizeCode(candidate.code);
    const duplicate = existingCodes.has(code) || seenCodes.has(code);

    if (!candidate.code.trim()) errors.push("Codice mancante");
    if (!candidate.name.trim()) errors.push("Descrizione mancante");
    if (
      candidate.category !== "Inserto" &&
      candidate.category !== "Tornitura" &&
      candidate.diameter <= 0
    ) {
      errors.push("Diametro non riconosciuto");
    }
    if (candidate.cuttingSpeed <= 0) warnings.push("Vc da verificare");
    if (candidate.feed <= 0) warnings.push("Avanzamento da verificare");
    if (candidate.teeth <= 0) warnings.push("Taglienti da verificare");

    if (code) seenCodes.add(code);

    return {
      ...candidate,
      duplicate,
      valid: errors.length === 0,
      selected: errors.length === 0 && !duplicate,
      errors,
      warnings,
    };
  });
}

export function candidateToCalculationRecord(
  candidate: CatalogCandidate,
  catalogName: string,
  catalogId: string
): RecordItem {
  const now = new Date().toISOString();
  const operation = operationFromCategory(candidate.category);
  const operationLabel =
    operation === "milling"
      ? "Fresatura"
      : operation === "drilling"
        ? "Foratura"
        : "Tornitura";
  const feedLabel = operation === "milling" ? "fz" : "f";
  const feedUnit = operation === "milling" ? "mm/dente" : "mm/giro";
  const rpm =
    candidate.diameter > 0 && candidate.cuttingSpeed > 0
      ? Math.round(
          (candidate.cuttingSpeed * 1000) /
            (Math.PI * candidate.diameter)
        )
      : 0;
  const feedRate =
    rpm > 0 && candidate.feed > 0
      ? Math.round(
          rpm *
            candidate.feed *
            (operation === "milling"
              ? Math.max(candidate.teeth, 1)
              : 1)
        )
      : 0;
  const complete =
    candidate.cuttingSpeed > 0 &&
    candidate.feed > 0 &&
    (operation === "turning" || candidate.diameter > 0) &&
    (operation !== "milling" || candidate.teeth > 0);
  const notes = [
    "[PARAMETRO_CATALOGO_V1]",
    "[IMPORT_CATALOGO]",
    `Tipo calcolo: ${operation}`,
    `Operazione: ${operationLabel}`,
    `Codice articolo: ${candidate.code}`,
    `Catalogo: ${catalogName}`,
    `Catalogo ID: ${catalogId}`,
    candidate.sourcePage ? `Pagina catalogo: ${candidate.sourcePage}` : "",
    `Utensile: ${candidate.name}`,
    `Categoria utensile: ${candidate.category}`,
    candidate.toolMaterial
      ? `Materiale utensile: ${candidate.toolMaterial}`
      : "",
    candidate.coating ? `Rivestimento: ${candidate.coating}` : "",
    candidate.cuttingLength > 0
      ? `Lunghezza tagliente: ${decimalText(candidate.cuttingLength)} mm`
      : "",
    candidate.diameter > 0
      ? `Diametro: ${decimalText(candidate.diameter)} mm`
      : "Diametro: 0 mm",
    operation === "milling" && candidate.teeth > 0
      ? `Taglienti: ${candidate.teeth}`
      : "",
    candidate.cuttingSpeed > 0
      ? `Vc: ${decimalText(candidate.cuttingSpeed)} m/min`
      : "Vc: 0 m/min (da verificare)",
    candidate.feed > 0
      ? `${feedLabel}: ${decimalText(candidate.feed)} ${feedUnit}`
      : `${feedLabel}: 0 ${feedUnit} (da verificare)`,
    `Numero di giri: ${rpm} giri/min`,
    `Velocità di avanzamento: ${feedRate} mm/min`,
    candidate.axialDepth > 0
      ? `ap: ${decimalText(candidate.axialDepth)} mm`
      : "ap: 0 mm",
    operation === "milling" && candidate.radialWidth > 0
      ? `ae: ${decimalText(candidate.radialWidth)} mm`
      : operation === "milling"
        ? "ae: 0 mm"
        : "",
    "Lunghezza lavorata: 0 mm",
    "Numero passate: 0",
    "Angolo di attacco: 0°",
    "hmax desiderato: 0 mm",
    candidate.warnings.length
      ? `Controlli richiesti: ${candidate.warnings.join(", ")}`
      : "Parametri riconosciuti automaticamente: verificare sempre con il catalogo.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: createId("catalog-parameter"),
    module: "cutting",
    title: candidate.name,
    subtitle: `${operationLabel} · ${candidate.code} · Vc ${
      candidate.cuttingSpeed > 0
        ? decimalText(candidate.cuttingSpeed)
        : "—"
    } m/min · ${feedLabel} ${
      candidate.feed > 0 ? decimalText(candidate.feed) : "—"
    } ${feedUnit}`,
    status: complete ? "Completo" : "Da verificare",
    machineId: "",
    machine: "",
    notes,
    createdAt: now,
    updatedAt: now,
  };
}

function operationFromCategory(
  category: ToolCategory
): "milling" | "drilling" | "turning" {
  if (category === "Punta" || category === "Maschio" || category === "Bareno") {
    return "drilling";
  }

  if (category === "Tornitura" || category === "Inserto") {
    return "turning";
  }

  return "milling";
}

async function parseExcel(file: File) {
  const { default: readXlsxFile } = await import("read-excel-file");
  const rows = await readXlsxFile(file);

  if (rows.length < 2) {
    throw new Error("Il file Excel non contiene righe dati sufficienti.");
  }

  const headers = rows[0].map((value) => String(value ?? ""));
  const records = rows.slice(1).map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index] ?? ""])
    )
  );
  return parseRows(records);
}

async function parsePdf(
  file: File,
  onProgress: (progress: CatalogProgress) => void
) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  onProgress({ current: 0, total: 1, message: "Apertura del catalogo PDF…" });
  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data }).promise;
  const candidates: CatalogCandidate[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = textItemsToLines(
      content.items as Array<{
        str?: string;
        transform?: number[];
      }>
    );
    candidates.push(...parsePdfPage(lines, pageNumber));
    page.cleanup();

    if (pageNumber === 1 || pageNumber % 5 === 0 || pageNumber === document.numPages) {
      onProgress({
        current: pageNumber,
        total: document.numPages,
        message: `Analisi pagina ${pageNumber} di ${document.numPages}`,
      });
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }

  await document.destroy();
  return candidates;
}

function textItemsToLines(
  items: Array<{ str?: string; transform?: number[] }>
) {
  const groups: Array<{
    y: number;
    items: Array<{ x: number; text: string }>;
  }> = [];

  items.forEach((item) => {
    const text = item.str?.trim();
    const transform = item.transform;

    if (!text || !transform) return;

    const x = transform[4] || 0;
    const y = transform[5] || 0;
    let group = groups.find((entry) => Math.abs(entry.y - y) < 2);

    if (!group) {
      group = { y, items: [] };
      groups.push(group);
    }
    group.items.push({ x, text });
  });

  return groups
    .sort((a, b) => b.y - a.y)
    .map((group) =>
      group.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

function parsePdfPage(lines: string[], pageNumber: number) {
  const pageText = lines.join("\n");
  const pageCategory = inferCategory("", pageText);
  const productName = detectProductName(lines, pageCategory);
  const productCategory = inferCategory("", productName);
  const category =
    productCategory === "Altro" ? pageCategory : productCategory;
  const toolMaterial = detectToolMaterial(pageText);
  const coating = detectCoating(pageText);
  const pageCodes = unique(
    lines.flatMap((line) => codesFromLine(line))
  ).slice(0, 8);
  const vcByCode = extractCuttingSpeeds(lines);
  let activeCodes = pageCodes.slice(0, 2);
  const candidates: CatalogCandidate[] = [];

  lines.forEach((line) => {
    const codes = codesFromLine(line);

    if (codes.length >= 2 && !/[●○]/.test(line)) {
      activeCodes = unique(codes).slice(0, 4);
    }

    if (category === "Fresa") {
      candidates.push(
        ...parseMillingRow(
          line,
          activeCodes,
          productName,
          toolMaterial,
          coating,
          vcByCode,
          pageNumber
        )
      );
    } else if (category === "Punta" || category === "Maschio") {
      candidates.push(
        ...parseDrillingRow(
          line,
          activeCodes,
          productName,
          category,
          toolMaterial,
          coating,
          vcByCode,
          pageNumber
        )
      );
    }

    const insert = parseInsertRow(
      line,
      vcByCode,
      toolMaterial,
      coating,
      pageNumber
    );
    if (insert) candidates.push(insert);
  });

  return candidates;
}

function parseMillingRow(
  line: string,
  codes: string[],
  productName: string,
  toolMaterial: string,
  coating: string,
  vcByCode: Map<string, number>,
  pageNumber: number
) {
  const match = normalizeDashes(line).match(
    /^(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s+(.+)$/i
  );

  if (!match || !codes.length) return [];

  const diameter = numberValue(match[1]);
  const width = numberValue(match[2]);
  const tokens = match[3].split(/\s+/);
  const feed = numberValue(tokens.at(-1));
  const teethStart = tokens.length - 1 - codes.length;

  if (diameter <= 0 || feed <= 0 || feed > 5 || teethStart < codes.length) {
    return [];
  }

  return codes.flatMap((code, index) => {
    if (!isAvailable(tokens[index])) return [];

    const teeth = Math.round(numberValue(tokens[teethStart + index]));
    const suffix = `${decimalText(diameter)}x${decimalText(width)}`;

    return [
      createCandidate({
        code: `${code} ${suffix}`,
        name: `${productName} · Ø ${decimalText(diameter)} × ${decimalText(width)} mm`,
        category: "Fresa",
        diameter,
        cuttingLength: width,
        teeth,
        toolMaterial,
        coating,
        cuttingSpeed: vcByCode.get(normalizeCode(code)) || 0,
        feed,
        feedKind: "fz",
        axialDepth: 0,
        radialWidth: diameter,
        sourcePage: pageNumber,
      }),
    ];
  });
}

function parseDrillingRow(
  line: string,
  codes: string[],
  productName: string,
  category: ToolCategory,
  toolMaterial: string,
  coating: string,
  vcByCode: Map<string, number>,
  pageNumber: number
) {
  const match = normalizeDashes(line).match(
    /^(\d+(?:[.,]\d+)?)\s+(.+)$/
  );

  if (!match || !codes.length) return [];

  const diameter = numberValue(match[1]);
  const tokens = match[2].split(/\s+/);
  const feed = numberValue(tokens.at(-1));

  if (
    diameter <= 0 ||
    feed <= 0 ||
    feed > 5 ||
    tokens.length < codes.length + 4
  ) {
    return [];
  }

  const cuttingLength = numberValue(tokens[codes.length + 1]);

  return codes.flatMap((code, index) => {
    if (!isAvailable(tokens[index])) return [];

    return [
      createCandidate({
        code: `${code} ${decimalText(diameter)}`,
        name: `${productName} · Ø ${decimalText(diameter)} mm`,
        category,
        diameter,
        cuttingLength,
        teeth: category === "Punta" ? 2 : 1,
        toolMaterial,
        coating,
        cuttingSpeed: vcByCode.get(normalizeCode(code)) || 0,
        feed,
        feedKind: "f",
        axialDepth: 0,
        radialWidth: 0,
        sourcePage: pageNumber,
      }),
    ];
  });
}

function parseInsertRow(
  line: string,
  vcByCode: Map<string, number>,
  toolMaterial: string,
  coating: string,
  pageNumber: number
) {
  const match = line.match(
    /^(\d{2}\s?\d{4})\s+([A-Z]{4}\s+\d{4}\s+[A-Z]{3,6})(?:\s+([A-Z]{1,3}\d{3,5}))?/i
  );

  if (!match) return null;

  const code = formatBaseCode(match[1]);
  const isoCode = match[2].replace(/\s+/g, " ").trim();
  const grade = match[3] || toolMaterial;

  return createCandidate({
    code,
    name: `Inserto ${isoCode}`,
    category: "Inserto",
    diameter: 0,
    cuttingLength: 0,
    teeth: 1,
    toolMaterial: grade,
    coating,
    cuttingSpeed: vcByCode.get(normalizeCode(code)) || 0,
    feed: 0,
    feedKind: "f",
    axialDepth: 0,
    radialWidth: 0,
    sourcePage: pageNumber,
  });
}

function extractCuttingSpeeds(lines: string[]) {
  const result = new Map<string, number>();

  lines.forEach((line) => {
    if (!/[●○]/.test(line)) return;

    const match = line.match(/^(\d{2}\s?\d{4}|\d{6})(?:\/\d+)?\s+(.+)$/);
    if (!match) return;

    const values = (match[2].match(/\d+(?:[.,]\d+)?/g) || [])
      .map(numberValue)
      .filter((value) => value >= 5 && value <= 2000)
      .sort((a, b) => a - b);

    if (values.length) {
      result.set(
        normalizeCode(formatBaseCode(match[1])),
        values[Math.floor(values.length / 2)]
      );
    }
  });

  return result;
}

function codesFromLine(line: string) {
  return Array.from(line.matchAll(/\b(\d{2}\s?\d{4})\b/g)).map(
    (match) => formatBaseCode(match[1])
  );
}

function detectProductName(lines: string[], category: ToolCategory) {
  const candidate = lines.find((line) =>
    /\b(fres[ae]|punt[ae]|insert[oi]|placchett[ae]|maschi|alesator[ei])\b/i.test(
      line
    )
  );

  if (candidate && candidate.length <= 100) return candidate;

  const fallback: Partial<Record<ToolCategory, string>> = {
    Fresa: "Fresa da catalogo",
    Punta: "Punta da catalogo",
    Maschio: "Maschio da catalogo",
    Inserto: "Inserto da catalogo",
    Tornitura: "Utensile da tornitura",
  };
  return fallback[category] || "Utensile da catalogo";
}

function detectToolMaterial(text: string) {
  if (/HSS[- ]?Co8/i.test(text)) return "HSS-Co8";
  if (/HSS[- ]?Co5/i.test(text)) return "HSS-Co5";
  if (/HSS[- ]?E/i.test(text)) return "HSS-E";
  if (/HSS/i.test(text)) return "HSS";
  if (/metallo duro|HM\b|carbide/i.test(text)) return "HM";
  return "";
}

function detectCoating(text: string) {
  const match = text.match(/\b(TiAlN|TiN|AlCrN|DLC|CVD|PVD)\b/i);
  return match?.[1] || "";
}

function parseRows(rows: UnknownRow[]) {
  return rows.map((row, index) => {
    const name = textValue(getValue(row, "name"));
    const category = inferCategory(getValue(row, "category"), name);

    return createCandidate({
      code: textValue(getValue(row, "code")),
      name,
      category,
      diameter: numberValue(getValue(row, "diameter")),
      cuttingLength: numberValue(getValue(row, "cuttingLength")),
      teeth: Math.round(numberValue(getValue(row, "teeth"))),
      toolMaterial: textValue(getValue(row, "toolMaterial")),
      coating: textValue(getValue(row, "coating")),
      cuttingSpeed: numberValue(getValue(row, "cuttingSpeed")),
      feed: numberValue(getValue(row, "feed")),
      feedKind: category === "Fresa" ? "fz" : "f",
      axialDepth: numberValue(getValue(row, "axialDepth")),
      radialWidth: numberValue(getValue(row, "radialWidth")),
    });
  });
}

function parseJson(content: string): UnknownRow[] {
  const parsed: unknown = JSON.parse(content);

  if (Array.isArray(parsed)) return parsed as UnknownRow[];

  if (parsed && typeof parsed === "object") {
    const nested = Object.values(parsed).find(Array.isArray);
    if (Array.isArray(nested)) return nested as UnknownRow[];
  }

  throw new Error("Il file JSON deve contenere un elenco di utensili.");
}

function parseDelimited(content: string): UnknownRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("Il file non contiene righe dati sufficienti.");
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter);

  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] || ""])
    );
  });
}

function detectDelimiter(header: string) {
  return [";", ",", "\t", "|"]
    .map((delimiter) => ({
      delimiter,
      columns: header.split(delimiter).length,
    }))
    .sort((a, b) => b.columns - a.columns)[0].delimiter;
}

function parseDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function getValue(row: UnknownRow, field: keyof typeof aliases) {
  const wanted = new Set(aliases[field].map(normalizeKey));
  return Object.entries(row).find(([key]) => wanted.has(normalizeKey(key)))?.[1];
}

function inferCategory(value: unknown, context: string): ToolCategory {
  const explicitCategory = categoryFromText(textValue(value));
  if (explicitCategory) return explicitCategory;
  return categoryFromText(context) || "Altro";
}

function categoryFromText(value: string): ToolCategory | null {
  const source = value.toLowerCase();

  if (/fresa|frese|milling|mill\b/.test(source)) return "Fresa";
  if (/punta|punte|drill/.test(source)) return "Punta";
  if (/maschio|maschi|tap\b/.test(source)) return "Maschio";
  if (/bareno|alesator|reamer/.test(source)) return "Bareno";
  if (/inserto|inserti|placchetta|placchette|insert\b/.test(source)) return "Inserto";
  if (/tornitura|turning|cnmg|dnmg|wnmg/.test(source)) return "Tornitura";
  return null;
}

function createCandidate(
  values: Omit<
    CatalogCandidate,
    "id" | "selected" | "valid" | "duplicate" | "errors" | "warnings"
  >
): CatalogCandidate {
  return {
    id: createId("candidate"),
    selected: true,
    valid: true,
    duplicate: false,
    errors: [],
    warnings: [],
    ...values,
  };
}

function deduplicateCandidates(candidates: CatalogCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = normalizeCode(candidate.code);

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ø]/g, "");
}

function normalizeCode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatBaseCode(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 6
    ? `${digits.slice(0, 2)} ${digits.slice(2)}`
    : value.trim();
}

function numberValue(value: unknown) {
  const normalized = textValue(value)
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function normalizeDashes(value: string) {
  return value.replace(/[–—−]/g, "-");
}

function isAvailable(value: string | undefined) {
  return Boolean(value && !/^[-–—−]+$/.test(value));
}

function decimalText(value: number) {
  return String(Number(value.toFixed(3))).replace(".", ",");
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function createId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
