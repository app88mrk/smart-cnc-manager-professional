"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { LogOut, Menu, Search, X } from "lucide-react";

import AuthScreen from "@/components/auth/AuthScreen";
import ComingSoon from "@/components/common/ComingSoon";
import Dashboard from "@/components/dashboard/Dashboard";
import MachineDetail from "@/components/machines/MachineDetail";
import MachineForm from "@/components/machines/MachineForm";
import MachinesPage from "@/components/machines/MachinesPage";
import MaintenanceForm from "@/components/maintenance/MaintenanceForm";
import MaintenancePage from "@/components/maintenance/MaintenancePage";

import useMachines from "@/hooks/useMachines";
import useMaintenance from "@/hooks/useMaintenance";
import { firebaseConfigured, auth } from "@/lib/firebase";
import { modules } from "@/lib/modules";
import { Machine, MaintenanceRecord, ModuleId } from "@/types";

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
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [queryText, setQueryText] = useState("");
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [detail, setDetail] = useState<Machine | null>(null);
  const [editingMaintenance, setEditingMaintenance] =
    useState<MaintenanceRecord | null>(null);
  const [error, setError] = useState("");

  const uid = user?.uid || "demo";
  const dataEnabled = authReady && (!firebaseConfigured || Boolean(user));

  const showError = useCallback((message: string) => {
    setError(message);
  }, []);

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

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

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

  async function handleDelete(machine: Machine) {
    if (!confirm(`Eliminare ${machine.brand} ${machine.model}?`)) {
      return;
    }

    try {
      await deleteMachine(machine);
    } catch {
      // L'errore viene già mostrato da useMachines.
    }
  }

  if (!authReady) {
    return (
      <div className="centerMessage">Connessione a Firebase…</div>
    );
  }

  if (firebaseConfigured && !user) {
    return <AuthScreen errorMessage={errorMessage} />;
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
            onClick={() => auth && signOut(auth)}
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
        {error && (
          <div className="alert">
            {error}
            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
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
            onDelete={handleDelete}
          />
        ) : active === "maintenance" ? (
          <MaintenancePage
            records={maintenance}
            machines={machines}
            openNew={() =>
              setEditingMaintenance(emptyMaintenance())
            }
            openEdit={setEditingMaintenance}
            onDelete={async (record) => {
              if (
                !confirm(
                  `Eliminare l’intervento ${record.title}?`
                )
              ) {
                return;
              }

              try {
                await deleteMaintenance(record);
              } catch {
                // L'errore viene già mostrato da useMaintenance.
              }
            }}
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
          onError={setError}
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
            } catch {
              // L'errore viene già mostrato da useMaintenance.
            }
          }}
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
