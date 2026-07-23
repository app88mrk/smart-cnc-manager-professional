"use client";

import { CalendarDays, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { Machine, MaintenanceRecord } from "@/types";

interface MaintenancePageProps {
  records: MaintenanceRecord[];
  machines: Machine[];
  openNew: () => void;
  openEdit: (record: MaintenanceRecord) => void;
  onDelete: (record: MaintenanceRecord) => void;
}

export default function MaintenancePage({
  records,
  machines,
  openNew,
  openEdit,
  onDelete,
}: MaintenancePageProps) {
  const machineName = (id: string) => {
    const machine = machines.find((item) => item.id === id);
    return machine ? `${machine.brand} ${machine.model}` : "Macchina non disponibile";
  };

  return (
    <>
      <div className="pageHead">
        <div>
          <p>GESTIONE INTERVENTI</p>
          <h1>Manutenzioni</h1>
          <span>Interventi preventivi, guasti, tecnici, ore e costi.</span>
        </div>
        <button className="primary" onClick={openNew}>
          <Plus size={18} /> Nuovo intervento
        </button>
      </div>

      <section className="maintenanceGrid">
        {records.length ? (
          records.map((record) => (
            <article className="maintenanceCard" key={record.id}>
              <div className="maintenanceTop">
                <span className={`statusBadge ${statusClass(record.status)}`}>
                  {record.status}
                </span>
                <div className="cardActions">
                  <button onClick={() => openEdit(record)}><Pencil size={16} /></button>
                  <button onClick={() => onDelete(record)}><Trash2 size={16} /></button>
                </div>
              </div>

              <h3>{record.title || "Intervento"}</h3>
              <p>{machineName(record.machineId)}</p>

              <div className="maintenanceMeta">
                <span><CalendarDays size={15} />{formatDate(record.scheduledDate)}</span>
                <span><Wrench size={15} />{record.type}</span>
              </div>

              <dl>
                <div><dt>Tecnico</dt><dd>{record.technician || "—"}</dd></div>
                <div><dt>Costo</dt><dd>{record.cost ? `€ ${record.cost}` : "—"}</dd></div>
              </dl>
            </article>
          ))
        ) : (
          <div className="empty">
            <strong>Nessun intervento registrato</strong>
            <span>Crea la prima manutenzione programmata o correttiva.</span>
            <button className="primary" onClick={openNew}>
              <Plus size={17} /> Nuovo intervento
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
