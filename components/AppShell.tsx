"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, Menu, Search } from "lucide-react";

import AuthScreen from "@/components/auth/AuthScreen";
import ComingSoon from "@/components/common/ComingSoon";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import FeedbackBanner from "@/components/common/FeedbackBanner";
import Dashboard from "@/components/dashboard/Dashboard";
import MachineDetail from "@/components/machines/MachineDetail";
import MachineForm from "@/components/machines/MachineForm";
import MachinesPage from "@/components/machines/MachinesPage";
import MaintenanceForm from "@/components/maintenance/MaintenanceForm";
import MaintenancePage from "@/components/maintenance/MaintenancePage";

import useAuth from "@/hooks/useAuth";
import useMachines from "@/hooks/useMachines";
import useMaintenance from "@/hooks/useMaintenance";
import { firebaseConfigured } from "@/lib/firebase";
import { modules } from "@/lib/modules";
import { Machine, MaintenanceRecord, ModuleId } from "@/types";

type Feedback = {
  type: "success" | "error";
  message: string;
};

type PendingDelete =
  | { kind: "machine"; item: Machine }
  | { kind: "maintenance"; item: MaintenanceRecord }
  | null;

const emptyMaintenance = (machineId = ""): MaintenanceRecord => ({
  id: crypto.randomUUID(),
  machineId,
  type: "Preventiva",
  status: "Pianificata",
  title: "",
  description: "",
  technician: "",
  scheduledDate: new Date().toISOString().slice(0, 10),
  completedDate: "",
  hours: "",
  cost: "",
  parts: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const emptyMachine = (): Machine => ({
  id: crypto.randomUUID(),
  brand: "",
  model: "",
  serialNumber: "",
  year: "",
  cncControl: "",
  travelX: "",
  travelY: "",
  travelZ: "",
  spindle: "",
  toolTaper: "",
  toolMagazine: "",
  department: "",
  status: "Operativa",
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function AppShell() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [queryText, setQueryText] = useState("");
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [detail, setDetail] = useState<Machine | null>(null);
  const [editingMaintenance, setEditingMaintenance] =
    useState<MaintenanceRecord | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<PendingDelete>(null);

  const showError = useCallback((message: string) => {
    setFeedback({ type: "error", message });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setFeedback({ type: "success", message });
  }, []);

  useEffect(() => {
    if (feedback?.type !== "success") {
      return;
    }

    const timeout = window.setTimeout(
      () => setFeedback(null),
      4500
    );

    return () => window.clearTimeout(timeout);
  }, [feedback]);

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
    saveMaintenance,
    deleteMaintenance,
  } = useMaintenance({
    uid,
    enabled: dataEnabled,
    onError: showError,
  });

  const visible = useMemo(
    () =>
      machines.filter((machine) =>
        Object.values(machine)
          .join(" ")
          .toLowerCase()
          .includes(queryText.toLowerCase())
      ),
    [machines, queryText]
  );

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      if (pendingDelete.kind === "machine") {
        const machine = pendingDelete.item;
        await deleteMachine(machine);
        showSuccess(
          `${machine.brand} ${machine.model} eliminata correttamente.`
        );
      } else {
        const record = pendingDelete.item;
        await deleteMaintenance(record);
        showSuccess(
          `Intervento “${record.title}” eliminato correttamente.`
        );
      }

      setPendingDelete(null);
    } catch {
      setPendingDelete(null);
      // L'errore viene già mostrato dall'hook interessato.
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
          onClick={() => setMobile(!mobile)}
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
            placeholder="Cerca macchina, matricola, controllo…"
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

      <aside className={mobile ? "show" : ""}>
        <nav>
          {modules.map((module) => (
            <button
              key={module.id}
              className={active === module.id ? "active" : ""}
              onClick={() => {
                setActive(module.id);
                setMobile(false);
              }}
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
      </aside>

      <main>
        {feedback && (
          <FeedbackBanner
            type={feedback.type}
            message={feedback.message}
            close={() => setFeedback(null)}
          />
        )}

        {active === "dashboard" ? (
          <Dashboard
            machines={machines}
            maintenance={maintenance}
            go={setActive}
          />
        ) : active === "machines" ? (
          <MachinesPage
            machines={visible}
            openNew={() => setEditing(emptyMachine())}
            openEdit={setEditing}
            openDetail={setDetail}
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
              setEditingMaintenance(emptyMaintenance())
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
        ) : (
          <ComingSoon active={active} />
        )}
      </main>

      {editing && (
        <MachineForm
          machine={editing}
          busy={machinesLoading}
          close={() => setEditing(null)}
          submit={async (machine, photo) => {
            try {
              await saveMachine({ machine, photo });
              setEditing(null);
              showSuccess(
                `${machine.brand} ${machine.model} salvata correttamente.`
              );
            } catch {
              // L'errore viene già mostrato da useMachines.
            }
          }}
        />
      )}

      {detail && (
        <MachineDetail
          uid={uid}
          machine={detail}
          maintenance={maintenance.filter(
            (record) => record.machineId === detail.id
          )}
          close={() => setDetail(null)}
          edit={() => {
            setEditing(detail);
            setDetail(null);
          }}
          addMaintenance={() =>
            setEditingMaintenance(emptyMaintenance(detail.id))
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

      {pendingDelete && (
        <ConfirmDialog
          title={
            pendingDelete.kind === "machine"
              ? "Eliminare la macchina?"
              : "Eliminare l’intervento?"
          }
          message={
            pendingDelete.kind === "machine"
              ? `${pendingDelete.item.brand} ${pendingDelete.item.model} e i relativi dati verranno eliminati definitivamente.`
              : `L’intervento “${pendingDelete.item.title}” verrà eliminato definitivamente.`
          }
          busy={
            pendingDelete.kind === "machine"
              ? machinesLoading
              : maintenanceLoading
          }
          cancel={() => setPendingDelete(null)}
          confirm={confirmDelete}
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
