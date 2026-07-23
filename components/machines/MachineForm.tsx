"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import Field from "@/components/common/Field";
import { Machine } from "@/types";

interface MachineFormProps {
  machine: Machine;
  busy: boolean;
  close: () => void;
  submit: (machine: Machine, photo: File | null) => void;
}

export default function MachineForm({
  machine,
  busy,
  close,
  submit,
}: MachineFormProps) {
  const [form, setForm] = useState(machine);
  const [photo, setPhoto] = useState<File | null>(null);

  const set = (key: keyof Machine, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="modal">
      <form onSubmit={(event) => {
        event.preventDefault();
        submit(form, photo);
      }}>
        <div className="modalHead">
          <div>
            <small>SCHEDA MACCHINA</small>
            <h2>{machine.brand || machine.model ? "Modifica macchina" : "Nuova macchina"}</h2>
          </div>
          <button type="button" onClick={close}><X /></button>
        </div>

        <div className="formGrid">
          <Field label="Marca" value={form.brand} set={(value) => set("brand", value)} required />
          <Field label="Modello" value={form.model} set={(value) => set("model", value)} required />
          <Field label="Matricola" value={form.serialNumber} set={(value) => set("serialNumber", value)} />
          <Field label="Anno" value={form.year} set={(value) => set("year", value)} type="number" />
          <Field label="Controllo CNC" value={form.cncControl} set={(value) => set("cncControl", value)} />

          <label>
            <span>Stato</span>
            <select value={form.status} onChange={(event) => set("status", event.target.value)}>
              <option>Operativa</option>
              <option>Manutenzione</option>
              <option>Fuori servizio</option>
              <option>Dismessa</option>
            </select>
          </label>

          <Field label="Corsa X (mm)" value={form.travelX} set={(value) => set("travelX", value)} />
          <Field label="Corsa Y (mm)" value={form.travelY} set={(value) => set("travelY", value)} />
          <Field label="Corsa Z (mm)" value={form.travelZ} set={(value) => set("travelZ", value)} />
          <Field label="Mandrino" value={form.spindle} set={(value) => set("spindle", value)} />
          <Field label="Attacco utensile" value={form.toolTaper} set={(value) => set("toolTaper", value)} />
          <Field label="Magazzino utensili" value={form.toolMagazine} set={(value) => set("toolMagazine", value)} />
          <Field label="Reparto / posizione" value={form.department} set={(value) => set("department", value)} full />

          <label className="full">
            <span>Note tecniche</span>
            <textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} />
          </label>

          <label className="full upload">
            <Upload />
            <span>{photo ? photo.name : form.photoUrl ? "Sostituisci foto macchina" : "Carica foto macchina"}</span>
            <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="modalActions">
          <button type="button" onClick={close}>Annulla</button>
          <button className="primary" disabled={busy}>
            {busy ? "Salvataggio…" : "Salva macchina"}
          </button>
        </div>
      </form>
    </div>
  );
}
