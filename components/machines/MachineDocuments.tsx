"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import FeedbackBanner from "@/components/common/FeedbackBanner";
import {
  listMachineDocuments,
  removeMachineDocument,
  uploadMachineDocument,
} from "@/lib/documents";
import { MachineDocument } from "@/types";

interface MachineDocumentsProps {
  uid: string;
  machineId: string;
}

export default function MachineDocuments({
  uid,
  machineId,
}: MachineDocumentsProps) {
  const [documents, setDocuments] = useState<MachineDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] =
    useState<MachineDocument | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function refreshDocuments() {
    setLoading(true);
    try {
      setDocuments(await listMachineDocuments(uid, machineId));
    } catch (error) {
      setFeedback({ type: "error", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDocuments();
  }, [uid, machineId]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;

    const selectedFiles = Array.from(files);
    setBusy(true);
    setFeedback(null);

    try {
      for (const file of selectedFiles) {
        await uploadMachineDocument(uid, machineId, file);
      }
      await refreshDocuments();
      setFeedback({
        type: "success",
        message:
          selectedFiles.length === 1
            ? "Documento caricato correttamente."
            : `${selectedFiles.length} documenti caricati correttamente.`,
      });
    } catch (error) {
      setFeedback({ type: "error", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(document: MachineDocument) {
    setBusy(true);
    setFeedback(null);

    try {
      await removeMachineDocument(uid, document);
      await refreshDocuments();
      setPendingDelete(null);
      setFeedback({
        type: "success",
        message: "Documento eliminato correttamente.",
      });
    } catch (error) {
      setPendingDelete(null);
      setFeedback({ type: "error", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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

        {feedback && (
          <div className="documentFeedback">
            <FeedbackBanner
              type={feedback.type}
              message={feedback.message}
              close={() => setFeedback(null)}
            />
          </div>
        )}

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
                  <button
                    type="button"
                    onClick={() => setPendingDelete(document)}
                    disabled={busy}
                    title="Elimina"
                  >
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

      {pendingDelete && (
        <ConfirmDialog
          title="Eliminare il documento?"
          message={`“${pendingDelete.name}” verrà eliminato definitivamente.`}
          busy={busy}
          cancel={() => setPendingDelete(null)}
          confirm={() => remove(pendingDelete)}
        />
      )}
    </>
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
