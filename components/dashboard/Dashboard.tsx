"use client";

import Kpi from "@/components/dashboard/Kpi";
import { Machine, MaintenanceRecord, ModuleId } from "@/types";

interface DashboardProps {
  machines: Machine[];
  maintenance: MaintenanceRecord[];
  go: (id: ModuleId) => void;
}

export default function Dashboard({
  machines,
  maintenance,
  go,
}: DashboardProps) {
  const today = new Date().toISOString().slice(0, 10);

  const overdue = maintenance.filter(
    (record) =>
      record.status !== "Completata" &&
      record.scheduledDate &&
      record.scheduledDate < today
  ).length;

  return (
    <>
      <div className="pageHead">
        <div>
          <p>CONTROLLO REPARTO</p>
          <h1>Dashboard operativa</h1>
          <span>Tutte le informazioni tecniche in un unico sistema.</span>
        </div>

        <button className="primary" onClick={() => go("machines")}>
          Apri Macchine
        </button>
      </div>

      <section className="kpis">
        <Kpi label="Macchine" value={machines.length} icon="▦" />

        <Kpi
          label="Operative"
          value={machines.filter((machine) => machine.status === "Operativa").length}
          icon="✓"
        />

        <Kpi
          label="In manutenzione"
          value={
            machines.filter((machine) => machine.status === "Manutenzione").length
          }
          icon="◆"
        />

        <Kpi
          label="Manutenzioni aperte"
          value={
            maintenance.filter((record) => record.status !== "Completata").length
          }
          icon="◆"
        />

        <Kpi label="Scadute" value={overdue} icon="⚠" />
      </section>

      <section className="panel dashboardPanel">
        <h2>Le tue macchine</h2>

        {machines.length ? (
          <div className="miniMachines">
            {machines.slice(0, 5).map((machine) => (
              <button key={machine.id} onClick={() => go("machines")}>
                <b>
                  {machine.brand} {machine.model}
                </b>

                <span>
                  {machine.serialNumber || "Matricola non inserita"}
                </span>

                <em>{machine.status}</em>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty">
            <strong>Nessuna macchina inserita</strong>
            <span>
              Apri il modulo Macchine per creare la prima scheda.
            </span>
          </div>
        )}
      </section>
    </>
  );
}