"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  LoaderCircle,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
  Wrench,
} from "lucide-react";

import { Machine, MaintenanceRecord } from "@/types";

interface MaintenancePageProps {
  records: MaintenanceRecord[];
  machines: Machine[];
  openNew: () => void;
  openEdit: (record: MaintenanceRecord) => void;
  onDelete: (record: MaintenanceRecord) => void;
  onToggleChecklist: (record: MaintenanceRecord, itemId: string) => void;
  loading: boolean;
}

export default function MaintenancePage({
  records,
  machines,
  openNew,
  openEdit,
  onDelete,
  onToggleChecklist,
  loading,
}: MaintenancePageProps) {
  const [filter, setFilter] = useState("Aperte");
  const today = startOfToday();
  const inSevenDays = addDays(today, 7);
  const openRecords = records.filter((record) => record.status !== "Completata");
  const overdue = openRecords.filter(
    (record) => recordDate(record) < today
  );
  const upcoming = openRecords.filter((record) => {
    const date = recordDate(record);
    return date >= today && date <= inSevenDays;
  });
  const totalCost = records.reduce(
    (sum, record) => sum + numberValue(record.cost),
    0
  );
  const filtered = useMemo(() => {
    const next = records.filter((record) => {
      if (filter === "Aperte") return record.status !== "Completata";
      if (filter === "Scadute") {
        return record.status !== "Completata" && recordDate(record) < today;
      }
      if (filter === "Completate") return record.status === "Completata";
      return true;
    });
    return [...next].sort(
      (left, right) => recordDate(left).getTime() - recordDate(right).getTime()
    );
  }, [filter, records, today]);

  const machineName = (id: string) => {
    const machine = machines.find((item) => item.id === id);
    return machine
      ? `${machine.brand} ${machine.model}`
      : "Macchina non disponibile";
  };

  return (
    <div className="maintenanceWorkspace">
      <section className="maintenanceHeroPro">
        <div>
          <span>Affidabilità impianti · centro operativo</span>
          <h1>Manutenzione professionale</h1>
          <p>
            Pianifica interventi, esegui checklist controllate e genera
            automaticamente la prossima scadenza degli interventi ricorrenti.
          </p>
        </div>
        <button className="primary" onClick={openNew}>
          <Plus size={18} /> Nuovo intervento
        </button>
      </section>

      <section className="maintenanceKpisPro">
        <MaintenanceKpi
          icon={<AlertTriangle />}
          label="Scadute"
          value={String(overdue.length)}
          tone={overdue.length ? "danger" : "ok"}
        />
        <MaintenanceKpi
          icon={<CalendarCheck2 />}
          label="Entro 7 giorni"
          value={String(upcoming.length)}
          tone="warning"
        />
        <MaintenanceKpi
          icon={<Wrench />}
          label="Interventi aperti"
          value={String(openRecords.length)}
          tone="blue"
        />
        <MaintenanceKpi
          icon={<CircleDollarSign />}
          label="Costo registrato"
          value={formatCurrency(totalCost)}
          tone="neutral"
        />
      </section>

      {overdue.length > 0 && (
        <section className="maintenanceAlertStrip">
          <AlertTriangle size={20} />
          <div>
            <b>{overdue.length} interventi richiedono attenzione immediata</b>
            <span>
              Il più vecchio è “{overdue.sort((a, b) => recordDate(a).getTime() - recordDate(b).getTime())[0]?.title}”.
            </span>
          </div>
          <button type="button" onClick={() => setFilter("Scadute")}>Mostra scadute</button>
        </section>
      )}

      <section className="maintenanceRegisterHead">
        <div>
          <h2>Agenda interventi</h2>
          <span>{filtered.length} schede visualizzate</span>
        </div>
        <div>
          {["Aperte", "Scadute", "Completate", "Tutte"].map((item) => (
            <button
              type="button"
              className={filter === item ? "active" : ""}
              key={item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <div className="inlineLoading" role="status">
          <LoaderCircle className="spinner" size={18} />
          Aggiornamento manutenzioni…
        </div>
      )}

      <section className="maintenanceGridPro">
        {filtered.length ? (
          filtered.map((record) => {
            const checklist = record.checklist || [];
            const done = checklist.filter((item) => item.done).length;
            const progress = checklist.length
              ? Math.round((done / checklist.length) * 100)
              : 0;
            const due = dueState(record, today, inSevenDays);

            return (
              <article className={`maintenanceCardPro ${due}`} key={record.id}>
                <div className="maintenanceCardProHead">
                  <div>
                    <span className={`maintenancePriority priority-${(record.priority || "Media").toLowerCase()}`}>
                      {record.priority || "Media"}
                    </span>
                    <span className={`maintenanceDue due-${due}`}>
                      {dueLabel(record, due)}
                    </span>
                  </div>
                  <div className="cardActions">
                    <button onClick={() => openEdit(record)} title="Modifica"><Pencil size={16} /></button>
                    <button onClick={() => onDelete(record)} title="Elimina"><Trash2 size={16} /></button>
                  </div>
                </div>

                <h3>{record.title || "Intervento"}</h3>
                <p className="maintenanceMachine"><Wrench size={15} /> {machineName(record.machineId)}</p>

                <div className="maintenanceInfoGrid">
                  <span><CalendarDays size={15} /><small>Scadenza</small><b>{formatDate(record.scheduledDate)}</b></span>
                  <span><ClipboardCheck size={15} /><small>Tipo</small><b>{record.type}</b></span>
                  <span><Wrench size={15} /><small>Tecnico</small><b>{record.technician || "Da assegnare"}</b></span>
                  <span><CircleDollarSign size={15} /><small>Costo</small><b>{record.cost ? formatCurrency(numberValue(record.cost)) : "—"}</b></span>
                </div>

                {record.recurrence && record.recurrence !== "Nessuna" && (
                  <div className="maintenanceRecurrence">
                    <Repeat2 size={15} /> Ripetizione {record.recurrence.toLowerCase()}
                  </div>
                )}

                <div className="maintenanceChecklistCard">
                  <div>
                    <span><CheckCircle2 size={16} /> Checklist</span>
                    <b>{done}/{checklist.length || 0}</b>
                  </div>
                  <div className="maintenanceChecklistProgress"><i style={{ width: `${progress}%` }} /></div>
                  {checklist.length ? (
                    <ul>
                      {checklist.map((item) => (
                        <li key={item.id} className={item.done ? "done" : ""}>
                          <label>
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => onToggleChecklist(record, item.id)}
                            />
                            <span>{item.label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <button type="button" onClick={() => openEdit(record)}>
                      Aggiungi checklist operativa
                    </button>
                  )}
                </div>

                <footer>
                  <span className={`statusBadge ${statusClass(record.status)}`}>{record.status}</span>
                  <small>Aggiornato {formatDate(record.updatedAt.slice(0, 10))}</small>
                </footer>
              </article>
            );
          })
        ) : (
          <div className="empty maintenanceEmptyPro">
            <strong>Nessun intervento nel filtro selezionato</strong>
            <span>Crea una manutenzione programmata o cambia il filtro.</span>
            <button className="primary" onClick={openNew}>
              <Plus size={17} /> Nuovo intervento
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function MaintenanceKpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className={tone}>
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  );
}

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function dueState(
  record: MaintenanceRecord,
  today: Date,
  inSevenDays: Date
) {
  if (record.status === "Completata") return "completed";
  const date = recordDate(record);
  if (date < today) return "overdue";
  if (date <= inSevenDays) return "upcoming";
  return "planned";
}

function dueLabel(record: MaintenanceRecord, state: string) {
  if (state === "completed") return "Completata";
  const days = Math.ceil(
    (recordDate(record).getTime() - startOfToday().getTime()) / 86400000
  );
  if (days < 0) return `Scaduta da ${Math.abs(days)} g`;
  if (days === 0) return "Scade oggi";
  return `Tra ${days} giorni`;
}

function recordDate(record: MaintenanceRecord) {
  return new Date(`${record.scheduledDate}T12:00:00`);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function numberValue(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
