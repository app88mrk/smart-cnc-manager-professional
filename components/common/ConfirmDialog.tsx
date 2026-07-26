"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  busy: boolean;
  confirmLabel?: string;
  cancel: () => void;
  confirm: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  busy,
  confirmLabel = "Elimina",
  cancel,
  confirm,
}: ConfirmDialogProps) {
  return (
    <div className="modal" role="presentation">
      <section
        className="confirmDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="confirmIcon">
          <AlertTriangle size={26} />
        </div>

        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>

        <div className="modalActions">
          <button type="button" onClick={cancel} disabled={busy}>
            Annulla
          </button>
          <button
            type="button"
            className="danger"
            onClick={confirm}
            disabled={busy}
          >
            {busy ? "Eliminazione…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
