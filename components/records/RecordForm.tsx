"use client";

import { useState } from "react";
import { Paperclip, X } from "lucide-react";

import Field from "@/components/common/Field";
import { recordModuleConfigs } from "@/lib/moduleConfigs";
import {
  Machine,
  RecordItem,
} from "@/types";

type RecordFormProps = {
  record: RecordItem;
  machines: Machine[];
  busy: boolean;
  close: () => void;
  submit: (
    record: RecordItem,
    attachment: File | null
  ) => void | Promise<void>;
};

type EditableKey =
  | "title"
  | "subtitle"
  | "status"
  | "machineId"
  | "notes";

export default function RecordForm({
  record,
  machines,
  busy,
  close,
  submit,
}: RecordFormProps) {
  const config = recordModuleConfigs[record.module];
  const [form, setForm] = useState(record);
  const [attachment, setAttachment] =
    useState<File | null>(null);
  const [validationError, setValidationError] = useState("");

  const set = (key: EditableKey, value: string) => {
    setValidationError("");
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      setValidationError(
        `Inserisci il titolo del ${config.singular}.`
      );
      return;
    }

    if (
      attachment &&
      attachment.size > 100 * 1024 * 1024
    ) {
      setValidationError(
        "L’allegato non può superare 100 MB."
      );
      return;
    }

    const machine = machines.find(
      (item) => item.id === form.machineId
    );

    submit(
      {
        ...form,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        machine: machine
          ? `${machine.brand} ${machine.model}`.trim()
          : "",
        notes: form.notes.trim(),
      },
      attachment
    );
  };

  return (
    <div className="modal">
      <form
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
                ? `Modifica ${config.singular}`
                : `Nuovo ${config.singular}`}
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

        <div className="formGrid">
          <Field
            label={config.titleLabel}
            value={form.title}
            set={(value) => set("title", value)}
            required
          />
          <Field
            label={config.subtitleLabel}
            value={form.subtitle}
            set={(value) => set("subtitle", value)}
          />

          <label>
            <span>Stato</span>
            <select
              value={form.status}
              onChange={(event) =>
                set("status", event.target.value)
              }
            >
              {config.statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Macchina collegata</span>
            <select
              value={form.machineId}
              onChange={(event) =>
                set("machineId", event.target.value)
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

          <label className="full">
            <span>{config.notesLabel}</span>
            <textarea
              value={form.notes}
              onChange={(event) =>
                set("notes", event.target.value)
              }
            />
          </label>

          {config.attachments && (
            <label className="full upload">
              <Paperclip />
              <span>
                {attachment
                  ? attachment.name
                  : record.fileName
                    ? `Sostituisci ${record.fileName}`
                    : "Aggiungi allegato"}
              </span>
              <input
                type="file"
                accept={config.attachmentAccept}
                onChange={(event) => {
                  setValidationError("");
                  setAttachment(
                    event.target.files?.[0] || null
                  );
                }}
              />
            </label>
          )}
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
            {busy ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </form>
    </div>
  );
}
