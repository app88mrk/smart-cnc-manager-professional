"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Field from "@/components/common/Field";
import { Machine, MaintenanceRecord } from "@/types";

interface MaintenanceFormProps {
  record: MaintenanceRecord;
  machines: Machine[];
  busy: boolean;
  close: () => void;
  submit: (record: MaintenanceRecord) => void;
}

export default function MaintenanceForm({
  record,
  machines,
  busy,
  close,
  submit,
}: MaintenanceFormProps) {
  const [form, setForm] = useState(record);

  const set = (key: keyof MaintenanceRecord, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="modal">
      <form onSubmit={(event) => {
        event.preventDefault();
        submit(form);
      }}>
        <div className="modalHead">
          <div>
            <small>INTERVENTO</small>
            <h2>{record.title ? "Modifica manutenzione" : "Nuova manutenzione"}</h2>
          </div>
          <button type="button" onClick={close}><X /></button>
        </div>

        <div className="formGrid">
          <label>
            <span>Macchina</span>
            <select value={form.machineId} onChange={(event) => set("machineId", event.target.value)} required>
              <option value="">Seleziona macchina</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.brand} {machine.model}
                </option>
              ))}
            </select>
          </label>

          <Field label="Titolo intervento" value={form.title} set={(value) => set("title", value)} required />

          <label>
            <span>Tipo</span>
            <select value={form.type} onChange={(event) => set("type", event.target.value)}>
              <option>Preventiva</option>
              <option>Correttiva</option>
              <option>Guasto</option>
              <option>Ispezione</option>
            </select>
          </label>

          <label>
            <span>Stato</span>
            <select value={form.status} onChange={(event) => set("status", event.target.value)}>
              <option>Pianificata</option>
              <option>In corso</option>
              <option>Completata</option>
            </select>
          </label>

          <Field label="Data pianificata" value={form.scheduledDate} set={(value) => set("scheduledDate", value)} type="date" required />
          <Field label="Data completamento" value={form.completedDate} set={(value) => set("completedDate", value)} type="date" />
          <Field label="Tecnico" value={form.technician} set={(value) => set("technician", value)} />
          <Field label="Ore impiegate" value={form.hours} set={(value) => set("hours", value)} type="number" />
          <Field label="Costo (€)" value={form.cost} set={(value) => set("cost", value)} type="number" />
          <Field label="Ricambi utilizzati" value={form.parts} set={(value) => set("parts", value)} />

          <label className="full">
            <span>Descrizione e note</span>
            <textarea value={form.description} onChange={(event) => set("description", event.target.value)} />
          </label>
        </div>

        <div className="modalActions">
          <button type="button" onClick={close}>Annulla</button>
          <button className="primary" disabled={busy}>
            {busy ? "Salvataggio…" : "Salva intervento"}
          </button>
        </div>
      </form>
    </div>
  );
}
