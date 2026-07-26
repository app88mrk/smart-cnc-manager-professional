import {
  listMachineDocuments,
  removeMachineDocument,
} from "@/lib/documents";
import {
  listMaintenance,
  removeMaintenance,
} from "@/lib/maintenance";
import { removeMachine } from "@/lib/machines";
import {
  listRecords,
  removeRecord,
} from "@/lib/records";
import { Machine } from "@/types";

export async function removeMachineCascade(
  uid: string,
  machine: Machine
) {
  const [documents, maintenance, records] =
    await Promise.all([
      listMachineDocuments(uid, machine.id),
      listMaintenance(uid),
      listRecords(uid),
    ]);

  await Promise.all([
    ...documents.map((document) =>
      removeMachineDocument(uid, document)
    ),
    ...maintenance
      .filter((record) => record.machineId === machine.id)
      .map((record) => removeMaintenance(uid, record.id)),
    ...records
      .filter((record) => record.machineId === machine.id)
      .map((record) => removeRecord(uid, record)),
  ]);

  await removeMachine(uid, machine);
}
