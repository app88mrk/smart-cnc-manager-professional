import type {
  ProgramDetails,
  ProgramRevision,
  RecordItem,
} from "../types/index.ts";

export function createEmptyProgramDetails(): ProgramDetails {
  return {
    version: 1,
    programCode: "",
    partName: "",
    drawingCode: "",
    drawingRevision: "",
    controller: "",
    currentVersion: "1.0.0",
    checksum: "",
    lineCount: 0,
    toolNumbers: [],
    workOffsets: [],
    lastValidatedAt: "",
    approvedBy: "",
    approved: false,
    changeNote: "Prima versione",
    revisions: [],
  };
}

export function normalizeProgramDetails(record: RecordItem): ProgramDetails {
  if (record.program) {
    return {
      ...createEmptyProgramDetails(),
      ...record.program,
      toolNumbers: record.program.toolNumbers || [],
      workOffsets: record.program.workOffsets || [],
      revisions: record.program.revisions || [],
    };
  }

  return {
    ...createEmptyProgramDetails(),
    programCode:
      noteValue(record.notes, "Codice programma") ||
      record.title.match(/\bO\d{3,6}\b/i)?.[0]?.toUpperCase() ||
      "",
    partName: noteValue(record.notes, "Particolare"),
    drawingCode: noteValue(record.notes, "Disegno"),
    drawingRevision: noteValue(record.notes, "Revisione disegno"),
    controller: noteValue(record.notes, "Controllo CNC"),
    currentVersion:
      noteValue(record.notes, "Versione") ||
      record.subtitle.match(/(?:v(?:ersione)?\.?\s*)([\d.]+)/i)?.[1] ||
      "1.0.0",
    lastValidatedAt: noteValue(record.notes, "Validato il"),
    approvedBy: noteValue(record.notes, "Approvato da"),
    approved: /^(s[iì]|true)$/i.test(noteValue(record.notes, "Approvato")),
    changeNote: noteValue(record.notes, "Modifica") || "Programma importato",
  };
}

export function analyzeProgramText(text: string) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const toolNumbers = uniqueMatches(
    normalized,
    /\bT0*(\d{1,4})\b/gi,
    (match) => `T${Number(match[1])}`
  );
  const workOffsets = uniqueMatches(
    normalized,
    /\b(G5[4-9](?:\.\d+)?)\b/gi,
    (match) => match[1].toUpperCase()
  );
  const programCodes = uniqueMatches(
    normalized,
    /(?:^|[\s(])O(\d{3,6})\b/gim,
    (match) => `O${match[1]}`
  );
  return {
    lineCount: lines.length,
    toolNumbers,
    workOffsets,
    programCode: programCodes[0] || "",
  };
}

export async function calculateFileChecksum(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function nextProgramVersion(value: string) {
  const parts = value.split(".").map((part) => Number.parseInt(part, 10));
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return "1.0.0";
  const [major = 1, minor = 0, patch = 0] = parts;
  return `${major}.${minor}.${patch + 1}`;
}

export function captureCurrentRevision(
  record: RecordItem,
  details: ProgramDetails
): ProgramRevision | null {
  if (!record.filePath || !record.fileUrl) return null;
  return {
    id: crypto.randomUUID(),
    version: details.currentVersion,
    createdAt: record.updatedAt,
    changeNote: details.changeNote || "Versione precedente",
    status: record.status,
    checksum: details.checksum,
    lineCount: details.lineCount,
    toolNumbers: details.toolNumbers,
    workOffsets: details.workOffsets,
    fileName: record.fileName || "programma.nc",
    fileUrl: record.fileUrl,
    filePath: record.filePath,
    fileType: record.fileType || "text/plain",
    fileSize: record.fileSize || 0,
  };
}

export function buildRestoredProgramRecord(
  record: RecordItem,
  revision: ProgramRevision
): RecordItem {
  const details = normalizeProgramDetails(record);
  const currentRevision = captureCurrentRevision(record, details);
  const revisions = [...details.revisions];

  if (
    currentRevision &&
    !revisions.some(
      (item) =>
        item.filePath === currentRevision.filePath &&
        item.version === currentRevision.version
    )
  ) {
    revisions.unshift(currentRevision);
  }

  const restoredDetails: ProgramDetails = {
    ...details,
    currentVersion: revision.version,
    checksum: revision.checksum,
    lineCount: revision.lineCount,
    toolNumbers: revision.toolNumbers,
    workOffsets: revision.workOffsets,
    approved: false,
    approvedBy: "",
    lastValidatedAt: "",
    changeNote: `Ripristino versione ${revision.version}`,
    revisions,
  };

  return {
    ...record,
    subtitle: [
      restoredDetails.programCode,
      `V${restoredDetails.currentVersion}`,
      restoredDetails.partName,
    ]
      .filter(Boolean)
      .join(" · "),
    status: "Bozza",
    notes: buildProgramNotes(cleanProgramNotes(record.notes), restoredDetails),
    updatedAt: new Date().toISOString(),
    fileName: revision.fileName,
    fileUrl: revision.fileUrl,
    filePath: revision.filePath,
    fileType: revision.fileType,
    fileSize: revision.fileSize,
    program: restoredDetails,
  };
}

export function programCompleteness(record: RecordItem) {
  const details = normalizeProgramDetails(record);
  const fields = [
    record.title,
    record.fileUrl,
    record.machineId,
    details.programCode,
    details.partName,
    details.drawingCode,
    details.currentVersion,
    details.controller,
    details.checksum,
    details.changeNote,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function programUsedByJobs(
  programId: string,
  records: RecordItem[]
) {
  return records.filter(
    (record) =>
      record.module === "jobs" &&
      record.jobSheet?.operations.some(
        (operation) => operation.programId === programId
      )
  );
}

export function buildProgramNotes(
  notes: string,
  details: ProgramDetails
) {
  const description = cleanProgramNotes(notes);
  return [
    "[PROGRAMMA_CNC_PRO_V1]",
    `Codice programma: ${details.programCode}`,
    `Particolare: ${details.partName}`,
    `Disegno: ${details.drawingCode}`,
    `Revisione disegno: ${details.drawingRevision}`,
    `Controllo CNC: ${details.controller}`,
    `Versione: ${details.currentVersion}`,
    `Validato il: ${details.lastValidatedAt}`,
    `Approvato: ${details.approved ? "Sì" : "No"}`,
    `Approvato da: ${details.approvedBy}`,
    `Modifica: ${details.changeNote}`,
    description,
  ]
    .filter(Boolean)
    .join("\n");
}

export function cleanProgramNotes(notes: string) {
  return notes
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith("[") &&
        !/^(Codice programma|Particolare|Disegno|Revisione disegno|Controllo CNC|Versione|Validato il|Approvato|Approvato da|Modifica):/i.test(line)
    )
    .join("\n")
    .trim();
}

export function noteValue(notes: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return notes.match(new RegExp(`(?:^|\\n)${escaped}:\\s*(.*)$`, "im"))?.[1]?.trim() || "";
}

function uniqueMatches(
  text: string,
  pattern: RegExp,
  map: (match: RegExpExecArray) => string
) {
  const values = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) values.add(map(match));
  return Array.from(values);
}
