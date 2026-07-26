"use client";

import {
  Download,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { recordModuleConfigs } from "@/lib/moduleConfigs";
import { modules } from "@/lib/modules";
import {
  Machine,
  RecordItem,
  RecordModuleId,
} from "@/types";

type RecordsPageProps = {
  moduleId: RecordModuleId;
  records: RecordItem[];
  machines: Machine[];
  loading: boolean;
  openNew: () => void;
  openEdit: (record: RecordItem) => void;
  onDelete: (record: RecordItem) => void;
};

export default function RecordsPage({
  moduleId,
  records,
  machines,
  loading,
  openNew,
  openEdit,
  onDelete,
}: RecordsPageProps) {
  const config = recordModuleConfigs[moduleId];
  const module = modules.find((item) => item.id === moduleId)!;

  const machineName = (record: RecordItem) => {
    const machine = machines.find(
      (item) => item.id === record.machineId
    );

    return machine
      ? `${machine.brand} ${machine.model}`
      : record.machine;
  };

  return (
    <>
      <div className="pageHead">
        <div>
          <p>{config.eyebrow}</p>
          <h1>{module.label}</h1>
          <span>{module.description}</span>
        </div>

        <button className="primary" onClick={openNew}>
          <Plus size={18} />
          Nuovo {config.singular}
        </button>
      </div>

      {loading && (
        <div className="inlineLoading" role="status">
          <LoaderCircle className="spinner" size={18} />
          Aggiornamento {module.label.toLowerCase()}…
        </div>
      )}

      <section className="recordGrid">
        {records.length ? (
          records.map((record) => (
            <article className="genericRecordCard" key={record.id}>
              <div className="recordCardHead">
                <span className="recordModuleIcon">
                  {module.icon}
                </span>
                <div className="cardActions">
                  <button
                    onClick={() => openEdit(record)}
                    title="Modifica"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(record)}
                    title="Elimina"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <span className="statusBadge">
                {record.status}
              </span>
              <h3>{record.title}</h3>
              <p className="recordSubtitle">
                {record.subtitle || "Dettagli non inseriti"}
              </p>

              {record.notes && (
                <p className="recordNotes">{record.notes}</p>
              )}

              <div className="recordMeta">
                {machineName(record) && (
                  <span>▦ {machineName(record)}</span>
                )}
                <span>
                  Aggiornato {formatDate(record.updatedAt)}
                </span>
              </div>

              {record.fileUrl && (
                <a
                  className="recordFile"
                  href={record.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={16} />
                  <span>{record.fileName || "Apri allegato"}</span>
                  {record.fileSize ? (
                    <small>{formatBytes(record.fileSize)}</small>
                  ) : null}
                </a>
              )}
            </article>
          ))
        ) : (
          <div className="empty">
            <strong>
              Nessun {config.singular} registrato
            </strong>
            <span>
              Crea la prima scheda del modulo {module.label}.
            </span>
            <button className="primary" onClick={openNew}>
              <Plus size={17} />
              Nuovo {config.singular}
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
