import { RecordModuleId } from "@/types";

export type RecordModuleConfig = {
  id: RecordModuleId;
  eyebrow: string;
  singular: string;
  titleLabel: string;
  subtitleLabel: string;
  notesLabel: string;
  statuses: string[];
  attachments: boolean;
  attachmentAccept?: string;
};

export const recordModuleConfigs: Record<
  RecordModuleId,
  RecordModuleConfig
> = {
  manuals: {
    id: "manuals",
    eyebrow: "DOCUMENTAZIONE TECNICA",
    singular: "manuale",
    titleLabel: "Titolo documento",
    subtitleLabel: "Tipo / revisione",
    notesLabel: "Descrizione e riferimenti",
    statuses: ["Disponibile", "Da aggiornare", "Archiviato"],
    attachments: true,
    attachmentAccept:
      ".pdf,.doc,.docx,.xls,.xlsx,.zip,image/*,video/*",
  },
  tools: {
    id: "tools",
    eyebrow: "GESTIONE UTENSILI",
    singular: "utensile",
    titleLabel: "Nome utensile",
    subtitleLabel: "Codice / diametro / attacco",
    notesLabel: "Parametri di taglio e note",
    statuses: ["Disponibile", "In uso", "Da riaffilare", "Dismesso"],
    attachments: false,
  },
  cutting: {
    id: "cutting",
    eyebrow: "PARAMETRI DI TAGLIO",
    singular: "calcolo",
    titleLabel: "Nome calcolo",
    subtitleLabel: "Risultati principali",
    notesLabel: "Parametri salvati",
    statuses: ["Salvato"],
    attachments: false,
  },
  jobs: {
    id: "jobs",
    eyebrow: "GESTIONE LAVORAZIONI",
    singular: "lavorazione",
    titleLabel: "Nome lavorazione",
    subtitleLabel: "Commessa / disegno / cliente",
    notesLabel: "Ciclo, risultato e indicazioni operative",
    statuses: ["Pianificata", "In corso", "Completata", "Sospesa"],
    attachments: false,
  },
  alarms: {
    id: "alarms",
    eyebrow: "STORICO ALLARMI",
    singular: "allarme",
    titleLabel: "Codice o titolo allarme",
    subtitleLabel: "Descrizione sintetica",
    notesLabel: "Causa, verifiche e soluzione",
    statuses: ["Aperto", "In analisi", "Risolto"],
    attachments: false,
  },
  notes: {
    id: "notes",
    eyebrow: "KNOWLEDGE BASE",
    singular: "procedura",
    titleLabel: "Titolo procedura",
    subtitleLabel: "Categoria / argomento",
    notesLabel: "Procedura, checklist e note",
    statuses: ["Bozza", "Verificata", "Archiviata"],
    attachments: false,
  },
  programs: {
    id: "programs",
    eyebrow: "ARCHIVIO PROGRAMMI CNC",
    singular: "programma",
    titleLabel: "Nome programma",
    subtitleLabel: "Revisione / particolare",
    notesLabel: "Origine, utensili e note di collaudo",
    statuses: ["Bozza", "Validato", "In produzione", "Obsoleto"],
    attachments: true,
    attachmentAccept: ".nc,.cnc,.tap,.gcode,.txt,.zip",
  },
  materials: {
    id: "materials",
    eyebrow: "ARCHIVIO MATERIALI",
    singular: "materiale",
    titleLabel: "Materiale / lega",
    subtitleLabel: "Norma / formato / dimensione",
    notesLabel: "Parametri, fornitore e note di lavorazione",
    statuses: ["Disponibile", "Da ordinare", "Esaurito"],
    attachments: false,
  },
};

export function isRecordModuleId(
  moduleId: string
): moduleId is RecordModuleId {
  return moduleId in recordModuleConfigs;
}
