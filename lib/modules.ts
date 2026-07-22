import { ModuleDefinition } from "@/types";
export const modules: ModuleDefinition[] = [
  { id:"dashboard", label:"Dashboard", description:"Panoramica del reparto", icon:"⌂", state:"active" },
  { id:"machines", label:"Macchine", description:"Schede tecniche e documentazione", icon:"▦", state:"active" },
  { id:"manuals", label:"Manuali", description:"PDF, immagini, video e documenti", icon:"▤", state:"active" },
  { id:"tools", label:"Utensili", description:"Parametri, avanzamenti e materiali", icon:"⚙", state:"active" },
  { id:"jobs", label:"Lavorazioni", description:"Cicli, programmi, utensili e risultati", icon:"◫", state:"active" },
  { id:"alarms", label:"Allarmi", description:"Cause, soluzioni e storico", icon:"⚠", state:"active" },
  { id:"maintenance", label:"Manutenzioni", description:"Scadenze, ricambi e interventi", icon:"◆", state:"active" },
  { id:"notes", label:"Knowledge Base", description:"Procedure, idee e checklist", icon:"✎", state:"active" },
  { id:"programs", label:"Programmi CNC", description:"G-code e revisioni", icon:"⌘", state:"config" },
  { id:"materials", label:"Materiali", description:"Schede e parametri di taglio", icon:"⬡", state:"config" }
];
