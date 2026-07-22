export type ModuleId = "dashboard" | "machines" | "manuals" | "tools" | "jobs" | "alarms" | "maintenance" | "notes" | "programs" | "materials";
export type ModuleState = "active" | "config" | "standby";
export interface ModuleDefinition { id: ModuleId; label: string; description: string; icon: string; state: ModuleState; }
export interface RecordItem { id: string; module: ModuleId; title: string; subtitle?: string; status?: string; machine?: string; notes?: string; createdAt: string; updatedAt: string; fileName?: string; [key: string]: unknown; }

export interface Machine {
  id: string;
  brand: string;
  model: string;
  serialNumber: string;
  year: string;
  cncControl: string;
  travelX: string;
  travelY: string;
  travelZ: string;
  spindle: string;
  toolTaper: string;
  toolMagazine: string;
  department: string;
  status: string;
  notes: string;
  photoUrl?: string;
  photoPath?: string;
  createdAt: string;
  updatedAt: string;
}


export interface MachineDocument {
  id: string;
  machineId: string;
  name: string;
  contentType: string;
  size: number;
  storagePath: string;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceType = "Preventiva" | "Correttiva" | "Guasto" | "Ispezione";
export type MaintenanceStatus = "Pianificata" | "In corso" | "Completata";
export interface MaintenanceRecord {
  id: string;
  machineId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  title: string;
  description: string;
  technician: string;
  scheduledDate: string;
  completedDate: string;
  hours: string;
  cost: string;
  parts: string;
  createdAt: string;
  updatedAt: string;
}
