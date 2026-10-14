import {
  listMachines,
  replaceMachines,
} from "@/lib/machines";
import { replaceMaintenance } from "@/lib/maintenance";
import { replaceRecords } from "@/lib/records";
import {
  listMachineDocuments,
  replaceMachineDocuments,
} from "@/lib/documents";
import {
  Machine,
  MachineDocument,
  MaintenanceRecord,
  RecordItem,
} from "@/types";

export type SmartCncBackup = {
  application: "Smart CNC Manager Professional";
  version: 1;
  exportedAt: string;
  machines: Machine[];
  maintenance: MaintenanceRecord[];
  records: RecordItem[];
  documents: MachineDocument[];
};

type CreateBackupInput = {
  machines: Machine[];
  maintenance: MaintenanceRecord[];
  records: RecordItem[];
  documents: MachineDocument[];
};

export function createBackup({
  machines,
  maintenance,
  records,
  documents,
}: CreateBackupInput): SmartCncBackup {
  return {
    application: "Smart CNC Manager Professional",
    version: 1,
    exportedAt: new Date().toISOString(),
    machines,
    maintenance,
    records,
    documents,
  };
}

export async function collectMachineDocuments(
  uid: string,
  machines: Machine[]
) {
  return (
    await Promise.all(
      machines.map((machine) =>
        listMachineDocuments(uid, machine.id)
      )
    )
  ).flat();
}

export function downloadBackup(backup: SmartCncBackup) {
  const content = JSON.stringify(backup, null, 2);
  const blob = new Blob([content], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = backup.exportedAt.slice(0, 10);

  link.href = url;
  link.download = `smart-cnc-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(
  file: File
): Promise<SmartCncBackup> {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Il backup supera il limite di 25 MB.");
  }

  const parsed = JSON.parse(await file.text()) as unknown;

  if (!isBackup(parsed)) {
    throw new Error(
      "Il file non è un backup valido di Smart CNC Manager."
    );
  }

  return parsed;
}

export async function restoreBackup(
  uid: string,
  backup: SmartCncBackup
) {
  const currentMachines = await listMachines(uid);
  const currentMachineIds = [
    ...backup.machines,
    ...currentMachines,
  ]
    .map((machine) => machine.id);
  const machineIds = Array.from(new Set(currentMachineIds));

  await replaceMachines(uid, backup.machines);
  await replaceMaintenance(uid, backup.maintenance);
  await replaceRecords(uid, backup.records);
  await replaceMachineDocuments(
    uid,
    machineIds,
    backup.documents
  );
}

function isBackup(value: unknown): value is SmartCncBackup {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SmartCncBackup>;

  return (
    candidate.application === "Smart CNC Manager Professional" &&
    candidate.version === 1 &&
    typeof candidate.exportedAt === "string" &&
    Array.isArray(candidate.machines) &&
    Array.isArray(candidate.maintenance) &&
    Array.isArray(candidate.records) &&
    Array.isArray(candidate.documents) &&
    candidate.machines.every(hasRecordIdentity) &&
    candidate.maintenance.every(hasRecordIdentity) &&
    candidate.records.every(hasRecordIdentity) &&
    candidate.documents.every(hasRecordIdentity)
  );
}

function hasRecordIdentity(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    id?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  return (
    typeof candidate.id === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}
