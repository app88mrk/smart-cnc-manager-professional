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
