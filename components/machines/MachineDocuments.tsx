"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import {
  listMachineDocuments,
  removeMachineDocument,
  uploadMachineDocument,
} from "@/lib/documents";
import { MachineDocument } from "@/types";

interface MachineDocumentsProps {
  uid: string;
  machineId: string;
  onError: (message: string) => void;
}

export default function MachineDocuments({
  uid,
  machineId,
  onError,
}: MachineDocumentsProps) {
  const [documents, setDocuments] = useState<MachineDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refreshDocuments() {
    setLoading(true);
    try {
      setDocuments(await listMachineDocuments(uid, machineId));
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDocuments();
  }, [uid, machineId]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;

    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMachineDocument(uid, machineId, file);
      }
      await refreshDocuments();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove(document: MachineDocument) {
    if (!confirm(`Eliminare ${document.name}?`)) return;

    setBusy(true);
    try {
      await removeMachineDocument(uid, document);
      await refreshDocuments();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="documentsBox">
      <div className="documentsHead">
        <div>
          <b>Manuali e allegati</b>
          <span>PDF, schemi, backup CNC, immagini e documenti tecnici.</span>
        </div>

        <label className={`documentUpload ${busy ? "disabled" : ""}`}>
          <Upload size={17} />
          {busy ? "Caricamento…" : "Carica file"}
          <input
            type="file"
            multiple
            disabled={busy}
            onChange={(event) => {
              uploadFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {loading ? (
        <div className="documentsEmpty">Caricamento documenti…</div>
      ) : documents.length ? (
        <div className="documentList">
          {documents.map((document) => (
            <div className="documentRow" key={document.id}>
              <span className="documentIcon"><FileText size={20} /></span>
              <div className="documentInfo">
                <b>{document.name}</b>
                <span>{formatBytes(document.size)} · {formatDate(document.createdAt)}</span>
              </div>
              <div className="documentActions">
                <a href={document.downloadUrl} target="_blank" rel="noreferrer" title="Apri">
                  <ExternalLink size={17} />
                </a>
                <a href={document.downloadUrl} download={document.name} title="Scarica">
                  <Download size={17} />
                </a>
                <button type="button" onClick={() => remove(document)} disabled={busy} title="Elimina">
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="documentsEmpty">
          <FileText size={25} />
          <b>Nessun documento caricato</b>
          <span>Usa “Carica file” per aggiungere il primo allegato.</span>
        </div>
      )}
    </section>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Si è verificato un errore.";
}
