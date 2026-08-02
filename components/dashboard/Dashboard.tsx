"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Gauge,
  History,
  PackageSearch,
  Settings2,
  Wrench,
} from "lucide-react";

import { modules } from "@/lib/modules";
import {
  isLifeExpired,
  isLowStock,
  normalizeToolDetails,
} from "@/lib/tools";
import {
  Machine,
  MaintenanceRecord,
  ModuleId,
  RecordItem,
} from "@/types";

interface DashboardProps {
  machines: Machine[];
  maintenance: MaintenanceRecord[];
  records: RecordItem[];
  go: (id: ModuleId) => void;
}

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  moduleId: ModuleId;
  updatedAt: string;
  kind: "machine" | "maintenance" | "record";
};

export default function Dashboard({
  machines,
  maintenance,
  records,
  go,
}: DashboardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tools = records.filter(
    (record) =>
      record.module === "tools" &&
      !record.notes.includes("[IMPORT_CATALOGO]")
  );
  const overdue = maintenance
    .filter(
      (record) =>
        record.status !== "Completata" &&
        Boolean(record.scheduledDate) &&
        dateValue(record.scheduledDate) < today.getTime()
    )
    .sort(
      (first, second) =>
        dateValue(first.scheduledDate) - dateValue(second.scheduledDate)
    );
  const upcoming = maintenance
    .filter((record) => {
      if (record.status === "Completata" || !record.scheduledDate) return false;
      const days = daysFromToday(record.scheduledDate, today);
      return days >= 0 && days <= 30;
    })
    .sort(
      (first, second) =>
        dateValue(first.scheduledDate) - dateValue(second.scheduledDate)
    );
  const toolAlerts = tools.filter(
    (record) => isLowStock(record) || isLifeExpired(record)
  );
  const attentionMachines = machines.filter(
    (machine) => machine.status !== "Operativa"
  );
  const activeMachines = machines.filter(
    (machine) => machine.status === "Operativa"
  ).length;
  const openMaintenance = maintenance.filter(
    (record) => record.status !== "Completata"
  ).length;
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        overdue.length * 12 -
        toolAlerts.length * 5 -
        attentionMachines.length * 8
    )
  );
  const healthTone =
    healthScore >= 85 ? "good" : healthScore >= 65 ? "warning" : "critical";
  const urgentCount =
    overdue.length + toolAlerts.length + attentionMachines.length;
  const recentActivity = buildRecentActivity(
    machines,
    maintenance,
    records
  ).slice(0, 8);
  const archiveModules: ModuleId[] = [
    "manuals",
    "jobs",
    "programs",
    "materials",
  ];

  return (
    <div className="operationsDashboard">
      <section className="dashboardHero">
        <div className="dashboardHeroCopy">
          <span className="dashboardEyebrow">
            CENTRO DI CONTROLLO · {formatLongDate(new Date())}
          </span>
          <h1>Il reparto, finalmente leggibile</h1>
          <p>
            Priorità, scadenze, utensili e dati tecnici sono riuniti in una
            vista operativa. Parti da ciò che richiede attenzione oggi.
          </p>

          <div className="dashboardHeroActions">
            <button type="button" className="primary" onClick={() => go("maintenance")}>
              <Wrench size={17} />
              Gestisci manutenzioni
            </button>
            <button type="button" onClick={() => go("cutting")}>
              <Settings2 size={17} />
              Calcola parametri
            </button>
          </div>
        </div>

        <div className={`healthScore ${healthTone}`}>
          <div
            className="healthScoreRing"
            style={{
              background: `conic-gradient(var(--health-color) ${healthScore * 3.6}deg, #dfe8ef 0deg)`,
            }}
          >
            <span>
              <b>{healthScore}</b>
              <small>/ 100</small>
            </span>
          </div>
          <div>
            <span>INDICE OPERATIVO</span>
            <b>{healthLabel(healthScore)}</b>
            <small>
              {urgentCount
                ? `${urgentCount} priorità da verificare`
                : "Nessuna criticità rilevata"}
            </small>
          </div>
        </div>
      </section>

      <section className="dashboardKpis" aria-label="Indicatori operativi">
        <DashboardKpi
          icon={<Gauge size={20} />}
          label="Macchine operative"
          value={`${activeMachines}/${machines.length}`}
          detail={machines.length ? `${Math.round((activeMachines / machines.length) * 100)}% disponibili` : "Inserisci la prima macchina"}
          tone="blue"
          onClick={() => go("machines")}
        />
        <DashboardKpi
          icon={<CalendarClock size={20} />}
          label="Manutenzioni aperte"
          value={openMaintenance}
          detail={overdue.length ? `${overdue.length} oltre la scadenza` : "Nessuna scadenza superata"}
          tone={overdue.length ? "red" : "green"}
          onClick={() => go("maintenance")}
        />
        <DashboardKpi
          icon={<PackageSearch size={20} />}
          label="Utensili da verificare"
          value={toolAlerts.length}
          detail={`${tools.length} utensili registrati`}
          tone={toolAlerts.length ? "orange" : "green"}
          onClick={() => go("tools")}
        />
        <DashboardKpi
          icon={<BookOpen size={20} />}
          label="Archivio tecnico"
          value={records.filter((record) => !record.notes.includes("[IMPORT_CATALOGO]")).length}
          detail="Schede e calcoli disponibili"
          tone="violet"
          onClick={() => go("manuals")}
        />
      </section>

      <section className="dashboardActionPanel">
        <div className="dashboardSectionHead">
          <div>
            <span>PRIORITÀ OPERATIVE</span>
            <h2>Cosa richiede attenzione</h2>
          </div>
          <b className={urgentCount ? "hasAlerts" : ""}>{urgentCount}</b>
        </div>

        <div className="dashboardPriorityGrid">
          <PriorityCard
            title="Manutenzioni scadute"
            icon={<CalendarClock size={19} />}
            count={overdue.length}
            tone="danger"
            empty="Tutte le manutenzioni sono nei tempi."
            actionLabel="Apri manutenzioni"
            onOpen={() => go("maintenance")}
          >
            {overdue.slice(0, 3).map((record) => (
              <PriorityRow
                key={record.id}
                title={record.title}
                detail={`${machineName(record.machineId, machines)} · ${formatShortDate(record.scheduledDate)}`}
                badge={`${Math.abs(daysFromToday(record.scheduledDate, today))}g ritardo`}
              />
            ))}
          </PriorityCard>

          <PriorityCard
            title="Utensili critici"
            icon={<PackageSearch size={19} />}
            count={toolAlerts.length}
            tone="warning"
            empty="Scorte e vita utensili sono regolari."
            actionLabel="Apri utensili"
            onOpen={() => go("tools")}
          >
            {toolAlerts.slice(0, 3).map((record) => {
              const tool = normalizeToolDetails(record);
              return (
                <PriorityRow
                  key={record.id}
                  title={tool.code || record.title}
                  detail={record.title}
                  badge={isLifeExpired(record) ? "Vita esaurita" : "Scorta bassa"}
                />
              );
            })}
          </PriorityCard>

          <PriorityCard
            title="Macchine non operative"
            icon={<AlertTriangle size={19} />}
            count={attentionMachines.length}
            tone="machine"
            empty="Tutte le macchine risultano operative."
            actionLabel="Apri macchine"
            onOpen={() => go("machines")}
          >
            {attentionMachines.slice(0, 3).map((machine) => (
              <PriorityRow
                key={machine.id}
                title={`${machine.brand} ${machine.model}`.trim()}
                detail={machine.department || machine.serialNumber || "Reparto non indicato"}
                badge={machine.status}
              />
            ))}
          </PriorityCard>
        </div>
      </section>

      <section className="dashboardLowerGrid">
        <div className="dashboardTimeline panel">
          <div className="dashboardSectionHead compact">
            <div>
              <span>PROSSIMI 30 GIORNI</span>
              <h2>Agenda manutenzioni</h2>
            </div>
            <button type="button" onClick={() => go("maintenance")}>Vedi tutto</button>
          </div>

          {upcoming.length ? (
            <div className="dashboardTimelineList">
              {upcoming.slice(0, 6).map((record) => {
                const days = daysFromToday(record.scheduledDate, today);
                return (
                  <button key={record.id} type="button" onClick={() => go("maintenance")}>
                    <span className="timelineDate">
                      <b>{new Date(`${record.scheduledDate}T00:00:00`).getDate()}</b>
                      <small>{monthShort(record.scheduledDate)}</small>
                    </span>
                    <span>
                      <b>{record.title}</b>
                      <small>{machineName(record.machineId, machines)}</small>
                    </span>
                    <em>{days === 0 ? "Oggi" : `tra ${days}g`}</em>
                  </button>
                );
              })}
            </div>
          ) : (
            <DashboardEmpty
              icon={<CheckCircle2 size={23} />}
              title="Agenda libera"
              detail="Nessuna manutenzione pianificata nei prossimi 30 giorni."
            />
          )}
        </div>

        <div className="dashboardActivity panel">
          <div className="dashboardSectionHead compact">
            <div>
              <span>TRACCIABILITÀ</span>
              <h2>Attività recente</h2>
            </div>
            <History size={18} />
          </div>

          {recentActivity.length ? (
            <div className="dashboardActivityList">
              {recentActivity.map((item) => (
                <button key={`${item.kind}-${item.id}`} type="button" onClick={() => go(item.moduleId)}>
                  <span className={`activityDot ${item.kind}`} />
                  <span>
                    <b>{item.title}</b>
                    <small>{item.detail}</small>
                  </span>
                  <time>{relativeDate(item.updatedAt)}</time>
                </button>
              ))}
            </div>
          ) : (
            <DashboardEmpty
              icon={<History size={23} />}
              title="Nessuna attività"
              detail="Le ultime modifiche appariranno qui."
            />
          )}
        </div>
      </section>

      <section className="dashboardArchive panel">
        <div className="dashboardSectionHead compact">
          <div>
            <span>ARCHIVI CONNESSI</span>
            <h2>Accesso rapido ai dati tecnici</h2>
          </div>
        </div>
        <div className="dashboardArchiveGrid">
          {archiveModules.map((moduleId) => {
            const definition = modules.find((module) => module.id === moduleId);
            const count = records.filter((record) => record.module === moduleId).length;
            return (
              <button key={moduleId} type="button" onClick={() => go(moduleId)}>
                <span>{definition?.icon}</span>
                <span>
                  <b>{definition?.label}</b>
                  <small>{definition?.description}</small>
                </span>
                <strong>{count}</strong>
                <ArrowRight size={16} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DashboardKpi({
  icon,
  label,
  value,
  detail,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone: "blue" | "green" | "orange" | "red" | "violet";
  onClick: () => void;
}) {
  return (
    <button type="button" className={`dashboardKpi ${tone}`} onClick={onClick}>
      <span className="dashboardKpiIcon">{icon}</span>
      <span>
        <small>{label}</small>
        <b>{value}</b>
        <em>{detail}</em>
      </span>
      <ArrowRight size={16} />
    </button>
  );
}

function PriorityCard({
  title,
  icon,
  count,
  tone,
  empty,
  actionLabel,
  onOpen,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  tone: "danger" | "warning" | "machine";
  empty: string;
  actionLabel: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <article className={`dashboardPriorityCard ${tone}`}>
      <div className="priorityCardHead">
        <span>{icon}</span>
        <div>
          <b>{title}</b>
          <small>{count ? `${count} da controllare` : "Tutto regolare"}</small>
        </div>
        <strong>{count}</strong>
      </div>
      <div className="priorityCardRows">
        {count ? children : (
          <div className="priorityCardEmpty">
            <CheckCircle2 size={17} />
            {empty}
          </div>
        )}
      </div>
      <button type="button" className="priorityCardAction" onClick={onOpen}>
        {actionLabel}
        <ArrowRight size={15} />
      </button>
    </article>
  );
}

function PriorityRow({
  title,
  detail,
  badge,
}: {
  title: string;
  detail: string;
  badge: string;
}) {
  return (
    <div className="priorityRow">
      <span>
        <b>{title}</b>
        <small>{detail}</small>
      </span>
      <em>{badge}</em>
    </div>
  );
}

function DashboardEmpty({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="dashboardEmptyState">
      {icon}
      <b>{title}</b>
      <span>{detail}</span>
    </div>
  );
}

function buildRecentActivity(
  machines: Machine[],
  maintenance: MaintenanceRecord[],
  records: RecordItem[]
) {
  const items: ActivityItem[] = [
    ...machines.map((machine) => ({
      id: machine.id,
      title: `${machine.brand} ${machine.model}`.trim(),
      detail: `Macchina · ${machine.status}`,
      moduleId: "machines" as const,
      updatedAt: machine.updatedAt,
      kind: "machine" as const,
    })),
    ...maintenance.map((record) => ({
      id: record.id,
      title: record.title,
      detail: `Manutenzione · ${record.status}`,
      moduleId: "maintenance" as const,
      updatedAt: record.updatedAt,
      kind: "maintenance" as const,
    })),
    ...records
      .filter((record) => !record.notes.includes("[IMPORT_CATALOGO]"))
      .map((record) => ({
        id: record.id,
        title: record.title,
        detail: `${moduleLabel(record.module)} · ${record.status}`,
        moduleId: record.module as ModuleId,
        updatedAt: record.updatedAt,
        kind: "record" as const,
      })),
  ];

  return items.sort(
    (first, second) => dateValue(second.updatedAt) - dateValue(first.updatedAt)
  );
}

function moduleLabel(moduleId: ModuleId) {
  return modules.find((module) => module.id === moduleId)?.label || moduleId;
}

function machineName(machineId: string, machines: Machine[]) {
  const machine = machines.find((item) => item.id === machineId);
  return machine
    ? `${machine.brand} ${machine.model}`.trim()
    : "Macchina non collegata";
}

function healthLabel(score: number) {
  if (score >= 85) return "Reparto sotto controllo";
  if (score >= 65) return "Attenzione consigliata";
  return "Intervento prioritario";
}

function dateValue(value: string) {
  if (!value) return 0;
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysFromToday(value: string, today: Date) {
  return Math.round((dateValue(value) - today.getTime()) / 86_400_000);
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
}

function formatShortDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

function monthShort(value: string) {
  return new Intl.DateTimeFormat("it-IT", { month: "short" })
    .format(new Date(`${value}T00:00:00`))
    .replace(".", "");
}

function relativeDate(value: string) {
  const timestamp = dateValue(value);
  if (!timestamp) return "—";
  const difference = Date.now() - timestamp;
  const days = Math.floor(difference / 86_400_000);
  if (days <= 0) return "Oggi";
  if (days === 1) return "Ieri";
  if (days < 30) return `${days}g fa`;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(new Date(timestamp));
}
