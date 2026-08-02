import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  calculateFeed,
  calculateFeedForTargetChipThickness,
  calculateMachiningTime,
  calculateMaximumChipThickness,
  calculateMrr,
  calculateRpm,
  estimatePowerKw,
} from "../lib/cuttingCalculations.ts";
import {
  buildJobToolUpdates,
  createEmptyJobSheet,
  desiredToolMinutes,
  normalizeJobSheet,
  totalOperationMinutes,
} from "../lib/jobSheets.ts";
import type { RecordItem } from "../types/index.ts";
import {
  inferManualCategory,
  isManualReviewOverdue,
  manualCompleteness,
  normalizeManualDetails,
} from "../lib/manuals.ts";
import {
  analyzeProgramText,
  buildRestoredProgramRecord,
  nextProgramVersion,
  normalizeProgramDetails,
} from "../lib/programs.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("calcola i giri mandrino dalla velocità di taglio", () => {
  assert.equal(calculateRpm(100, 10), 3183);
  assert.equal(calculateRpm(0, 10), 0);
  assert.equal(calculateRpm(100, 0), 0);
});

test("distingue avanzamento al dente e avanzamento al giro", () => {
  assert.equal(calculateFeed("milling", 3183, 0.05, 4), 637);
  assert.equal(calculateFeed("drilling", 3183, 0.1, 2), 318);
  assert.equal(calculateFeed("turning", 1200, 0.2), 240);
  assert.equal(calculateFeed("milling", 0, 0.1, 4), 0);
});

test("calcola tempo, asportazione e potenza senza valori negativi", () => {
  assert.equal(calculateMachiningTime(100, 500, 2), 0.4);
  assert.equal(calculateMachiningTime(-1, 500), 0);
  assert.equal(calculateMrr("milling", 20, 2, 8, 500), 8);
  assert.ok(Math.abs(calculateMrr("drilling", 10, 0, 0, 300) - 23.5619449) < 0.0001);
  assert.ok(Math.abs(calculateMrr("turning", 40, 2, 0, 200) - 50.2654824) < 0.0001);
  assert.equal(estimatePowerKw("P", 8), 0.44);
  assert.equal(estimatePowerKw("S", -5), 0);
});

test("compensazione hmax e calcolo inverso restano coerenti", () => {
  const chipThickness = calculateMaximumChipThickness(20, 2, 0.08, 90);
  const restoredFeed = calculateFeedForTargetChipThickness(20, 2, chipThickness, 90);
  assert.ok(chipThickness > 0 && chipThickness < 0.08);
  assert.ok(Math.abs(restoredFeed - 0.08) < 1e-10);
  assert.equal(calculateMaximumChipThickness(0, 2, 0.08, 90), 0);
});

test("la scheda CNC totalizza tempi e consumo utensile per operazione", () => {
  const sheet = createEmptyJobSheet();
  sheet.operations = [
    {
      ...sheet.operations[0],
      toolId: "tool-a",
      actualMinutes: "30",
    },
    {
      ...sheet.operations[0],
      id: "op-2",
      toolId: "tool-a",
      actualMinutes: "45,5",
    },
  ];
  assert.equal(totalOperationMinutes(sheet.operations, "actualMinutes"), 75.5);
  assert.deepEqual(desiredToolMinutes(sheet, "Completata"), {
    "tool-a": 75.5,
  });
  assert.deepEqual(desiredToolMinutes(sheet, "In corso"), {});
});

test("la modifica di una lavorazione aggiorna la vita utensile solo per la differenza", () => {
  const timestamp = "2026-08-02T10:00:00.000Z";
  const originalSheet = createEmptyJobSheet();
  originalSheet.accountedToolMinutes = { "tool-a": 30 };
  const original: RecordItem = {
    id: "job-1",
    module: "jobs",
    title: "Test",
    subtitle: "",
    status: "Completata",
    machineId: "machine-1",
    machine: "CNC",
    notes: "[SCHEDA_LAVORAZIONE_CNC_V1]",
    createdAt: timestamp,
    updatedAt: timestamp,
    jobSheet: originalSheet,
  };
  const nextSheet = createEmptyJobSheet();
  nextSheet.operations[0] = {
    ...nextSheet.operations[0],
    toolId: "tool-a",
    actualMinutes: "90",
  };
  const tool: RecordItem = {
    id: "tool-a",
    module: "tools",
    title: "Fresa Ø10",
    subtitle: "T01",
    status: "Disponibile",
    machineId: "",
    machine: "",
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    tool: {
      code: "T01",
      category: "Fresa",
      manufacturer: "",
      material: "HM",
      coating: "",
      diameter: "10",
      cuttingLength: "",
      totalLength: "",
      fluteCount: "4",
      holder: "",
      location: "",
      supplier: "",
      unitCost: "",
      quantity: "1",
      minStock: "1",
      lifeHours: "10",
      usedHours: "1",
      lastUsedAt: "",
    },
  };
  const result = buildJobToolUpdates({
    original,
    nextSheet,
    status: "Completata",
    tools: [tool],
  });
  assert.equal(result.sheet.accountedToolMinutes["tool-a"], 90);
  assert.equal(result.records[0]?.tool?.usedHours, "2");
});

test("le vecchie lavorazioni guidate vengono convertite nella nuova scheda", () => {
  const legacy: RecordItem = {
    id: "legacy",
    module: "jobs",
    title: "Vecchia OP10",
    subtitle: "",
    status: "Completata",
    machineId: "machine-1",
    machine: "CNC",
    notes: "[LAVORAZIONE_GUIDATA_V1]\nMateriale ID: mat-1\nUtensile ID: tool-a\nProgramma ID: prog-1\nCalcolo ID: calc-1\nQuantità: 5\nTempo utensile minuti: 12\nTempo contabilizzato minuti: 12\nEsito: Ottimo",
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  };
  const migrated = normalizeJobSheet(legacy);
  assert.equal(migrated.materialId, "mat-1");
  assert.equal(migrated.quantity, "5");
  assert.equal(migrated.operations[0]?.toolId, "tool-a");
  assert.equal(migrated.accountedToolMinutes["tool-a"], 12);
});

test("i manuali precedenti vengono classificati e migrati nei metadati professionali", () => {
  const manual: RecordItem = {
    id: "manual-1",
    module: "manuals",
    title: "Manuale manutenzione mandrino CNC",
    subtitle: "Rev. B",
    status: "Disponibile",
    machineId: "machine-1",
    machine: "Centro di lavoro",
    notes: "Codice documento: MAN-001\nCostruttore: DMG MORI\nProssima revisione: 2000-01-01\nLingua: Italiano\nTag: mandrino, lubrificazione",
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
    fileName: "manuale.pdf",
    fileUrl: "https://example.test/manuale.pdf",
  };
  const details = normalizeManualDetails(manual);
  assert.equal(inferManualCategory(manual), "maintenance");
  assert.equal(details.documentCode, "MAN-001");
  assert.equal(details.manufacturer, "DMG MORI");
  assert.equal(details.revision, "B");
  assert.deepEqual(details.tags, ["mandrino", "lubrificazione"]);
  assert.equal(isManualReviewOverdue(manual), true);
  assert.ok(manualCompleteness(manual) >= 80);
});

test("la classificazione documentale riconosce sicurezza e qualità", () => {
  const base: RecordItem = {
    id: "manual-base",
    module: "manuals",
    title: "",
    subtitle: "",
    status: "Disponibile",
    machineId: "",
    machine: "",
    notes: "",
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  };
  assert.equal(
    inferManualCategory({ ...base, title: "Procedura sicurezza DPI" }),
    "safety"
  );
  assert.equal(
    inferManualCategory({ ...base, title: "Controllo qualità e collaudo" }),
    "quality"
  );
});

test("l’analisi del programma CNC rileva codice, righe, utensili e origini", () => {
  const analysis = analyzeProgramText(
    "%\nO1042 (STAFFA OP10)\nG54 G90\nT0101 M06\nG0 X0 Y0\nT0808\nG55.1\nM30"
  );
  assert.equal(analysis.programCode, "O1042");
  assert.equal(analysis.lineCount, 8);
  assert.deepEqual(analysis.toolNumbers, ["T101", "T808"]);
  assert.deepEqual(analysis.workOffsets, ["G54", "G55.1"]);
});

test("le versioni CNC avanzano in modo deterministico", () => {
  assert.equal(nextProgramVersion("1.0.0"), "1.0.1");
  assert.equal(nextProgramVersion("2.7.9"), "2.7.10");
  assert.equal(nextProgramVersion("non valida"), "1.0.0");
});

test("il ripristino conserva la release corrente e richiede nuova validazione", () => {
  const timestamp = "2026-08-02T10:00:00.000Z";
  const program: RecordItem = {
    id: "program-1",
    module: "programs",
    title: "Staffa OP10",
    subtitle: "O1042 · V2.0.0",
    status: "In produzione",
    machineId: "machine-1",
    machine: "Centro di lavoro",
    notes: "[PROGRAMMA_CNC_PRO_V1]",
    createdAt: timestamp,
    updatedAt: timestamp,
    fileName: "O1042-v2.nc",
    fileUrl: "https://example.test/v2.nc",
    filePath: "programs/v2.nc",
    fileType: "text/plain",
    fileSize: 200,
    program: {
      ...normalizeProgramDetails({
        id: "empty",
        module: "programs",
        title: "",
        subtitle: "",
        status: "Bozza",
        machineId: "",
        machine: "",
        notes: "",
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
      programCode: "O1042",
      currentVersion: "2.0.0",
      checksum: "current-checksum",
      approved: true,
      approvedBy: "Responsabile",
      revisions: [
        {
          id: "revision-1",
          version: "1.0.0",
          createdAt: timestamp,
          changeNote: "Prima versione",
          status: "Validato",
          checksum: "old-checksum",
          lineCount: 10,
          toolNumbers: ["T1"],
          workOffsets: ["G54"],
          fileName: "O1042-v1.nc",
          fileUrl: "https://example.test/v1.nc",
          filePath: "programs/v1.nc",
          fileType: "text/plain",
          fileSize: 100,
        },
      ],
    },
  };
  const restored = buildRestoredProgramRecord(
    program,
    program.program!.revisions[0]
  );
  assert.equal(restored.status, "Bozza");
  assert.equal(restored.filePath, "programs/v1.nc");
  assert.equal(restored.program?.currentVersion, "1.0.0");
  assert.equal(restored.program?.approved, false);
  assert.ok(
    restored.program?.revisions.some(
      (revision) => revision.filePath === "programs/v2.nc"
    )
  );
});

test("le regole Storage autorizzano eliminazione e limitano gli upload", async () => {
  const rules = await readFile(join(root, "storage.rules"), "utf8");
  assert.match(rules, /allow create, update:/);
  assert.match(rules, /request\.resource\.size <= 500 \* 1024 \* 1024/);
  assert.match(rules, /allow delete:/);
  assert.match(rules, /request\.auth\.uid == userId/);
});

test("le regole Firestore isolano i dati nell’account autorizzato", async () => {
  const rules = await readFile(join(root, "firestore.rules"), "utf8");
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /userId == request\.auth\.uid/);
  assert.match(rules, /match \/users\/\{userId\}/);
});

test("il service worker non intercetta upload o domini Firebase", async () => {
  const worker = await readFile(join(root, "public", "sw.js"), "utf8");
  assert.match(worker, /request\.method !== "GET"/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.doesNotMatch(worker, /firebasestorage\.googleapis\.com/);
  assert.doesNotMatch(worker, /googleapis\.com/);
});
