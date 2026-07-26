"use client";

import { useState } from "react";
import { X } from "lucide-react";

import Field from "@/components/common/Field";
import { recordModuleConfigs } from "@/lib/moduleConfigs";
import {
  buildToolSubtitle,
  normalizeToolDetails,
  parseToolNumber,
  toolCategories,
} from "@/lib/tools";
import {
  Machine,
  RecordItem,
  ToolCategory,
  ToolDetails,
} from "@/types";

type ToolFormProps = {
  record: RecordItem;
  machines: Machine[];
  busy: boolean;
  close: () => void;
  submit: (record: RecordItem) => void | Promise<void>;
};

type RecordKey = "title" | "status" | "machineId" | "notes";

const numericKeys: Array<keyof ToolDetails> = [
  "diameter",
  "cuttingLength",
  "totalLength",
  "fluteCount",
  "unitCost",
  "quantity",
  "minStock",
  "lifeHours",
  "usedHours",
];

export default function ToolForm({
  record,
  machines,
  busy,
  close,
  submit,
}: ToolFormProps) {
  const config = recordModuleConfigs.tools;
  const [form, setForm] = useState<RecordItem>({
    ...record,
    tool: normalizeToolDetails(record),
  });
  const [validationError, setValidationError] = useState("");
  const tool = normalizeToolDetails(form);

  const setRecord = (key: RecordKey, value: string) => {
    setValidationError("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setTool = (
    key: keyof ToolDetails,
    value: string
  ) => {
    setValidationError("");
    setForm((current) => ({
      ...current,
      tool: {
        ...normalizeToolDetails(current),
        [key]: value,
      },
    }));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      setValidationError("Inserisci il nome dell’utensile.");
      return;
    }

    if (!tool.code.trim()) {
      setValidationError("Inserisci il codice utensile.");
      return;
    }

    const invalidNumber = numericKeys.find(
      (key) =>
        tool[key].trim() &&
        parseToolNumber(tool[key]) < 0
    );

    if (invalidNumber) {
      setValidationError(
        "I valori numerici non possono essere negativi."
      );
      return;
    }

    const machine = machines.find(
      (item) => item.id === form.machineId
    );
    const normalizedTool = {
      ...tool,
      code: tool.code.trim(),
      manufacturer: tool.manufacturer.trim(),
      material: tool.material.trim(),
      coating: tool.coating.trim(),
      holder: tool.holder.trim(),
      location: tool.location.trim(),
      supplier: tool.supplier.trim(),
    };

    submit({
      ...form,
      title: form.title.trim(),
      subtitle: buildToolSubtitle(normalizedTool),
      machine: machine
        ? `${machine.brand} ${machine.model}`.trim()
        : "",
      notes: form.notes.trim(),
      tool: normalizedTool,
    });
  };

  return (
    <div className="modal">
      <form
        className="toolForm"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="modalHead">
          <div>
            <small>{config.eyebrow}</small>
            <h2>
              {record.title
                ? "Modifica utensile"
                : "Nuovo utensile"}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label="Chiudi"
          >
            <X />
          </button>
        </div>

        <div className="toolFormBody">
          <fieldset>
            <legend>Identificazione</legend>
            <div className="formGrid toolFormGrid">
              <Field
                label="Nome utensile"
                value={form.title}
                set={(value) => setRecord("title", value)}
                required
              />
              <Field
                label="Codice utensile"
                value={tool.code}
                set={(value) => setTool("code", value)}
                required
              />

              <label>
                <span>Categoria</span>
                <select
                  value={tool.category}
                  onChange={(event) =>
                    setTool(
                      "category",
                      event.target.value as ToolCategory
                    )
                  }
                >
                  {toolCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Stato operativo</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setRecord("status", event.target.value)
                  }
                >
                  {config.statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Specifiche tecniche</legend>
            <div className="formGrid toolFormGrid">
              <Field
                label="Produttore"
                value={tool.manufacturer}
                set={(value) => setTool("manufacturer", value)}
              />
              <Field
                label="Materiale utensile"
                value={tool.material}
                set={(value) => setTool("material", value)}
              />
              <Field
                label="Rivestimento"
                value={tool.coating}
                set={(value) => setTool("coating", value)}
              />
              <Field
                label="Attacco / portautensile"
                value={tool.holder}
                set={(value) => setTool("holder", value)}
              />
              <NumberField
                label="Diametro (mm)"
                value={tool.diameter}
                set={(value) => setTool("diameter", value)}
              />
              <NumberField
                label="Lunghezza tagliente (mm)"
                value={tool.cuttingLength}
                set={(value) => setTool("cuttingLength", value)}
              />
              <NumberField
                label="Lunghezza totale (mm)"
                value={tool.totalLength}
                set={(value) => setTool("totalLength", value)}
              />
              <NumberField
                label="Numero taglienti"
                value={tool.fluteCount}
                set={(value) => setTool("fluteCount", value)}
                step="1"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Magazzino e acquisto</legend>
            <div className="formGrid toolFormGrid">
              <NumberField
                label="Quantità disponibile"
                value={tool.quantity}
                set={(value) => setTool("quantity", value)}
                step="1"
              />
              <NumberField
                label="Scorta minima"
                value={tool.minStock}
                set={(value) => setTool("minStock", value)}
                step="1"
              />
              <Field
                label="Posizione magazzino"
                value={tool.location}
                set={(value) => setTool("location", value)}
              />
              <Field
                label="Fornitore"
                value={tool.supplier}
                set={(value) => setTool("supplier", value)}
              />
              <NumberField
                label="Costo unitario (€)"
                value={tool.unitCost}
                set={(value) => setTool("unitCost", value)}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Utilizzo e durata</legend>
            <div className="formGrid toolFormGrid">
              <NumberField
                label="Vita prevista (ore)"
                value={tool.lifeHours}
                set={(value) => setTool("lifeHours", value)}
              />
              <NumberField
                label="Ore utilizzate"
                value={tool.usedHours}
                set={(value) => setTool("usedHours", value)}
              />

              <label>
                <span>Ultimo utilizzo</span>
                <input
                  type="date"
                  value={tool.lastUsedAt}
                  onChange={(event) =>
                    setTool("lastUsedAt", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Macchina collegata</span>
                <select
                  value={form.machineId}
                  onChange={(event) =>
                    setRecord("machineId", event.target.value)
                  }
                >
                  <option value="">Nessuna macchina</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.brand} {machine.model}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Parametri e note</legend>
            <label className="toolNotes">
              <span>
                Parametri di taglio, avanzamenti e note operative
              </span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setRecord("notes", event.target.value)
                }
              />
            </label>
          </fieldset>
        </div>

        {validationError && (
          <div className="formError" role="alert">
            {validationError}
          </div>
        )}

        <div className="modalActions">
          <button
            type="button"
            onClick={close}
            disabled={busy}
          >
            Annulla
          </button>
          <button
            type="submit"
            className="primary"
            disabled={busy}
          >
            {busy ? "Salvataggio…" : "Salva utensile"}
          </button>
        </div>
      </form>
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: string;
  set: (value: string) => void;
  step?: string;
};

function NumberField({
  label,
  value,
  set,
  step = "0.01",
}: NumberFieldProps) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => set(event.target.value)}
      />
    </label>
  );
}
