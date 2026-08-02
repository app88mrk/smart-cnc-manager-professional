"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, Plus, Search } from "lucide-react";

import AuthScreen from "@/components/auth/AuthScreen";
import BackupControls from "@/components/common/BackupControls";
import CommandPalette from "@/components/common/CommandPalette";
import ComingSoon from "@/components/common/ComingSoon";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import FeedbackBanner from "@/components/common/FeedbackBanner";
import NotificationCenter from "@/components/common/NotificationCenter";
import CuttingParametersPage from "@/components/cutting/CuttingParametersPage";
import Dashboard from "@/components/dashboard/Dashboard";
import JobsPage from "@/components/jobs/JobsPage";
import ManualForm from "@/components/manuals/ManualForm";
import ManualsPage from "@/components/manuals/ManualsPage";
import MachineDetail from "@/components/machines/MachineDetail";
import MachineForm from "@/components/machines/MachineForm";
import MachinesPage from "@/components/machines/MachinesPage";
import MaintenanceForm from "@/components/maintenance/MaintenanceForm";
import MaintenancePage from "@/components/maintenance/MaintenancePage";
import RecordForm from "@/components/records/RecordForm";
import RecordsPage from "@/components/records/RecordsPage";
import ToolForm from "@/components/tools/ToolForm";
import ToolsPage from "@/components/tools/ToolsPage";

import useAuth from "@/hooks/useAuth";
import useBackup from "@/hooks/useBackup";
import useFeedback from "@/hooks/useFeedback";
import useMachines from "@/hooks/useMachines";
import useMaintenance from "@/hooks/useMaintenance";
import useRecords from "@/hooks/useRecords";
import useWorkspace from "@/hooks/useWorkspace";
import {
  createEmptyMachine,
  createEmptyMaintenance,
  createEmptyRecord,
} from "@/lib/factories";
import { firebaseConfigured } from "@/lib/firebase";
import { isRecordModuleId } from "@/lib/moduleConfigs";
import { modules } from "@/lib/modules";
import { normalizeManualDetails } from "@/lib/manuals";
import {
  Machine,
  MaintenanceRecord,
  ModuleId,
  RecordItem,
} from "@/types";

type PendingDelete =
  | { kind: "machine"; item: Machine }
  | { kind: "maintenance"; item: MaintenanceRecord }
  | { kind: "record"; item: RecordItem }
  | null;

export default function AppShell() {
  const {
    active,
    queryText,
    mobileOpen,
    editingMachine,
    machineDetail,
    editingMaintenance,
    editingRecord,
    setQueryText,
    openModule,
    toggleMobile,
    setEditingMachine,
    setMachineDetail,
    setEditingMaintenance,
    setEditingRecord,
    closeAllEditors,
  } = useWorkspace();
  const [pendingDelete, setPendingDelete] =
    useState<PendingDelete>(null);
  const [restoreFile, setRestoreFile] =
    useState<File | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const {
    feedback,
    showError,
    showSuccess,
    clearFeedback,
  } = useFeedback();

  const {
    user,
    authReady,
    accessError,
    logout,
  } = useAuth({
    onError: showError,
  });

  const uid = user?.uid || "demo";
  const dataEnabled =
    authReady && (!firebaseConfigured || Boolean(user));

  const {
    machines,
    machinesLoading,
    refreshMachines,
    saveMachine,
    deleteMachine,
  } = useMachines({
    uid,
    enabled: dataEnabled,
    onError: showError,
  });

  const {
    maintenance,
    maintenanceLoading,
    refreshMaintenance,
    saveMaintenance,
    deleteMaintenance,
  } = useMaintenance({
    uid,
    enabled: dataEnabled,
    onError: showError,
  });

  const {
    records,
    recordsLoading,
    refreshRecords,
    saveRecord,
    saveRecords,
    deleteRecord,
    deleteRecords,
  } = useRecords({
    uid,
    enabled: dataEnabled,
    onError: showError,
  });

  const {
    backupBusy,
    exportBackup,
    importBackup,
  } = useBackup({
    uid,
    machines,
    maintenance,
    records,
    refreshMachines,
    refreshMaintenance,
    refreshRecords,
    onError: showError,
    onSuccess: showSuccess,
  });

  const visibleMachines = useMemo(
    () =>
      machines.filter((machine) =>
        Object.values(machine)
          .join(" ")
          .toLowerCase()
          .includes(queryText.toLowerCase())
      ),
    [machines, queryText]
  );

  const visibleRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.module === active &&
          !(
            active === "tools" &&
            record.notes.includes("[IMPORT_CATALOGO]")
          ) &&
          !(
            active === "jobs" &&
            isCuttingHistoryRecord(record)
          ) &&
          JSON.stringify(record)
            .toLowerCase()
            .includes(queryText.toLowerCase())
      ),
    [active, queryText, records]
  );

  const moduleCounts = useMemo(() => {
    const counts: Partial<Record<ModuleId, number>> = {
      machines: machines.length,
      maintenance: maintenance.filter(
        (record) => record.status !== "Completata"
      ).length,
    };

    records.forEach((record) => {
      if (record.notes.includes("[IMPORT_CATALOGO]")) return;
      if (record.module === "jobs" && isCuttingHistoryRecord(record)) {
        counts.cutting = (counts.cutting || 0) + 1;
        return;
      }
      counts[record.module] = (counts[record.module] || 0) + 1;
    });

    return counts;
  }, [machines.length, maintenance, records]);

  const quickCreateLabel = quickCreateLabelFor(active);

  useEffect(() => {
    function handleGlobalShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setQueryText("");
      }
    }

    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, [searchOpen, setQueryText]);

  function closeGlobalSearch() {
    setSearchOpen(false);
    setQueryText("");
  }

  function openMachineFromSearch(machine: Machine) {
    openModule("machines");
    setMachineDetail(machine);
  }

  function openMaintenanceFromSearch(record: MaintenanceRecord) {
    openModule("maintenance");
    setEditingMaintenance(record);
  }

  function openRecordFromSearch(record: RecordItem) {
    if (record.module === "cutting" || isCuttingHistoryRecord(record)) {
      openModule("cutting");
      return;
    }

    openModule(record.module);
    setEditingRecord(record);
  }

  function openQuickCreate() {
    if (active === "machines") {
      setEditingMachine(createEmptyMachine());
    } else if (active === "maintenance") {
      setEditingMaintenance(createEmptyMaintenance());
    } else if (active === "tools") {
      setEditingRecord(createEmptyRecord("tools"));
    } else if (active !== "dashboard" && active !== "cutting" && isRecordModuleId(active)) {
      setEditingRecord(createEmptyRecord(active));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      if (pendingDelete.kind === "machine") {
        const machine = pendingDelete.item;
        await deleteMachine(machine);
        await Promise.all([
          refreshMaintenance(),
          refreshRecords(),
        ]);
        showSuccess(
          `${machine.brand} ${machine.model} eliminata correttamente.`
        );
      } else if (pendingDelete.kind === "maintenance") {
        const record = pendingDelete.item;
        await deleteMaintenance(record);
        showSuccess(
          `Intervento “${record.title}” eliminato correttamente.`
        );
      } else {
        const record = pendingDelete.item;
        await deleteRecord(record);
        showSuccess(
          record.module === "tools"
            ? `Utensile “${record.title}” eliminato correttamente.`
            : `Scheda “${record.title}” eliminata correttamente.`
        );
      }

      setPendingDelete(null);
    } catch {
      setPendingDelete(null);
      // L'errore viene già mostrato dall'hook interessato.
    }
  }

  async function confirmRestore() {
    if (!restoreFile) {
      return;
    }

    try {
      await importBackup(restoreFile);
      closeAllEditors();
      setRestoreFile(null);
    } catch {
      setRestoreFile(null);
      // L'errore viene già mostrato da useBackup.
    }
  }

  async function toggleManualTop(record: RecordItem) {
    const nextTop = !/^s[iì]$/i.test(
      recordNoteValue(record.notes, "Manuale TOP")
    );

    try {
      await saveRecord({
        record: {
          ...record,
          notes: replaceRecordNote(
            record.notes,
            "Manuale TOP",
            nextTop ? "Sì" : "No"
          ),
          updatedAt: new Date().toISOString(),
        },
        attachment: null,
      });
      showSuccess(
        nextTop
          ? `“${record.title}” aggiunto alla sezione TOP.`
          : `“${record.title}” rimosso dalla sezione TOP.`
      );
    } catch {
      // L'errore viene già mostrato da useRecords.
    }
  }

  async function trackManualOpen(record: RecordItem) {
    const manual = normalizeManualDetails(record);
    try {
      await saveRecord({
        record: {
          ...record,
          manual: {
            ...manual,
            openCount: manual.openCount + 1,
            lastOpenedAt: new Date().toISOString(),
          },
        },
        attachment: null,
        background: true,
      });
    } catch {
      // L’apertura del documento resta disponibile anche se il contatore non si aggiorna.
    }
  }

  async function toggleMaintenanceChecklist(
    record: MaintenanceRecord,
    itemId: string
  ) {
    try {
      await saveMaintenance({
        ...record,
        checklist: (record.checklist || []).map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        ),
      });
    } catch {
      // L’errore viene già mostrato da useMaintenance.
    }
  }

  function openMaintenanceNotification(record: MaintenanceRecord) {
    openModule("maintenance");
    setEditingMaintenance(record);
  }

  if (!authReady) {
    return (
      <div className="centerMessage">Connessione a Firebase…</div>
    );
  }

  if (firebaseConfigured && !user) {
    return (
      <AuthScreen
        errorMessage={errorMessage}
        accessError={accessError}
      />
    );
  }

  return (
    <div className="app">
      <header>
        <button
          className="mobileMenu"
          onClick={toggleMobile}
          aria-label="Apri menu"
        >
          <Menu />
        </button>

        <div className="brand">
          <span>SC</span>
          <div>
            <b>Smart CNC Manager</b>
            <small>Professional Edition</small>
          </div>
        </div>

        <button
          type="button"
          className="globalSearch globalSearchTrigger"
          onClick={() => setSearchOpen(true)}
          aria-label="Cerca in tutta l'applicazione"
        >
          <Search size={18} />
          <span>Cerca in tutta l’app…</span>
          <kbd>Ctrl K</kbd>
        </button>

        <NotificationCenter
          maintenance={maintenance}
          records={records}
          machines={machines}
          openMaintenance={openMaintenanceNotification}
          openTools={() => openModule("tools")}
        />

        {quickCreateLabel && (
          <button
            type="button"
            className="headerQuickCreate"
            onClick={openQuickCreate}
          >
            <Plus size={17} />
            <span>{quickCreateLabel}</span>
          </button>
        )}

        <div
          className={`cloud ${
            firebaseConfigured ? "online" : "demo"
          }`}
        >
          <i />
          {firebaseConfigured
            ? "Firebase connesso"
            : "Modalità demo"}
        </div>

        {user && (
          <button
            className="logout"
            onClick={logout}
            title="Esci"
          >
            <LogOut size={18} />
          </button>
        )}
      </header>

      <aside className={mobileOpen ? "show" : ""}>
        <nav>
          {modules.map((module) => (
            <button
              key={module.id}
              className={active === module.id ? "active" : ""}
              onClick={() => openModule(module.id)}
            >
              <span>{module.icon}</span>

              <div>
                <b>{module.label}</b>
                <small>{module.description}</small>
              </div>

              {module.state !== "active" && (
                <em>
                  {module.state === "config"
                    ? "Configura"
                    : "Standby"}
                </em>
              )}
              {module.state === "active" && Boolean(moduleCounts[module.id]) && (
                <strong className="navCount">{moduleCounts[module.id]}</strong>
              )}
            </button>
          ))}
        </nav>

        <BackupControls
          busy={backupBusy}
          exportBackup={exportBackup}
          selectBackup={setRestoreFile}
        />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="mobileBackdrop"
          onClick={toggleMobile}
          aria-label="Chiudi menu"
        />
      )}

      <main>
        {feedback && (
          <FeedbackBanner
            type={feedback.type}
            message={feedback.message}
            close={clearFeedback}
          />
        )}

        {active === "dashboard" ? (
          <Dashboard
            machines={machines}
            maintenance={maintenance}
            records={records}
            go={openModule}
          />
        ) : active === "machines" ? (
          <MachinesPage
            machines={visibleMachines}
            openNew={() =>
              setEditingMachine(createEmptyMachine())
            }
            openEdit={setEditingMachine}
            openDetail={setMachineDetail}
            onDelete={(machine) =>
              setPendingDelete({ kind: "machine", item: machine })
            }
            loading={machinesLoading}
          />
        ) : active === "maintenance" ? (
          <MaintenancePage
            records={maintenance}
            machines={machines}
            openNew={() =>
              setEditingMaintenance(createEmptyMaintenance())
            }
            openEdit={setEditingMaintenance}
            onDelete={(record) =>
              setPendingDelete({
                kind: "maintenance",
                item: record,
              })
            }
            onToggleChecklist={toggleMaintenanceChecklist}
            loading={maintenanceLoading}
          />
        ) : active === "manuals" ? (
          <ManualsPage
            records={visibleRecords}
            machines={machines}
            loading={recordsLoading}
            openNew={() =>
              setEditingRecord(createEmptyRecord("manuals"))
            }
            openEdit={setEditingRecord}
            onDelete={(record) =>
              setPendingDelete({
                kind: "record",
                item: record,
              })
            }
            onToggleTop={toggleManualTop}
            onDocumentOpen={trackManualOpen}
          />
        ) : active === "tools" ? (
          <ToolsPage
            records={visibleRecords}
            machines={machines}
            loading={recordsLoading}
            openNew={() =>
              setEditingRecord(createEmptyRecord("tools"))
            }
            openEdit={setEditingRecord}
            onDelete={(record) =>
              setPendingDelete({
                kind: "record",
                item: record,
              })
            }
          />
        ) : active === "cutting" ? (
          <CuttingParametersPage
            records={records}
            machines={machines}
            busy={recordsLoading}
            notifySuccess={showSuccess}
            saveCalculation={async (record) => {
              await saveRecord({
                record,
                attachment: null,
              });
            }}
            deleteCalculation={async (record) => {
              await deleteRecord(record);
            }}
            deleteCalculations={deleteRecords}
            deleteCatalog={deleteRecord}
            saveCatalog={async (record, file, onUploadProgress) => {
              await saveRecord({
                record,
                attachment: file,
                background: true,
                onUploadProgress,
              });
            }}
            saveImportedParameters={saveRecords}
          />
        ) : active === "jobs" ? (
          <JobsPage
            records={visibleRecords}
            allRecords={records}
            machines={machines}
            loading={recordsLoading}
            onSave={saveRecords}
            onDelete={(record) =>
              setPendingDelete({
                kind: "record",
                item: record,
              })
            }
            notifySuccess={showSuccess}
          />
        ) : isRecordModuleId(active) ? (
          <RecordsPage
            moduleId={active}
            records={visibleRecords}
            machines={machines}
            loading={recordsLoading}
            openNew={() =>
              setEditingRecord(createEmptyRecord(active))
            }
            openEdit={setEditingRecord}
            onDelete={(record) =>
              setPendingDelete({
                kind: "record",
                item: record,
              })
            }
          />
        ) : (
          <ComingSoon active={active} />
        )}
      </main>

      {searchOpen && (
        <CommandPalette
          query={queryText}
          machines={machines}
          maintenance={maintenance}
          records={records}
          setQuery={setQueryText}
          close={closeGlobalSearch}
          openModule={openModule}
          openMachine={openMachineFromSearch}
          openMaintenance={openMaintenanceFromSearch}
          openRecord={openRecordFromSearch}
        />
      )}

      {editingMachine && (
        <MachineForm
          machine={editingMachine}
          busy={machinesLoading}
          close={() => setEditingMachine(null)}
          submit={async (machine, photo) => {
            try {
              await saveMachine({ machine, photo });
              setEditingMachine(null);
              showSuccess(
                `${machine.brand} ${machine.model} salvata correttamente.`
              );
            } catch {
              // L'errore viene già mostrato da useMachines.
            }
          }}
        />
      )}

      {machineDetail && (
        <MachineDetail
          uid={uid}
          machine={machineDetail}
          maintenance={maintenance.filter(
            (record) => record.machineId === machineDetail.id
          )}
          close={() => setMachineDetail(null)}
          edit={() => {
            setEditingMachine(machineDetail);
            setMachineDetail(null);
          }}
          addMaintenance={() =>
            setEditingMaintenance(
              createEmptyMaintenance(machineDetail.id)
            )
          }
        />
      )}

      {editingMaintenance && (
        <MaintenanceForm
          record={editingMaintenance}
          machines={machines}
          busy={maintenanceLoading}
          close={() => setEditingMaintenance(null)}
          submit={async (record) => {
            try {
              const recurring = buildRecurringMaintenance(record);
              await saveMaintenance(recurring.current);
              if (recurring.next) {
                await saveMaintenance(recurring.next);
              }
              setEditingMaintenance(null);
              showSuccess(
                recurring.next
                  ? `Intervento “${record.title}” completato. Prossima scadenza creata per il ${formatShortDate(recurring.next.scheduledDate)}.`
                  : `Intervento “${record.title}” salvato correttamente.`
              );
            } catch {
              // L'errore viene già mostrato da useMaintenance.
            }
          }}
        />
      )}

      {editingRecord?.module === "manuals" ? (
        <ManualForm
          record={editingRecord}
          machines={machines}
          busy={recordsLoading}
          close={() => setEditingRecord(null)}
          submit={async (record, attachment, onUploadProgress) => {
            try {
              await saveRecord({
                record,
                attachment,
                onUploadProgress,
              });
              setEditingRecord(null);
              showSuccess(
                `Documento “${record.title}” salvato correttamente.`
              );
            } catch {
              // L’errore viene già mostrato da useRecords.
            }
          }}
        />
      ) : editingRecord?.module === "tools" ? (
        <ToolForm
          record={editingRecord}
          machines={machines}
          busy={recordsLoading}
          close={() => setEditingRecord(null)}
          submit={async (record) => {
            try {
              await saveRecord({
                record,
                attachment: null,
              });
              setEditingRecord(null);
              showSuccess(
                `Utensile “${record.title}” salvato correttamente.`
              );
            } catch {
              // L'errore viene già mostrato da useRecords.
            }
          }}
        />
      ) : editingRecord ? (
        <RecordForm
          record={editingRecord}
          machines={machines}
          busy={recordsLoading}
          close={() => setEditingRecord(null)}
          submit={async (record, attachment) => {
            try {
              await saveRecord({ record, attachment });
              setEditingRecord(null);
              showSuccess(
                `Scheda “${record.title}” salvata correttamente.`
              );
            } catch {
              // L'errore viene già mostrato da useRecords.
            }
          }}
        />
      ) : null}

      {pendingDelete && (
        <ConfirmDialog
          title={
            pendingDelete.kind === "machine"
              ? "Eliminare la macchina?"
              : pendingDelete.kind === "maintenance"
                ? "Eliminare l’intervento?"
                : pendingDelete.item.module === "tools"
                  ? "Eliminare l’utensile?"
                  : "Eliminare la scheda?"
          }
          message={
            pendingDelete.kind === "machine"
              ? `${pendingDelete.item.brand} ${pendingDelete.item.model} e i relativi dati verranno eliminati definitivamente.`
              : pendingDelete.kind === "maintenance"
                ? `L’intervento “${pendingDelete.item.title}” verrà eliminato definitivamente.`
                : pendingDelete.item.module === "tools"
                  ? `L’utensile “${pendingDelete.item.title}” verrà eliminato definitivamente.`
                  : `La scheda “${pendingDelete.item.title}” e il relativo allegato verranno eliminati definitivamente.`
          }
          busy={
            pendingDelete.kind === "machine"
              ? machinesLoading
              : pendingDelete.kind === "maintenance"
                ? maintenanceLoading
                : recordsLoading
          }
          cancel={() => setPendingDelete(null)}
          confirm={confirmDelete}
        />
      )}

      {restoreFile && (
        <ConfirmDialog
          title="Ripristinare il backup?"
          message={`Il file “${restoreFile.name}” sostituirà le schede attuali. Gli allegati già presenti in Storage non verranno cancellati.`}
          busy={backupBusy}
          confirmLabel="Ripristina"
          cancel={() => setRestoreFile(null)}
          confirm={confirmRestore}
        />
      )}
    </div>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Si è verificato un errore.";
}

function isCuttingHistoryRecord(record: RecordItem) {
  return (
    record.notes.includes("[CALCOLO_PARAMETRI_V5]") ||
    /^(Fresatura|Foratura|Tornitura)\s*·/i.test(record.title)
  );
}

function quickCreateLabelFor(moduleId: ModuleId) {
  if (moduleId === "machines") return "Nuova macchina";
  if (moduleId === "maintenance") return "Nuovo intervento";
  if (moduleId === "tools") return "Nuovo utensile";
  if (moduleId !== "dashboard" && moduleId !== "cutting" && isRecordModuleId(moduleId)) {
    return "Nuova scheda";
  }
  return "";
}

function recordNoteValue(notes: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return notes.match(new RegExp(`(?:^|\\n)${escaped}:\\s*(.*)$`, "im"))?.[1]?.trim() || "";
}

function replaceRecordNote(notes: string, label: string, value: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\n)${escaped}:\\s*.*(?=\\n|$)`, "i");
  const line = `${label}: ${value}`;

  if (pattern.test(notes)) {
    return notes.replace(pattern, (match, prefix: string) => `${prefix}${line}`);
  }

  return [notes.trim(), line].filter(Boolean).join("\n");
}

function buildRecurringMaintenance(record: MaintenanceRecord): {
  current: MaintenanceRecord;
  next: MaintenanceRecord | null;
} {
  if (
    record.status !== "Completata" ||
    !record.recurrence ||
    record.recurrence === "Nessuna" ||
    record.nextMaintenanceId
  ) {
    return { current: record, next: null };
  }

  const nextId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const nextDate = recurrenceDate(
    record.scheduledDate,
    record.recurrence
  );

  return {
    current: { ...record, nextMaintenanceId: nextId },
    next: {
      ...record,
      id: nextId,
      status: "Pianificata",
      scheduledDate: nextDate,
      completedDate: "",
      hours: "",
      cost: "",
      parts: "",
      checklist: (record.checklist || []).map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        done: false,
      })),
      nextMaintenanceId: undefined,
      recurrenceSourceId: record.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

function recurrenceDate(
  dateValue: string,
  recurrence: NonNullable<MaintenanceRecord["recurrence"]>
) {
  const date = new Date(`${dateValue}T12:00:00`);
  if (recurrence === "Settimanale") date.setDate(date.getDate() + 7);
  if (recurrence === "Mensile") date.setMonth(date.getMonth() + 1);
  if (recurrence === "Trimestrale") date.setMonth(date.getMonth() + 3);
  if (recurrence === "Semestrale") date.setMonth(date.getMonth() + 6);
  if (recurrence === "Annuale") date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
