import { recordModuleConfigs } from "@/lib/moduleConfigs";
import { createEmptyToolDetails } from "@/lib/tools";
import {
  Machine,
  MaintenanceRecord,
  RecordItem,
  RecordModuleId,
} from "@/types";

export function createEmptyMachine(): Machine {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    brand: "",
    model: "",
    serialNumber: "",
    year: "",
    cncControl: "",
    travelX: "",
    travelY: "",
    travelZ: "",
    spindle: "",
    toolTaper: "",
    toolMagazine: "",
    department: "",
    status: "Operativa",
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

}

export function createEmptyMaintenance(
  machineId = ""
): MaintenanceRecord {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    machineId,
    type: "Preventiva",
    status: "Pianificata",
    title: "",
    description: "",
    technician: "",
    scheduledDate: timestamp.slice(0, 10),
    completedDate: "",
    hours: "",
    cost: "",
    parts: "",
    priority: "Media",
    recurrence: "Nessuna",
    checklist: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createEmptyRecord(
  moduleId: RecordModuleId
): RecordItem {
  const timestamp = new Date().toISOString();
  const config = recordModuleConfigs[moduleId];

  const record: RecordItem = {
    id: crypto.randomUUID(),
    module: moduleId,
    title: "",
    subtitle: "",
    status: config.statuses[0],
    machineId: "",
    machine: "",
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (moduleId === "tools") {
    record.tool = createEmptyToolDetails();
  }

  return record;
}
