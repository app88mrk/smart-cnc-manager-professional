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
export interface JobSheetOperation {
  id: string;
  sequence: number;
  name: string;
  description: string;
  toolId: string;
  programId: string;
  calculationId: string;
  estimatedMinutes: string;
  actualMinutes: string;
  completed: boolean;
}
export type JobQualityResult = "Da controllare" | "Conforme" | "Non conforme";
export interface JobQualityCheck {
  id: string;
  characteristic: string;
  nominal: string;
  tolerance: string;
  measured: string;
  instrument: string;
  result: JobQualityResult;
}
export interface JobSheetDetails {
  version: 1;
  orderCode: string;
  customer: string;
  drawingCode: string;
  drawingRevision: string;
  partName: string;
  materialId: string;
  rawMaterial: string;
  quantity: string;
  dueDate: string;
  clamping: string;
  fixture: string;
  workOffset: string;
  setupNotes: string;
  estimatedSetupMinutes: string;
  actualSetupMinutes: string;
  operations: JobSheetOperation[];
  qualityChecks: JobQualityCheck[];
  operator: string;
  producedQuantity: string;
  scrapQuantity: string;
  outcome: string;
  startedAt: string;
  completedAt: string;
  finalNotes: string;
  approved: boolean;
  accountedToolMinutes: Record<string, number>;
}
export type ManualCategory =
  | "catalog"
  | "machine"
  | "procedure"
  | "drawing"
  | "maintenance"
  | "quality"
  | "safety"
  | "other";
export type ManualConfidentiality = "Uso interno" | "Riservato" | "Pubblico";
export interface ManualDetails {
  version: 1;
  category: ManualCategory;
  documentCode: string;
  manufacturer: string;
  revision: string;
  issueDate: string;
  reviewDate: string;
  language: string;
  owner: string;
  confidentiality: ManualConfidentiality;
  tags: string[];
  openCount: number;
  lastOpenedAt: string;
}
export interface ProgramRevision {
  id: string;
  version: string;
  createdAt: string;
  changeNote: string;
  status: string;
  checksum: string;
  lineCount: number;
  toolNumbers: string[];
  workOffsets: string[];
  fileName: string;
  fileUrl: string;
  filePath: string;
  fileType: string;
  fileSize: number;
}
export interface ProgramDetails {
  version: 1;
  programCode: string;
  partName: string;
  drawingCode: string;
  drawingRevision: string;
  controller: string;
  currentVersion: string;
  checksum: string;
  lineCount: number;
  toolNumbers: string[];
  workOffsets: string[];
  lastValidatedAt: string;
  approvedBy: string;
  approved: boolean;
  changeNote: string;
  revisions: ProgramRevision[];
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
  jobSheet?: JobSheetDetails;
  manual?: ManualDetails;
  program?: ProgramDetails;
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
export type MaintenancePriority = "Bassa" | "Media" | "Alta" | "Critica";
export type MaintenanceRecurrence = "Nessuna" | "Settimanale" | "Mensile" | "Trimestrale" | "Semestrale" | "Annuale";
export interface MaintenanceChecklistItem {
  id: string;
  label: string;
  done: boolean;
}
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
  priority?: MaintenancePriority;
  recurrence?: MaintenanceRecurrence;
  checklist?: MaintenanceChecklistItem[];
  nextMaintenanceId?: string;
  recurrenceSourceId?: string;
  createdAt: string;
  updatedAt: string;
}
