"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Factory,
  FileCheck2,
  Gauge,
  Layers3,
  LoaderCircle,
  Plus,
  Printer,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import {
  buildJobRecord,
  buildJobToolUpdates,
  createJobOperation,
  createQualityCheck,
  normalizeJobSheet,
  numeric,
  totalOperationMinutes,
} from "@/lib/jobSheets";
import {
  JobQualityCheck,
  JobSheetDetails,
  JobSheetOperation,
  Machine,
  RecordItem,
} from "@/types";

const steps = [
  { label: "Commessa e pezzo", short: "Commessa", icon: <ClipboardList /> },
  { label: "Piazzamento", short: "Setup", icon: <Settings2 /> },
  { label: "Ciclo e risorse", short: "Ciclo", icon: <Wrench /> },
  { label: "Qualità e risultati", short: "Qualità", icon: <ShieldCheck /> },
  { label: "Riepilogo e PDF", short: "Riepilogo", icon: <FileCheck2 /> },
];

type JobSheetEditorProps = {
  record: RecordItem;
  allRecords: RecordItem[];
  machines: Machine[];
  busy: boolean;
  close: () => void;
  save: (records: RecordItem[]) => Promise<void>;
  notifySuccess: (message: string) => void;
};

export default function JobSheetEditor({
  record,
  allRecords,
  machines,
  busy,
  close,
  save,
  notifySuccess,
}: JobSheetEditorProps) {
  const [sheet, setSheet] = useState<JobSheetDetails>(() =>
    normalizeJobSheet(record)
  );
  const [machineId, setMachineId] = useState(record.machineId);
  const [status, setStatus] = useState(record.status || "Pianificata");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const tools = useMemo(
    () =>
      allRecords.filter(
        (item) =>
          item.module === "tools" &&
          !item.notes.includes("[IMPORT_CATALOGO]")
      ),
    [allRecords]
  );
  const materials = useMemo(
    () => allRecords.filter((item) => item.module === "materials"),
    [allRecords]
  );
  const programs = useMemo(
    () => allRecords.filter((item) => item.module === "programs"),
    [allRecords]
  );
  const calculations = useMemo(
    () => allRecords.filter(isCalculationRecord),
    [allRecords]
  );
  const selectedMachine = machines.find(
    (machine) => machine.id === machineId
  );
  const estimatedMinutes = totalOperationMinutes(
    sheet.operations,
    "estimatedMinutes"
  );
  const actualMinutes = totalOperationMinutes(
    sheet.operations,
    "actualMinutes"
  );
  const completedOperations = sheet.operations.filter(
    (operation) => operation.completed
  ).length;
  const conformChecks = sheet.qualityChecks.filter(
    (check) => check.result === "Conforme"
  ).length;
  const nonConformChecks = sheet.qualityChecks.filter(
    (check) => check.result === "Non conforme"
  ).length;

  function update<K extends keyof JobSheetDetails>(
    key: K,
    value: JobSheetDetails[K]
  ) {
    setError("");
    setSheet((current) => ({ ...current, [key]: value }));
  }

  function updateOperation<K extends keyof JobSheetOperation>(
    id: string,
    key: K,
    value: JobSheetOperation[K]
  ) {
    setSheet((current) => ({
      ...current,
      operations: current.operations.map((operation) =>
        operation.id === id ? { ...operation, [key]: value } : operation
      ),
    }));
  }

  function addOperation() {
    setSheet((current) => ({
      ...current,
      operations: [
        ...current.operations,
        createJobOperation(current.operations.length + 1),
      ],
    }));
  }

  function removeOperation(id: string) {
    setSheet((current) => {
      const remaining = current.operations.filter(
        (operation) => operation.id !== id
      );
      return {
        ...current,
        operations: (remaining.length ? remaining : [createJobOperation(1)]).map(
          (operation, index) => ({ ...operation, sequence: index + 1 })
        ),
      };
    });
  }

  function updateQuality<K extends keyof JobQualityCheck>(
    id: string,
    key: K,
    value: JobQualityCheck[K]
  ) {
    setSheet((current) => ({
      ...current,
      qualityChecks: current.qualityChecks.map((check) =>
        check.id === id ? { ...check, [key]: value } : check
      ),
    }));
  }

  function validate() {
    if (!sheet.partName.trim()) return "Inserisci il nome del pezzo.";
    if (!machineId) return "Seleziona la macchina nella sezione Piazzamento.";
    if (!sheet.materialId) return "Seleziona il materiale della lavorazione.";
    if (!sheet.operations.some((operation) => operation.description.trim())) {
      return "Descrivi almeno un’operazione del ciclo.";
    }
    if (status === "Completata" && sheet.operations.some((operation) => !operation.completed)) {
      return "Per chiudere la lavorazione completa tutte le operazioni del ciclo.";
    }
    if (status === "Completata" && nonConformChecks > 0 && sheet.approved) {
      return "Una scheda con controlli non conformi non può essere approvata.";
    }
    return "";
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const machine = machines.find((item) => item.id === machineId);
    const material = materials.find((item) => item.id === sheet.materialId);
    const usage = buildJobToolUpdates({
      original: record,
      nextSheet: sheet,
      status,
      tools,
    });
    const nextRecord = buildJobRecord({
      original: record,
      sheet: usage.sheet,
      status,
      machine,
      material,
    });

    setSaving(true);
    try {
      await save([nextRecord, ...usage.records]);
      notifySuccess(
        usage.records.length
          ? `Scheda “${nextRecord.title}” salvata e vita di ${usage.records.length} utensili aggiornata.`
          : `Scheda “${nextRecord.title}” salvata correttamente.`
      );
      close();
    } finally {
      setSaving(false);
    }
  }

  function selectMachine(machineId: string) {
    setMachineId(machineId);
    setError("");
  }

  function printSheet() {
    setStep(4);
    window.setTimeout(() => window.print(), 80);
  }

  return (
    <div className="jobSheetOverlay">
      <section className="jobSheetEditor" aria-label="Scheda lavorazione CNC">
        <header className="jobSheetHeader">
          <div>
            <span>SCHEDA LAVORAZIONE CNC · STEP 13</span>
            <h2>{sheet.partName || record.title || "Nuova lavorazione"}</h2>
            <p>
              {sheet.orderCode || "Commessa non assegnata"} · {status}
            </p>
          </div>
          <div>
            <button type="button" className="jobPrintButton" onClick={printSheet}>
              <Printer size={17} /> Stampa / PDF
            </button>
            <button type="button" className="jobSheetClose" onClick={close} aria-label="Chiudi">
              <X size={21} />
            </button>
          </div>
        </header>

        <div className="jobSheetBody">
          <nav className="jobSheetSteps" aria-label="Sezioni scheda">
            {steps.map((item, index) => (
              <button
                type="button"
                key={item.label}
                className={`${step === index ? "active" : ""} ${stepComplete(index, sheet, machineId) ? "complete" : ""}`}
                onClick={() => setStep(index)}
              >
                <span>{item.icon}</span>
                <div><small>0{index + 1}</small><b>{item.label}</b></div>
                {stepComplete(index, sheet, machineId) && <Check size={15} />}
              </button>
            ))}
          </nav>

          <main className="jobSheetContent">
            {step === 0 && (
              <JobSection
                eyebrow="Step 13A"
                title="Commessa e dati del pezzo"
                description="Identifica senza ambiguità ordine, disegno, materiale e quantità da produrre."
                icon={<ClipboardList />}
              >
                <div className="jobSheetFormGrid">
                  <JobField label="Codice commessa *" value={sheet.orderCode} set={(value) => update("orderCode", value)} placeholder="Es. COM-2026-0148" />
                  <JobField label="Cliente / reparto" value={sheet.customer} set={(value) => update("customer", value)} placeholder="Cliente o reparto interno" />
                  <JobField label="Nome pezzo *" value={sheet.partName} set={(value) => update("partName", value)} placeholder="Es. Staffa supporto mandrino" wide />
                  <JobField label="Codice disegno" value={sheet.drawingCode} set={(value) => update("drawingCode", value)} placeholder="DWG-1042" />
                  <JobField label="Revisione" value={sheet.drawingRevision} set={(value) => update("drawingRevision", value)} placeholder="A / 01" />
                  <label>
                    <span>Materiale *</span>
                    <select value={sheet.materialId} onChange={(event) => update("materialId", event.target.value)}>
                      <option value="">Seleziona materiale archivio</option>
                      {materials.map((item) => <option value={item.id} key={item.id}>{item.title}{item.subtitle ? ` · ${item.subtitle}` : ""}</option>)}
                    </select>
                  </label>
                  <JobField label="Grezzo / dimensioni" value={sheet.rawMaterial} set={(value) => update("rawMaterial", value)} placeholder="Es. Piatto 120 × 80 × 25 mm" />
                  <JobField label="Quantità richiesta" value={sheet.quantity} set={(value) => update("quantity", value)} type="number" min="1" />
                  <JobField label="Data consegna" value={sheet.dueDate} set={(value) => update("dueDate", value)} type="date" />
                </div>
              </JobSection>
            )}

            {step === 1 && (
              <JobSection
                eyebrow="Step 13B"
                title="Piazzamento e origine pezzo"
                description="Registra come ripetere il setup sulla macchina senza affidarsi alla memoria."
                icon={<Settings2 />}
              >
                <div className="jobSheetFormGrid">
                  <label className="wide">
                    <span>Macchina *</span>
                    <select value={machineId} onChange={(event) => selectMachine(event.target.value)}>
                      <option value="">Seleziona macchina</option>
                      {machines.map((machine) => <option value={machine.id} key={machine.id}>{machine.brand} {machine.model} · {machine.cncControl}</option>)}
                    </select>
                  </label>
                  <JobField label="Sistema di serraggio" value={sheet.clamping} set={(value) => update("clamping", value)} placeholder="Morsa, autocentrante, staffaggio…" />
                  <JobField label="Attrezzatura / fixture" value={sheet.fixture} set={(value) => update("fixture", value)} placeholder="Codice attrezzatura o descrizione" />
                  <JobField label="Origine pezzo" value={sheet.workOffset} set={(value) => update("workOffset", value)} placeholder="G54 · centro pezzo · faccia superiore" />
                  <JobField label="Setup previsto (min)" value={sheet.estimatedSetupMinutes} set={(value) => update("estimatedSetupMinutes", value)} type="number" min="0" />
                  <JobField label="Setup effettivo (min)" value={sheet.actualSetupMinutes} set={(value) => update("actualSetupMinutes", value)} type="number" min="0" />
                  <label className="wide">
                    <span>Istruzioni di piazzamento</span>
                    <textarea rows={6} value={sheet.setupNotes} onChange={(event) => update("setupNotes", event.target.value)} placeholder="Appoggi, battute, coppia di serraggio, tastatura, sporgenze e verifiche preliminari…" />
                  </label>
                </div>
                <div className="jobSetupSummary">
                  <Factory size={20} />
                  <div><small>Setup collegato</small><b>{selectedMachine ? `${selectedMachine.brand} ${selectedMachine.model}` : record.machine || "Macchina da selezionare"}</b></div>
                  <span>{sheet.workOffset || "Origine da definire"}</span>
                </div>
              </JobSection>
            )}

            {step === 2 && (
              <JobSection
                eyebrow="Step 13C"
                title="Ciclo operativo e risorse"
                description="Ogni fase collega utensile, programma, parametri e tempi reali."
                icon={<Wrench />}
                action={<button type="button" className="primary" onClick={addOperation}><Plus size={16} /> Aggiungi operazione</button>}
              >
                <div className="jobOperationSummary">
                  <Metric label="Operazioni" value={String(sheet.operations.length)} />
                  <Metric label="Completate" value={`${completedOperations}/${sheet.operations.length}`} />
                  <Metric label="Tempo previsto" value={`${formatNumber(estimatedMinutes)} min`} />
                  <Metric label="Tempo effettivo" value={`${formatNumber(actualMinutes)} min`} />
                </div>
                <div className="jobOperations">
                  {sheet.operations.map((operation, index) => (
                    <article className={operation.completed ? "completed" : ""} key={operation.id}>
                      <header>
                        <span>OP {String((index + 1) * 10).padStart(2, "0")}</span>
                        <label><input type="checkbox" checked={operation.completed} onChange={(event) => updateOperation(operation.id, "completed", event.target.checked)} /> Completata</label>
                        <button type="button" onClick={() => removeOperation(operation.id)} title="Elimina operazione"><Trash2 size={16} /></button>
                      </header>
                      <div className="jobOperationGrid">
                        <JobField label="Nome operazione" value={operation.name} set={(value) => updateOperation(operation.id, "name", value)} placeholder="OP10" />
                        <JobField label="Descrizione lavorazione *" value={operation.description} set={(value) => updateOperation(operation.id, "description", value)} placeholder="Spianatura, sgrossatura, foratura…" wide />
                        <label><span>Utensile</span><select value={operation.toolId} onChange={(event) => updateOperation(operation.id, "toolId", event.target.value)}><option value="">Nessun utensile</option>{tools.map((tool) => <option value={tool.id} key={tool.id}>{tool.title}{tool.subtitle ? ` · ${tool.subtitle}` : ""}</option>)}</select></label>
                        <label><span>Programma CNC</span><select value={operation.programId} onChange={(event) => updateOperation(operation.id, "programId", event.target.value)}><option value="">Nessun programma</option>{programs.map((program) => <option value={program.id} key={program.id}>{program.title}{program.subtitle ? ` · ${program.subtitle}` : ""}</option>)}</select></label>
                        <label><span>Calcolo parametri</span><select value={operation.calculationId} onChange={(event) => updateOperation(operation.id, "calculationId", event.target.value)}><option value="">Nessun calcolo</option>{calculations.map((calculation) => <option value={calculation.id} key={calculation.id}>{calculation.title}</option>)}</select></label>
                        <JobField label="Tempo previsto (min)" value={operation.estimatedMinutes} set={(value) => updateOperation(operation.id, "estimatedMinutes", value)} type="number" min="0" />
                        <JobField label="Tempo effettivo (min)" value={operation.actualMinutes} set={(value) => updateOperation(operation.id, "actualMinutes", value)} type="number" min="0" />
                      </div>
                    </article>
                  ))}
                </div>
              </JobSection>
            )}

            {step === 3 && (
              <JobSection
                eyebrow="Step 13D"
                title="Controlli qualità e risultati"
                description="Confronta quote nominali e misurate, quindi registra l’esito reale della produzione."
                icon={<ShieldCheck />}
                action={<button type="button" className="primary" onClick={() => update("qualityChecks", [...sheet.qualityChecks, createQualityCheck()])}><Plus size={16} /> Aggiungi controllo</button>}
              >
                <div className="jobQualitySummary">
                  <Metric label="Controlli" value={String(sheet.qualityChecks.length)} />
                  <Metric label="Conformi" value={String(conformChecks)} tone="ok" />
                  <Metric label="Non conformi" value={String(nonConformChecks)} tone={nonConformChecks ? "danger" : ""} />
                  <Metric label="Scarti" value={sheet.scrapQuantity || "0"} tone={numeric(sheet.scrapQuantity) ? "danger" : ""} />
                </div>

                <div className="jobQualityTableWrap">
                  {sheet.qualityChecks.length ? (
                    <table className="jobQualityTable">
                      <thead><tr><th>Caratteristica</th><th>Nominale</th><th>Tolleranza</th><th>Misurato</th><th>Strumento</th><th>Esito</th><th /></tr></thead>
                      <tbody>
                        {sheet.qualityChecks.map((check) => (
                          <tr key={check.id} className={check.result === "Non conforme" ? "nonConform" : ""}>
                            <td><input value={check.characteristic} onChange={(event) => updateQuality(check.id, "characteristic", event.target.value)} placeholder="Ø foro" /></td>
                            <td><input value={check.nominal} onChange={(event) => updateQuality(check.id, "nominal", event.target.value)} placeholder="20,00" /></td>
                            <td><input value={check.tolerance} onChange={(event) => updateQuality(check.id, "tolerance", event.target.value)} placeholder="±0,02" /></td>
                            <td><input value={check.measured} onChange={(event) => updateQuality(check.id, "measured", event.target.value)} placeholder="20,01" /></td>
                            <td><input value={check.instrument} onChange={(event) => updateQuality(check.id, "instrument", event.target.value)} placeholder="Micrometro" /></td>
                            <td><select value={check.result} onChange={(event) => updateQuality(check.id, "result", event.target.value as JobQualityCheck["result"])}><option>Da controllare</option><option>Conforme</option><option>Non conforme</option></select></td>
                            <td><button type="button" onClick={() => update("qualityChecks", sheet.qualityChecks.filter((item) => item.id !== check.id))}><Trash2 size={15} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="jobNoQuality"><ShieldCheck size={26} /><b>Nessun controllo dimensionale</b><span>Aggiungi le quote critiche per documentare il controllo del primo pezzo.</span></div>
                  )}
                </div>

                <div className="jobSheetFormGrid jobResultsGrid">
                  <JobField label="Operatore" value={sheet.operator} set={(value) => update("operator", value)} placeholder="Nome operatore" />
                  <label><span>Stato lavorazione</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Pianificata</option><option>In corso</option><option>Completata</option><option>Sospesa</option></select></label>
                  <JobField label="Pezzi prodotti" value={sheet.producedQuantity} set={(value) => update("producedQuantity", value)} type="number" min="0" />
                  <JobField label="Pezzi scartati" value={sheet.scrapQuantity} set={(value) => update("scrapQuantity", value)} type="number" min="0" />
                  <JobField label="Data/ora inizio" value={sheet.startedAt} set={(value) => update("startedAt", value)} type="datetime-local" />
                  <JobField label="Data/ora completamento" value={sheet.completedAt} set={(value) => update("completedAt", value)} type="datetime-local" />
                  <label><span>Esito complessivo</span><select value={sheet.outcome} onChange={(event) => update("outcome", event.target.value)}><option>Da verificare</option><option>Ottimo</option><option>Regolare</option><option>Da ottimizzare</option><option>Problema</option></select></label>
                  <label className="jobApproval"><input type="checkbox" checked={sheet.approved} disabled={nonConformChecks > 0 || status !== "Completata"} onChange={(event) => update("approved", event.target.checked)} /><span><b>Scheda approvata</b><small>Disponibile solo a lavorazione completata e senza non conformità.</small></span></label>
                  <label className="wide"><span>Note finali, correzioni e osservazioni</span><textarea rows={5} value={sheet.finalNotes} onChange={(event) => update("finalNotes", event.target.value)} /></label>
                </div>
              </JobSection>
            )}

            {step === 4 && (
              <JobSection
                eyebrow="Step 13E"
                title="Riepilogo, archivio e PDF"
                description="Controlla la scheda completa e usa Stampa / PDF per conservarla o condividerla."
                icon={<FileCheck2 />}
                action={<button type="button" className="primary" onClick={printSheet}><Printer size={16} /> Stampa / salva PDF</button>}
              >
                <JobPrintPreview
                  record={record}
                  sheet={sheet}
                  status={status}
                  machine={machines.find((item) => item.id === machineId)}
                  material={materials.find((item) => item.id === sheet.materialId)}
                  allRecords={allRecords}
                />
              </JobSection>
            )}
          </main>
        </div>

        <footer className="jobSheetFooter">
          <div>
            {error && <span className="jobSheetError">{error}</span>}
            {!error && <span>Salvataggio automatico della vita utensile alla chiusura della lavorazione.</span>}
          </div>
          <div>
            <button type="button" className="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft size={17} /> Indietro</button>
            {step < steps.length - 1 && <button type="button" className="secondary" onClick={() => setStep(step + 1)}>Avanti <ChevronRight size={17} /></button>}
            <button type="button" className="primary" disabled={busy || saving} onClick={handleSave}>{saving ? <LoaderCircle className="spinner" size={17} /> : <Save size={17} />} Salva scheda</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function JobSection({
  eyebrow,
  title,
  description,
  icon,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="jobSheetSection">
      <header>
        <span>{icon}</span>
        <div><small>{eyebrow}</small><h3>{title}</h3><p>{description}</p></div>
        {action && <aside>{action}</aside>}
      </header>
      {children}
    </section>
  );
}

function JobField({
  label,
  value,
  set,
  placeholder = "",
  type = "text",
  min,
  wide = false,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "wide" : ""}>
      <span>{label}</span>
      <input type={type} min={min} value={value} onChange={(event) => set(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Metric({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return <article className={tone}><small>{label}</small><b>{value}</b></article>;
}

function JobPrintPreview({
  record,
  sheet,
  status,
  machine,
  material,
  allRecords,
}: {
  record: RecordItem;
  sheet: JobSheetDetails;
  status: string;
  machine?: Machine;
  material?: RecordItem;
  allRecords: RecordItem[];
}) {
  const linked = (id: string) => allRecords.find((item) => item.id === id)?.title || "—";
  return (
    <article className="jobPrintPreview" id="job-print-area">
      <header>
        <div className="jobPrintBrand"><span>SC</span><div><b>SMART CNC MANAGER</b><small>Scheda lavorazione professionale</small></div></div>
        <div className="jobPrintStatus"><span>{status}</span>{sheet.approved && <b><BadgeCheck size={15} /> APPROVATA</b>}</div>
      </header>
      <section className="jobPrintTitle">
        <div><small>COMMESSA</small><b>{sheet.orderCode || "—"}</b></div>
        <div><small>PEZZO</small><b>{sheet.partName || record.title || "—"}</b></div>
        <div><small>CLIENTE</small><b>{sheet.customer || "—"}</b></div>
        <div><small>CONSEGNA</small><b>{formatDate(sheet.dueDate)}</b></div>
      </section>
      <section className="jobPrintData">
        <div><small>Disegno</small><b>{sheet.drawingCode || "—"} {sheet.drawingRevision ? `Rev. ${sheet.drawingRevision}` : ""}</b></div>
        <div><small>Materiale</small><b>{material?.title || "—"}</b></div>
        <div><small>Grezzo</small><b>{sheet.rawMaterial || "—"}</b></div>
        <div><small>Quantità</small><b>{sheet.quantity}</b></div>
        <div><small>Macchina</small><b>{machine ? `${machine.brand} ${machine.model}` : record.machine || "—"}</b></div>
        <div><small>Serraggio</small><b>{sheet.clamping || "—"}</b></div>
        <div><small>Origine</small><b>{sheet.workOffset || "—"}</b></div>
        <div><small>Operatore</small><b>{sheet.operator || "—"}</b></div>
      </section>
      <section className="jobPrintBlock">
        <h4>Ciclo operativo</h4>
        <table><thead><tr><th>OP</th><th>Lavorazione</th><th>Utensile</th><th>Programma</th><th>Parametri</th><th>Prev.</th><th>Eff.</th><th>OK</th></tr></thead><tbody>{sheet.operations.map((operation, index) => <tr key={operation.id}><td>{String((index + 1) * 10).padStart(2, "0")}</td><td><b>{operation.name}</b><small>{operation.description}</small></td><td>{linked(operation.toolId)}</td><td>{linked(operation.programId)}</td><td>{linked(operation.calculationId)}</td><td>{operation.estimatedMinutes || "—"} min</td><td>{operation.actualMinutes || "—"} min</td><td>{operation.completed ? "✓" : "—"}</td></tr>)}</tbody></table>
      </section>
      <section className="jobPrintBlock">
        <h4>Controllo qualità</h4>
        {sheet.qualityChecks.length ? <table><thead><tr><th>Caratteristica</th><th>Nominale</th><th>Tolleranza</th><th>Misurato</th><th>Strumento</th><th>Esito</th></tr></thead><tbody>{sheet.qualityChecks.map((check) => <tr key={check.id}><td>{check.characteristic || "—"}</td><td>{check.nominal || "—"}</td><td>{check.tolerance || "—"}</td><td>{check.measured || "—"}</td><td>{check.instrument || "—"}</td><td>{check.result}</td></tr>)}</tbody></table> : <p>Nessun controllo registrato.</p>}
      </section>
      <section className="jobPrintResults">
        <div><small>Prodotti</small><b>{sheet.producedQuantity || "0"}</b></div><div><small>Scarti</small><b>{sheet.scrapQuantity || "0"}</b></div><div><small>Setup</small><b>{sheet.actualSetupMinutes || "—"} min</b></div><div><small>Ciclo effettivo</small><b>{formatNumber(totalOperationMinutes(sheet.operations, "actualMinutes"))} min</b></div><div><small>Esito</small><b>{sheet.outcome}</b></div>
      </section>
      <section className="jobPrintNotes"><small>Note finali</small><p>{sheet.finalNotes || "Nessuna nota finale."}</p></section>
    </article>
  );
}

function stepComplete(index: number, sheet: JobSheetDetails, machineId: string) {
  if (index === 0) return Boolean(sheet.partName && sheet.materialId);
  if (index === 1) return Boolean(machineId && sheet.workOffset);
  if (index === 2) return sheet.operations.some((operation) => operation.description && operation.toolId);
  if (index === 3) return Boolean(sheet.operator && (sheet.qualityChecks.length || sheet.outcome !== "Da verificare"));
  return sheet.approved;
}

function isCalculationRecord(record: RecordItem) {
  return record.module === "cutting" || record.notes.includes("[CALCOLO_PARAMETRI_V5]") || /^(Fresatura|Foratura|Tornitura)\s*·/i.test(record.title);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}
