"use client";

import { Plus, Wrench } from "lucide-react";
import { MaintenanceRecord } from "@/types";

interface MachineMaintenanceProps {
  records: MaintenanceRecord[];
  add: () => void;
}

export default function MachineMaintenance({ records, add }: MachineMaintenanceProps) {
  return (
    <section className="machineMaintenance">
      <div className="documentsHead">
        <div>
          <b>Storico manutenzioni</b>
          <span>Interventi collegati a questa macchina.</span>
        </div>
        <button className="primary" onClick={add}>
          <Plus size={17} /> Intervento
        </button>
      </div>

      {records.length ? (
        <div className="maintenanceRows">
          {records.slice(0, 6).map((record) => (
            <div key={record.id}>
              <span className={`statusBadge ${statusClass(record.status)}`}>
                {record.status}
              </span>
              <div>
                <b>{record.title}</b>
                <small>
                  {record.type} · {formatDate(record.scheduledDate)} · {record.technician || "Tecnico non indicato"}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="documentsEmpty">
          <Wrench size={25} />
          <b>Nessun intervento</b>
          <span>Aggiungi la prima manutenzione della macchina.</span>
        </div>
      )}
    </section>
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
