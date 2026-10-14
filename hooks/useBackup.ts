"use client";

import { useCallback, useState } from "react";

import {
  createBackup,
  collectMachineDocuments,
  downloadBackup,
  readBackupFile,
  restoreBackup as persistBackup,
} from "@/lib/backup";
import {
  Machine,
  MaintenanceRecord,
  RecordItem,
} from "@/types";

type UseBackupOptions = {
  uid: string;
  machines: Machine[];
  maintenance: MaintenanceRecord[];
  records: RecordItem[];
  refreshMachines: () => Promise<void>;
  refreshMaintenance: () => Promise<void>;
  refreshRecords: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export default function useBackup({
  uid,
  machines,
  maintenance,
  records,
  refreshMachines,
  refreshMaintenance,
  refreshRecords,
  onError,
  onSuccess,
}: UseBackupOptions) {
  const [backupBusy, setBackupBusy] = useState(false);

  const exportBackup = useCallback(async () => {
    setBackupBusy(true);

    try {
      const documents = await collectMachineDocuments(
        uid,
        machines
      );
      downloadBackup(
        createBackup({
          machines,
          maintenance,
          records,
          documents,
        })
      );
      onSuccess("Backup scaricato correttamente.");
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBackupBusy(false);
    }
  }, [
    machines,
    maintenance,
    onError,
    onSuccess,
    records,
    uid,
  ]);

  const importBackup = useCallback(
    async (file: File) => {
      setBackupBusy(true);

      try {
        const backup = await readBackupFile(file);
        await persistBackup(uid, backup);
        await Promise.all([
          refreshMachines(),
          refreshMaintenance(),
          refreshRecords(),
        ]);
        onSuccess(
          `Backup del ${formatDate(
            backup.exportedAt
          )} ripristinato correttamente.`
        );
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        setBackupBusy(false);
      }
    },
    [
      onError,
      onSuccess,
      refreshMachines,
      refreshMaintenance,
      refreshRecords,
      uid,
    ]
  );

  return {
    backupBusy,
    exportBackup,
    importBackup,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Si è verificato un errore.";
}
