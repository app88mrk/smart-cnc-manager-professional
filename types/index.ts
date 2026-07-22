export type ModuleId = "dashboard" | "machines" | "manuals" | "tools" | "jobs" | "alarms" | "maintenance" | "notes" | "programs" | "materials";
export type ModuleState = "active" | "config" | "standby";
export interface ModuleDefinition { id: ModuleId; label: string; description: string; icon: string; state: ModuleState; }
export interface RecordItem { id: string; module: ModuleId; title: string; subtitle?: string; status?: string; machine?: string; notes?: string; createdAt: string; updatedAt: string; fileName?: string; [key: string]: unknown; }
