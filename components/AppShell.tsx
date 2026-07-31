"use client";

import { useMemo, useState } from "react";
import { LogOut, Menu, Search } from "lucide-react";

import AuthScreen from "@/components/auth/AuthScreen";
import BackupControls from "@/components/common/BackupControls";
import ComingSoon from "@/components/common/ComingSoon";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import FeedbackBanner from "@/components/common/FeedbackBanner";
import CuttingParametersPage from "@/components/cutting/CuttingParametersPage";
import Dashboard from "@/components/dashboard/Dashboard";
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
import {
  Machine,
  MaintenanceRecord,
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
            active === "jobs" &&
            isCuttingHistoryRecord(record)
          ) &&
          JSON.stringify(record)
            .toLowerCase()
            .includes(queryText.toLowerCase())
      ),
    [active, queryText, records]
  );

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

        <div className="globalSearch">
          <Search size={18} />
          <input
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Cerca nel modulo corrente…"
          />
        </div>

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
            </button>
          ))}
        </nav>

        <BackupControls
          busy={backupBusy}
          exportBackup={exportBackup}
          selectBackup={setRestoreFile}
        />
      </aside>

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
            loading={maintenanceLoading}
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
            saveCatalog={async (record, file, onUploadProgress) => {
              await saveRecord({
                record,
                attachment: file,
                background: true,
                onUploadProgress,
              });
            }}
            saveImportedTools={saveRecords}
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
              await saveMaintenance(record);
              setEditingMaintenance(null);
              showSuccess(
                `Intervento “${record.title}” salvato correttamente.`
              );
            } catch {
              // L'errore viene già mostrato da useMaintenance.
            }
          }}
        />
      )}

      {editingRecord?.module === "tools" ? (
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
