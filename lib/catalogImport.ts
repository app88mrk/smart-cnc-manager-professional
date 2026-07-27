export type CatalogParameterKind =
  | "vc"
  | "feed"
  | "fz"
  | "ap"
  | "ae";

export type CatalogPageParameters = Record<
  CatalogParameterKind,
  string[]
>;

export type CatalogPageRecord = {
  id: string;
  catalogId: string;
  page: number;
  text: string;
  searchText: string;
  codes: string[];
  families: string[];
  brands: string[];
  materials: string[];
  parameters: CatalogPageParameters;
  parameterCount: number;
};

export type CatalogCalculationOperation =
  | "drilling"
  | "milling"
  | "turning";

export type CatalogSearchPage = CatalogPageRecord & {
  catalogName: string;
};

export type CatalogCalculationSelection = {
  pageId: string;
  catalogId: string;
  catalogName: string;
  page: number;
  operation: CatalogCalculationOperation;
  family: string;
  article: string;
  material: string;
  vc: string;
  feed: string;
  feedKind: "feed" | "fz";
  ap: string;
  ae: string;
  excerpt: string;
};

export type ImportedCatalog = {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  importedAt: string;
  pageCount: number;
  textPageCount: number;
  parameterPageCount: number;
  codeCount: number;
  pages: CatalogPageRecord[];
};

export type CatalogImportProgress = {
  fileName: string;
  page: number;
  totalPages: number;
};

type ImportOptions = {
  onProgress?: (progress: CatalogImportProgress) => void;
  shouldCancel?: () => boolean;
};

type PdfTextItem = {
  str?: unknown;
  transform?: unknown;
};

const DB_NAME = "smart-cnc-manager-catalogs";
const DB_VERSION = 1;
const CATALOG_STORE = "catalogs";
const MAX_PAGE_TEXT_LENGTH = 30_000;

const insertFamilies: Array<{
  label: string;
  patterns: RegExp[];
}> = [
  { label: "CNMG", patterns: [/\bCNMG\b/i] },
  { label: "DNMG", patterns: [/\bDNMG\b/i] },
  { label: "KNUX", patterns: [/\bKNUX\b/i] },
  { label: "SNMG", patterns: [/\bSNMG\b/i] },
  { label: "TNMG", patterns: [/\bTNMG\b/i] },
  { label: "VNMG", patterns: [/\bVNMG\b/i] },
  { label: "WNMG", patterns: [/\bWNMG\b/i] },
  { label: "RNGN", patterns: [/\bRNGN\b/i] },
  {
    label: "CCGT / CCMT",
    patterns: [/\bCC(?:GT|MT)\b/i, /\bCC\.\s*T\b/i],
  },
  {
    label: "DCGT / DCMT",
    patterns: [/\bDC(?:GT|MT)\b/i, /\bDC\.\s*T\b/i],
  },
  {
    label: "RCGT / RCMT",
    patterns: [/\bRC(?:GT|MT)\b/i, /\bRC\.[TX]\b/i],
  },
  {
    label: "SCGT / SCMT",
    patterns: [/\bSC(?:GT|MT)\b/i, /\bSC\.\s*T\b/i],
  },
  {
    label: "TCGT / TCMT",
    patterns: [/\bTC(?:GT|MT)\b/i, /\bTC\.\s*T\b/i],
  },
  {
    label: "VBGT / VBMT",
    patterns: [/\bVB(?:GT|MT)\b/i, /\bVB\.\s*T\b/i],
  },
  {
    label: "VCGT / VCMT",
    patterns: [/\bVC(?:GT|MT)\b/i, /\bVC\.\s*T\b/i],
  },
];

const brandNames = [
  "GARANT",
  "HOLEX",
  "HOFFMANN",
  "ISCAR",
  "KYOCERA",
  "KENNAMETAL",
  "SANDVIK",
  "SECO",
  "WALTER",
  "MITSUBISHI",
  "TUNGALOY",
];

const materialTerms: Array<{
  label: string;
  terms: string[];
}> = [
  { label: "P · Acciaio", terms: ["acciaio", "steel"] },
  {
    label: "M · Inox",
    terms: ["inox", "inossidabile", "stainless"],
  },
  { label: "K · Ghisa", terms: ["ghisa", "cast iron"] },
  {
    label: "N · Non ferrosi",
    terms: [
      "alluminio",
      "aluminium",
      "non ferrosi",
      "ottone",
      "rame",
    ],
  },
  {
    label: "S · Titanio / superleghe",
    terms: ["titanio", "titanium", "superlega", "resistenti al calore"],
  },
  {
    label: "H · Temprati",
    terms: ["temprato", "temprati", "hardened", "hrc"],
  },
];

export class CatalogImportCancelledError extends Error {
  constructor() {
    super("Importazione annullata.");
    this.name = "CatalogImportCancelledError";
  }
}

export async function extractCatalogFromFile(
  file: File,
  options: ImportOptions = {},
) {
  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });

  try {
    const document = await loadingTask.promise;
    const catalogId = catalogIdForFile(file);
    const pages: CatalogPageRecord[] = [];
    const allCodes = new Set<string>();
    let parameterPageCount = 0;

    for (
      let pageNumber = 1;
      pageNumber <= document.numPages;
      pageNumber += 1
    ) {
      if (options.shouldCancel?.()) {
        throw new CatalogImportCancelledError();
      }

      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = textItemsToLines(
        content.items as PdfTextItem[],
      );
      const text = lines.join("\n").slice(0, MAX_PAGE_TEXT_LENGTH);

      if (text.trim()) {
        const record = analyzeCatalogPage(
          catalogId,
          pageNumber,
          text,
          lines,
        );

        pages.push(record);
        record.codes.forEach((code) => allCodes.add(code));
        if (record.parameterCount > 0) {
          parameterPageCount += 1;
        }
      }

      page.cleanup();

      if (
        pageNumber === 1 ||
        pageNumber === document.numPages ||
        pageNumber % 5 === 0
      ) {
        options.onProgress?.({
          fileName: file.name,
          page: pageNumber,
          totalPages: document.numPages,
        });
      }

      if (pageNumber % 25 === 0) {
        await allowBrowserRepaint();
      }
    }

    const catalog: ImportedCatalog = {
      id: catalogId,
      name: file.name.replace(/\.pdf$/i, ""),
      fileName: file.name,
      fileSize: file.size,
      importedAt: new Date().toISOString(),
      pageCount: document.numPages,
      textPageCount: pages.length,
      parameterPageCount,
      codeCount: allCodes.size,
      pages,
    };

    return catalog;
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

export function analyzeCatalogPage(
  catalogId: string,
  page: number,
  text: string,
  suppliedLines?: string[],
): CatalogPageRecord {
  const lines =
    suppliedLines ||
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  const parameters = emptyParameters();
  const codes = detectCodes(text);
  const families = detectFamilies(text);
  const brands = brandNames.filter((brand) =>
    new RegExp(`\\b${brand}\\b`, "i").test(text),
  );
  const foldedText = foldText(text);
  const materials = materialTerms
    .filter((material) =>
      material.terms.some((term) =>
        foldedText.includes(foldText(term)),
      ),
    )
    .map((material) => material.label);

  lines.forEach((line, index) => {
    const kind = classifyParameterLine(line, lines[index + 1]);
    if (!kind) {
      return;
    }

    const values = extractParameterValues(line, kind);
    if (!values.length) {
      return;
    }

    parameters[kind].push(...values);
  });

  mergeParametersFromFlatText(lines.join(" "), parameters);

  Object.keys(parameters).forEach((key) => {
    const kind = key as CatalogParameterKind;
    parameters[kind] = unique(parameters[kind]).slice(0, 30);
  });

  const parameterCount = Object.values(parameters).reduce(
    (total, values) => total + values.length,
    0,
  );
  const searchText = foldText(
    [
      text,
      ...codes,
      ...families,
      ...brands,
      ...materials,
      ...Object.values(parameters).flat(),
    ].join(" "),
  );

  return {
    id: `${catalogId}-page-${page}`,
    catalogId,
    page,
    text,
    searchText,
    codes,
    families,
    brands,
    materials,
    parameters,
    parameterCount,
  };
}

export function searchCatalogPages(
  catalogs: ImportedCatalog[],
  query: string,
  catalogId = "all",
): CatalogSearchPage[] {
  const tokens = foldText(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const pages = catalogs
    .filter(
      (catalog) =>
        catalogId === "all" || catalog.id === catalogId,
    )
    .flatMap((catalog) =>
      catalog.pages.map((page) => ({
        ...page,
        catalogName: catalog.name,
      })),
    );

  return pages
    .filter((page) => {
      if (!tokens.length) {
        return page.parameterCount > 0;
      }

      return tokens.every((token) =>
        page.searchText.includes(token),
      );
    })
    .sort(
      (left, right) =>
        right.parameterCount - left.parameterCount ||
        left.page - right.page,
    );
}

export async function loadImportedCatalogs() {
  if (typeof indexedDB === "undefined") {
    return [] as ImportedCatalog[];
  }

  const database = await openCatalogDatabase();
  try {
    const catalogs = await requestResult<ImportedCatalog[]>(
      database
        .transaction(CATALOG_STORE, "readonly")
        .objectStore(CATALOG_STORE)
        .getAll(),
    );

    return catalogs.sort((left, right) =>
      right.importedAt.localeCompare(left.importedAt),
    );
  } finally {
    database.close();
  }
}

export async function saveImportedCatalog(
  catalog: ImportedCatalog,
) {
  const database = await openCatalogDatabase();
  try {
    const transaction = database.transaction(
      CATALOG_STORE,
      "readwrite",
    );
    transaction.objectStore(CATALOG_STORE).put(catalog);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

export async function deleteImportedCatalog(catalogId: string) {
  const database = await openCatalogDatabase();
  try {
    const transaction = database.transaction(
      CATALOG_STORE,
      "readwrite",
    );
    transaction.objectStore(CATALOG_STORE).delete(catalogId);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

export function formatCatalogFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
  }).format(bytes / 1024 / 1024)} MB`;
}

export function catalogPageExcerpt(
  page: CatalogPageRecord,
  query: string,
) {
  const singleLine = page.text.replace(/\s+/g, " ").trim();
  const normalizedQuery = foldText(query).split(/\s+/)[0] || "";
  const normalizedText = foldText(singleLine);
  const matchIndex = normalizedQuery
    ? normalizedText.indexOf(normalizedQuery)
    : -1;
  const start = Math.max(0, matchIndex > 90 ? matchIndex - 90 : 0);
  const excerpt = singleLine.slice(start, start + 320);

  return `${start > 0 ? "…" : ""}${excerpt}${
    start + 320 < singleLine.length ? "…" : ""
  }`;
}

function textItemsToLines(items: PdfTextItem[]) {
  const rows: Array<{
    y: number;
    items: Array<{ x: number; text: string }>;
  }> = [];

  items.forEach((item) => {
    if (
      typeof item.str !== "string" ||
      !Array.isArray(item.transform)
    ) {
      return;
    }

    const x = Number(item.transform[4]) || 0;
    const y = Number(item.transform[5]) || 0;
    let row = rows.find((candidate) => Math.abs(candidate.y - y) < 2);

    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }

    row.items.push({ x, text: item.str.trim() });
  });

  return rows
    .sort((left, right) => right.y - left.y)
    .map((row) =>
      row.items
        .sort((left, right) => left.x - right.x)
        .map((item) => item.text)
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function detectCodes(text: string) {
  const codes = new Set<string>();

  for (const match of text.matchAll(/\b(\d{2})\s+(\d{4})\b/g)) {
    codes.add(`${match[1]} ${match[2]}`);
  }

  for (const match of text.matchAll(
    /\b[A-Z]{2,8}[\s.-]?\d{3,8}[A-Z0-9./-]*\b/g,
  )) {
    codes.add(match[0].replace(/\s+/g, " ").trim());
  }

  return [...codes].slice(0, 100);
}

function detectFamilies(text: string) {
  const families = insertFamilies
    .filter((family) =>
      family.patterns.some((pattern) => pattern.test(text)),
    )
    .map((family) => family.label);
  const folded = foldText(text);

  if (/\b(punta|punte|drill)\b/.test(folded)) {
    families.push("Punte");
  }
  if (/\b(fresa|frese|milling)\b/.test(folded)) {
    families.push("Frese");
  }
  if (/\b(placchetta|placchette|inserti|insert)\b/.test(folded)) {
    families.push("Placchette");
  }
  if (/\b(alesatore|alesatori|reamer)\b/.test(folded)) {
    families.push("Alesatori");
  }

  return unique(families);
}

function classifyParameterLine(
  line: string,
  nextLine = "",
): CatalogParameterKind | null {
  const folded = foldText(line)
    .replace(/[ₐₑₚ]/g, (character) => {
      const replacements: Record<string, string> = {
        "ₐ": "a",
        "ₑ": "e",
        "ₚ": "p",
      };
      return replacements[character] || character;
    })
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();
  const foldedNext = foldText(nextLine)
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();

  if (
    /\b(v\s*c|vc)\b/.test(folded) ||
    (/^v\b/.test(folded) &&
      folded.includes("m/min") &&
      /^c(?:\s+c)*$/.test(foldedNext)) ||
    folded.includes("velocita di taglio")
  ) {
    return "vc";
  }
  if (
    /\b(a\s*p|ap)\b/.test(folded) ||
    (/^a\b/.test(folded) &&
      folded.includes("mm") &&
      /^p(?:\s+p)*$/.test(foldedNext)) ||
    folded.includes("profondita di taglio")
  ) {
    return "ap";
  }
  if (
    /\b(a\s*e|ae)\b/.test(folded) ||
    (/^a\b/.test(folded) &&
      folded.includes("mm") &&
      /^e(?:\s+e)*$/.test(foldedNext)) ||
    folded.includes("larghezza di taglio")
  ) {
    return "ae";
  }
  if (
    /\bf\s*z\b/.test(folded) ||
    folded.includes("mm/dente") ||
    folded.includes("mm/tooth")
  ) {
    return "fz";
  }
  if (
    folded.includes("mm/gir") ||
    folded.includes("mm/rev") ||
    folded.includes("avanzamento")
  ) {
    return "feed";
  }

  return null;
}

function extractParameterValues(
  line: string,
  kind: CatalogParameterKind,
) {
  let source = line;
  const unitPattern =
    kind === "vc"
      ? /m\s*\/\s*min/i
      : kind === "feed"
        ? /mm\s*\/\s*(?:gir(?:o|\.)?|rev)/i
        : kind === "fz"
          ? /mm\s*\/\s*(?:dente|tooth)/i
          : /\bmm\b/i;
  const unit = unitPattern.exec(line);

  if (unit) {
    source = line.slice(unit.index + unit[0].length);
  }

  return extractNumericValues(source);
}

function mergeParametersFromFlatText(
  text: string,
  parameters: CatalogPageParameters,
) {
  const number =
    String.raw`\d+(?:[.,]\d+)?(?:\s*(?:-|–|—)\s*\d+(?:[.,]\d+)?)?`;
  const sequence = `((?:${number}\\s*){1,30})`;
  const patterns: Array<{
    kind: CatalogParameterKind;
    expression: RegExp;
  }> = [
    {
      kind: "vc",
      expression: new RegExp(
        String.raw`(?:\bv\s*c\b|\bvc\b|velocit[aà]\s+di\s+taglio)[\s\S]{0,80}?m\s*\/\s*min\s+${sequence}`,
        "gi",
      ),
    },
    {
      kind: "fz",
      expression: new RegExp(
        String.raw`(?:\bf\s*z\b|\bfz\b|avanzamento)[\s\S]{0,80}?mm\s*\/\s*(?:dente|tooth)\s+${sequence}`,
        "gi",
      ),
    },
    {
      kind: "feed",
      expression: new RegExp(
        String.raw`(?:\bf\b|avanzamento)[\s\S]{0,80}?mm\s*\/\s*(?:gir(?:o|\.)?|rev)\s+${sequence}`,
        "gi",
      ),
    },
    {
      kind: "ap",
      expression: new RegExp(
        String.raw`(?:\ba\s*p\b|\bap\b|profondit[aà]\s+di\s+taglio)[\s\S]{0,50}?\bmm\b\s+${sequence}`,
        "gi",
      ),
    },
    {
      kind: "ae",
      expression: new RegExp(
        String.raw`(?:\ba\s*e\b|\bae\b|larghezza\s+di\s+taglio)[\s\S]{0,50}?\bmm\b\s+${sequence}`,
        "gi",
      ),
    },
  ];

  patterns.forEach(({ kind, expression }) => {
    for (const match of text.matchAll(expression)) {
      parameters[kind].push(
        ...extractNumericValues(match[1] || ""),
      );
    }
  });
}

function extractNumericValues(source: string) {
  return unique(
    [...source.matchAll(
      /\d+(?:[.,]\d+)?(?:\s*(?:-|–|—)\s*\d+(?:[.,]\d+)?)?/g,
    )].map((match) =>
      match[0]
        .replace(/\s*(?:-|–|—)\s*/g, "–")
        .replace(/\s+/g, "")
        .trim(),
    ),
  ).slice(0, 30);
}

function emptyParameters(): CatalogPageParameters {
  return {
    vc: [],
    feed: [],
    fz: [],
    ap: [],
    ae: [],
  };
}

function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function catalogIdForFile(file: File) {
  return `${file.name.toLowerCase()}-${file.size}-${file.lastModified}`
    .replace(/[^a-z0-9.-]+/g, "-")
    .slice(0, 180);
}

function allowBrowserRepaint() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function openCatalogDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CATALOG_STORE)) {
        database.createObjectStore(CATALOG_STORE, {
          keyPath: "id",
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ||
          new Error("Impossibile aprire l’archivio cataloghi."),
      );
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ||
          new Error("Operazione sull’archivio non riuscita."),
      );
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ||
          new Error("Salvataggio del catalogo non riuscito."),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ||
          new Error("Salvataggio del catalogo annullato."),
      );
  });
}
