"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FileText,
  Gauge,
  Search,
  Settings2,
  Wrench,
  X,
} from "lucide-react";

import { modules } from "@/lib/modules";
import {
  Machine,
  MaintenanceRecord,
  ModuleId,
  RecordItem,
} from "@/types";

type SearchItem =
  | {
      id: string;
      kind: "module";
      title: string;
      detail: string;
      moduleId: ModuleId;
      updatedAt: string;
    }
  | {
      id: string;
      kind: "machine";
      title: string;
      detail: string;
      moduleId: "machines";
      machine: Machine;
      updatedAt: string;
    }
  | {
      id: string;
      kind: "maintenance";
      title: string;
      detail: string;
      moduleId: "maintenance";
      maintenance: MaintenanceRecord;
      updatedAt: string;
    }
  | {
      id: string;
      kind: "record";
      title: string;
      detail: string;
      moduleId: ModuleId;
      record: RecordItem;
      updatedAt: string;
    };

type Props = {
  query: string;
  machines: Machine[];
  maintenance: MaintenanceRecord[];
  records: RecordItem[];
  setQuery: (value: string) => void;
  close: () => void;
  openModule: (moduleId: ModuleId) => void;
  openMachine: (machine: Machine) => void;
  openMaintenance: (record: MaintenanceRecord) => void;
  openRecord: (record: RecordItem) => void;
};

export default function CommandPalette({
  query,
  machines,
  maintenance,
  records,
  setQuery,
  close,
  openModule,
  openMachine,
  openMaintenance,
  openRecord,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const items = useMemo(
    () => buildSearchItems(query, machines, maintenance, records),
    [machines, maintenance, query, records]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function selectItem(item: SearchItem) {
    if (item.kind === "module") {
      openModule(item.moduleId);
    } else if (item.kind === "machine") {
      openMachine(item.machine);
    } else if (item.kind === "maintenance") {
      openMaintenance(item.maintenance);
    } else {
      openRecord(item.record);
    }
    close();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        items.length ? (current + 1) % items.length : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        items.length ? (current - 1 + items.length) % items.length : 0
      );
    } else if (event.key === "Enter" && items[activeIndex]) {
      event.preventDefault();
      selectItem(items[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <div className="commandOverlay" onMouseDown={close}>
      <section
        className="commandPalette"
        role="dialog"
        aria-modal="true"
        aria-label="Ricerca globale"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="commandSearchBox">
          <Search size={20} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cerca macchina, utensile, manuale, intervento…"
            aria-label="Cerca in tutta l'app"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Azzera ricerca"
            >
              <X size={17} />
            </button>
          )}
          <kbd>ESC</kbd>
        </div>

        <div className="commandContext">
          <span>
            {query.trim()
              ? `${items.length} risultati in tutta l’app`
              : "Accesso rapido e attività recenti"}
          </span>
          <small>↑↓ naviga · Invio apre</small>
        </div>

        <div className="commandResults" role="listbox">
          {items.length ? (
            items.map((item, index) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                className={index === activeIndex ? "active" : ""}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectItem(item)}
                role="option"
                aria-selected={index === activeIndex}
              >
                <span className={`commandResultIcon ${item.kind}`}>
                  <ResultIcon kind={item.kind} />
                </span>
                <span className="commandResultText">
                  <b>{item.title}</b>
                  <small>{item.detail}</small>
                </span>
                <span className="commandResultModule">
                  {moduleLabel(item.moduleId)}
                </span>
                <ChevronRight size={17} />
              </button>
            ))
          ) : (
            <div className="commandEmpty">
              <Search size={28} />
              <b>Nessun risultato</b>
              <span>Prova con codice articolo, marca, modello o titolo.</span>
            </div>
          )}
        </div>

        <footer className="commandFooter">
          <span>Smart CNC Search</span>
          <small>I risultati provengono dai tuoi archivi Firebase.</small>
        </footer>
      </section>
    </div>
  );
}

function ResultIcon({ kind }: { kind: SearchItem["kind"] }) {
  if (kind === "machine") return <Gauge size={18} />;
  if (kind === "maintenance") return <Wrench size={18} />;
  if (kind === "record") return <FileText size={18} />;
  return <Settings2 size={18} />;
}

function buildSearchItems(
  query: string,
  machines: Machine[],
  maintenance: MaintenanceRecord[],
  records: RecordItem[]
) {
  const normalizedQuery = normalize(query);
  const moduleItems: SearchItem[] = modules.map((module) => ({
    id: module.id,
    kind: "module",
    title: module.label,
    detail: module.description,
    moduleId: module.id,
    updatedAt: "",
  }));
  const machineItems: SearchItem[] = machines.map((machine) => ({
    id: machine.id,
    kind: "machine",
    title: `${machine.brand} ${machine.model}`.trim() || "Macchina senza nome",
    detail: [machine.status, machine.serialNumber, machine.department]
      .filter(Boolean)
      .join(" · "),
    moduleId: "machines",
    machine,
    updatedAt: machine.updatedAt,
  }));
  const maintenanceItems: SearchItem[] = maintenance.map((record) => ({
    id: record.id,
    kind: "maintenance",
    title: record.title,
    detail: [record.status, record.type, record.scheduledDate]
      .filter(Boolean)
      .join(" · "),
    moduleId: "maintenance",
    maintenance: record,
    updatedAt: record.updatedAt,
  }));
  const recordItems: SearchItem[] = records
    .filter((record) => !record.notes.includes("[IMPORT_CATALOGO]"))
    .map((record) => ({
      id: record.id,
      kind: "record",
      title: record.title,
      detail: [record.subtitle, record.machine, record.status]
        .filter(Boolean)
        .join(" · "),
      moduleId: record.module,
      record,
      updatedAt: record.updatedAt,
    }));
  const allItems = [
    ...moduleItems,
    ...machineItems,
    ...maintenanceItems,
    ...recordItems,
  ];

  if (!normalizedQuery) {
    const recent = [...machineItems, ...maintenanceItems, ...recordItems]
      .sort(
        (first, second) =>
          dateValue(second.updatedAt) - dateValue(first.updatedAt)
      )
      .slice(0, 6);
    return [...moduleItems.slice(0, 5), ...recent].slice(0, 11);
  }

  return allItems
    .map((item) => ({ item, score: matchScore(item, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 16)
    .map((entry) => entry.item);
}

function matchScore(item: SearchItem, query: string) {
  const title = normalize(item.title);
  const detail = normalize(item.detail);
  const module = normalize(moduleLabel(item.moduleId));

  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 60;
  if (detail.includes(query)) return 35;
  if (module.includes(query)) return 20;
  return 0;
}

function moduleLabel(moduleId: ModuleId) {
  return modules.find((module) => module.id === moduleId)?.label || moduleId;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function dateValue(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
