"use client";

import { Download, LoaderCircle, Upload } from "lucide-react";

type BackupControlsProps = {
  busy: boolean;
  exportBackup: () => void | Promise<void>;
  selectBackup: (file: File) => void;
};

export default function BackupControls({
  busy,
  exportBackup,
  selectBackup,
}: BackupControlsProps) {
  return (
    <div className="asideFooter">
      <button
        type="button"
        onClick={exportBackup}
        disabled={busy}
        title="Scarica un backup JSON"
      >
        <Download size={15} />
        Backup
      </button>

      <label
        className={busy ? "disabled" : ""}
        title="Ripristina un backup JSON"
      >
        {busy ? (
          <LoaderCircle className="spinner" size={15} />
        ) : (
          <Upload size={15} />
        )}
        {busy ? "Ripristino…" : "Ripristina"}
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              selectBackup(file);
            }

            event.currentTarget.value = "";
          }}
        />
      </label>
    </div>
  );
}
