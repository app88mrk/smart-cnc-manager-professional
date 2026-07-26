"use client";

import Kpi from "@/components/dashboard/Kpi";
import {
  isLifeExpired,
  isLowStock,
} from "@/lib/tools";
import {
  Machine,
  MaintenanceRecord,
  ModuleId,
  RecordItem,
} from "@/types";

interface DashboardProps {
  machines: Machine[];
  maintenance: MaintenanceRecord[];
  records: RecordItem[];
  go: (id: ModuleId) => void;
}

export default function Dashboard({
  machines,
  maintenance,
  records,
  go,
}: DashboardProps) {
  const today = new Date().toISOString().slice(0, 10);

  const overdue = maintenance.filter(
    (record) =>
      record.status !== "Completata" &&
      record.scheduledDate &&
      record.scheduledDate < today
  ).length;
  const tools = records.filter(
    (record) => record.module === "tools"
  );
  const toolAlerts = tools.filter(
    (record) => isLowStock(record) || isLifeExpired(record)
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

        <Kpi
          label="Schede operative"
          value={records.length}
          icon="▤"
        />

        <Kpi
          label="Utensili"
          value={tools.length}
          icon="⚙"
        />

        <Kpi
          label="Avvisi utensili"
          value={toolAlerts}
          icon="⚠"
        />
      </section>

      <section className="panel dashboardPanel">
        <h2>Accesso rapido</h2>
        <div className="quick">
          <button onClick={() => go("manuals")}>
            <span>▤</span>
            <b>Manuali</b>
            <small>Documenti e revisioni</small>
          </button>
          <button onClick={() => go("tools")}>
            <span>⚙</span>
            <b>Utensili</b>
            <small>
              {toolAlerts
                ? `${toolAlerts} avvisi da controllare`
                : "Scorte e durata sotto controllo"}
            </small>
          </button>
          <button onClick={() => go("jobs")}>
            <span>◫</span>
            <b>Lavorazioni</b>
            <small>Commesse e cicli</small>
          </button>
          <button onClick={() => go("alarms")}>
            <span>⚠</span>
            <b>Allarmi</b>
            <small>Cause e soluzioni</small>
          </button>
          <button onClick={() => go("programs")}>
            <span>⌘</span>
            <b>Programmi CNC</b>
            <small>G-code e revisioni</small>
          </button>
          <button onClick={() => go("materials")}>
            <span>⬡</span>
            <b>Materiali</b>
            <small>Schede e parametri</small>
          </button>
        </div>
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
