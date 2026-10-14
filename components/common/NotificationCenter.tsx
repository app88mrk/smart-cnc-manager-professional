"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  PackageX,
  Wrench,
  X,
} from "lucide-react";

import { getToolAlert, remainingToolHours } from "@/lib/tools";
import { Machine, MaintenanceRecord, RecordItem } from "@/types";

type NotificationCenterProps = {
  maintenance: MaintenanceRecord[];
  records: RecordItem[];
  machines: Machine[];
  openMaintenance: (record: MaintenanceRecord) => void;
  openTools: () => void;
};

type AppNotification = {
  id: string;
  tone: "critical" | "warning";
  title: string;
  detail: string;
  icon: React.ReactNode;
  action: () => void;
};

export default function NotificationCenter({
  maintenance,
  records,
  machines,
  openMaintenance,
  openTools,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const notifications = useMemo<AppNotification[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSevenDays = new Date(today);
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    const maintenanceAlerts = maintenance.flatMap((record) => {
      if (record.status === "Completata") return [];
      const date = new Date(`${record.scheduledDate}T12:00:00`);
      if (date > inSevenDays) return [];
      const overdue = date < today;
      const machine = machines.find((item) => item.id === record.machineId);
      return [{
        id: `maintenance-${record.id}`,
        tone: overdue ? "critical" as const : "warning" as const,
        title: overdue ? `Manutenzione scaduta: ${record.title}` : `Manutenzione vicina: ${record.title}`,
        detail: `${machine ? `${machine.brand} ${machine.model}` : "Macchina"} · ${formatDate(record.scheduledDate)}`,
        icon: overdue ? <AlertTriangle /> : <CalendarClock />,
        action: () => openMaintenance(record),
      }];
    });
    const toolAlerts = records.flatMap((record) => {
      if (
        record.module !== "tools" ||
        record.notes.includes("[IMPORT_CATALOGO]")
      ) return [];
      const alert = getToolAlert(record);
      if (alert === "ok") return [];
      const remaining = remainingToolHours(record);
      return [{
        id: `tool-${record.id}`,
        tone: alert === "critical" ? "critical" as const : "warning" as const,
        title: alert === "critical" ? `Utensile non disponibile: ${record.title}` : `Utensile da controllare: ${record.title}`,
        detail: remaining === null ? record.subtitle || "Verifica scorta e stato" : `${Math.max(0, remaining).toLocaleString("it-IT", { maximumFractionDigits: 1 })} h residue`,
        icon: alert === "critical" ? <PackageX /> : <Wrench />,
        action: openTools,
      }];
    });
    return [...maintenanceAlerts, ...toolAlerts].sort((a, b) =>
      a.tone === b.tone ? 0 : a.tone === "critical" ? -1 : 1
    );
  }, [machines, maintenance, openMaintenance, openTools, records]);

  return (
    <div className="notificationCenter">
      <button
        type="button"
        className={`notificationBell ${notifications.length ? "hasAlerts" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={`${notifications.length} notifiche operative`}
        title="Notifiche operative"
      >
        <Bell size={18} />
        {notifications.length > 0 && <b>{Math.min(99, notifications.length)}</b>}
      </button>

      {open && (
        <div className="notificationPanel">
          <header>
            <div>
              <span>Centro avvisi</span>
              <h3>Notifiche operative</h3>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Chiudi notifiche">
              <X size={18} />
            </button>
          </header>

          <div className="notificationList">
            {notifications.length ? (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={notification.tone}
                  onClick={() => {
                    notification.action();
                    setOpen(false);
                  }}
                >
                  <span>{notification.icon}</span>
                  <div>
                    <b>{notification.title}</b>
                    <small>{notification.detail}</small>
                  </div>
                </button>
              ))
            ) : (
              <div className="notificationEmpty">
                <CheckCircle2 size={28} />
                <b>Nessun avviso aperto</b>
                <span>Manutenzioni e utensili sono sotto controllo.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}
