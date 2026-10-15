"use client";

import { useState } from "react";
import { CheckSquare2, Plus, Trash2, X } from "lucide-react";
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
  const [form, setForm] = useState({
    ...record,
    priority: record.priority || "Media" as const,
    recurrence: record.recurrence || "Nessuna" as const,
    checklist: record.checklist || [],
  });
  const [checklistItem, setChecklistItem] = useState("");
  const [validationError, setValidationError] = useState("");

  const set = (key: keyof MaintenanceRecord, value: string) => {
    setValidationError("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = () => {
    if (!form.machineId) {
      return "Seleziona la macchina interessata.";
    }

    if (!form.title.trim()) {
      return "Inserisci il titolo dell’intervento.";
    }

    if (!form.scheduledDate) {
      return "Inserisci la data pianificata.";
    }

    if (
      form.completedDate &&
      form.completedDate < form.scheduledDate
    ) {
      return "La data di completamento non può precedere quella pianificata.";
    }

    if (form.status === "Completata" && !form.completedDate) {
      return "Inserisci la data di completamento dell’intervento.";
    }

    if (
      (form.hours && Number(form.hours) < 0) ||
      (form.cost && Number(form.cost) < 0)
    ) {
      return "Ore e costo non possono essere valori negativi.";
    }

    return "";
  };

  const handleSubmit = () => {
    const message = validate();

    if (message) {
      setValidationError(message);
      return;
    }

    submit({
      ...form,
      title: form.title.trim(),
      technician: form.technician.trim(),
    });
  };

  const addChecklistItem = () => {
    const label = checklistItem.trim();
    if (!label) return;
    setForm((current) => ({
      ...current,
      checklist: [
        ...(current.checklist || []),
        { id: crypto.randomUUID(), label, done: false },
      ],
    }));
    setChecklistItem("");
  };

  return (
    <div className="modal">
      <form onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
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

          <label>
            <span>Priorità</span>
            <select value={form.priority} onChange={(event) => set("priority", event.target.value)}>
              <option>Bassa</option>
              <option>Media</option>
              <option>Alta</option>
              <option>Critica</option>
            </select>
          </label>

          <label>
            <span>Ripetizione automatica</span>
            <select value={form.recurrence} onChange={(event) => set("recurrence", event.target.value)}>
              <option>Nessuna</option>
              <option>Settimanale</option>
              <option>Mensile</option>
              <option>Trimestrale</option>
              <option>Semestrale</option>
              <option>Annuale</option>
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

          <div className="maintenanceChecklistEditor full">
            <div className="maintenanceChecklistTitle">
              <span><CheckSquare2 size={16} /> Checklist operativa</span>
              <small>{form.checklist?.length || 0} controlli</small>
            </div>
            <div className="maintenanceChecklistAdd">
              <input
                value={checklistItem}
                onChange={(event) => setChecklistItem(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Es. Controllare livello olio mandrino"
              />
              <button type="button" onClick={addChecklistItem}>
                <Plus size={16} /> Aggiungi
              </button>
            </div>
            {form.checklist?.length ? (
              <div className="maintenanceChecklistRows">
                {form.checklist.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          checklist: current.checklist?.map((currentItem) =>
                            currentItem.id === item.id
                              ? { ...currentItem, done: !currentItem.done }
                              : currentItem
                          ),
                        }))
                      }
                    />
                    <span>{item.label}</span>
                    <button
                      type="button"
                      title="Elimina controllo"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          checklist: current.checklist?.filter(
                            (currentItem) => currentItem.id !== item.id
                          ),
                        }))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </label>
                ))}
              </div>
            ) : (
              <p>Nessun controllo inserito. Crea la sequenza da seguire durante l’intervento.</p>
            )}
          </div>
        </div>

        {validationError && (
          <div className="formError" role="alert">
            {validationError}
          </div>
        )}

        <div className="modalActions">
          <button type="button" onClick={close} disabled={busy}>Annulla</button>
          <button className="primary" disabled={busy} type="submit">
            {busy ? "Salvataggio…" : "Salva intervento"}
          </button>
        </div>
      </form>
    </div>
  );
}
