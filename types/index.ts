export type ModuleId =
  | "dashboard"
  | "machines"
  | "manuals"
  | "tools"
  | "cutting"
  | "jobs"
  | "alarms"
  | "maintenance"
  | "notes"
  | "programs"
  | "materials";
export type RecordModuleId =
  | "manuals"
  | "tools"
  | "cutting"
  | "jobs"
  | "alarms"
  | "notes"
  | "programs"
  | "materials";
export type ModuleState = "active" | "config" | "standby";
export interface ModuleDefinition { id: ModuleId; label: string; description: string; icon: string; state: ModuleState; }
export type ToolCategory =
  | "Fresa"
  | "Punta"
  | "Maschio"
  | "Bareno"
  | "Tornitura"
  | "Inserto"
  | "Portautensile"
  | "Altro";
export interface ToolDetails {
  code: string;
  category: ToolCategory;
  manufacturer: string;
  material: string;
  coating: string;
  diameter: string;
  cuttingLength: string;
  totalLength: string;
  fluteCount: string;
  holder: string;
  location: string;
  supplier: string;
  unitCost: string;
  quantity: string;
  minStock: string;
  lifeHours: string;
  usedHours: string;
  lastUsedAt: string;
}
export interface RecordItem {
  id: string;
  module: RecordModuleId;
  title: string;
  subtitle: string;
  status: string;
  machineId: string;
  machine: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  fileUrl?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  tool?: ToolDetails;
}

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
