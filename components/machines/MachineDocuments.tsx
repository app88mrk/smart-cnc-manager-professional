"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import FeedbackBanner from "@/components/common/FeedbackBanner";
import useFeedback from "@/hooks/useFeedback";
import useMachineDocuments from "@/hooks/useMachineDocuments";
import { MachineDocument } from "@/types";

interface MachineDocumentsProps {
  uid: string;
  machineId: string;
}

export default function MachineDocuments({
  uid,
  machineId,
}: MachineDocumentsProps) {
  const [pendingDelete, setPendingDelete] =
    useState<MachineDocument | null>(null);
  const {
    feedback,
    showError,
    showSuccess,
    clearFeedback,
  } = useFeedback({ successDuration: 0 });

  const {
    documents,
    documentsLoading,
    documentsBusy,
    uploadDocuments,
    deleteDocument,
  } = useMachineDocuments({
    uid,
    machineId,
    onError: showError,
  });

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;

    const selectedFiles = Array.from(files);
    clearFeedback();

    try {
      await uploadDocuments(selectedFiles);
      showSuccess(
        selectedFiles.length === 1
          ? "Documento caricato correttamente."
          : `${selectedFiles.length} documenti caricati correttamente.`
      );
    } catch {
      // L'errore viene mostrato da useMachineDocuments.
    }
  }

  async function remove(document: MachineDocument) {
    clearFeedback();

    try {
      await deleteDocument(document);
      setPendingDelete(null);
      showSuccess("Documento eliminato correttamente.");
    } catch {
      setPendingDelete(null);
      // L'errore viene mostrato da useMachineDocuments.
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

          <label
            className={`documentUpload ${
              documentsBusy ? "disabled" : ""
            }`}
          >
            <Upload size={17} />
            {documentsBusy ? "Caricamento…" : "Carica file"}
            <input
              type="file"
              multiple
              disabled={documentsBusy}
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
              close={clearFeedback}
            />
          </div>
        )}

        {documentsLoading ? (
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
                    disabled={documentsBusy}
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
          busy={documentsBusy}
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
