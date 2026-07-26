"use client";

import { useCallback, useState } from "react";

import {
  Machine,
  MaintenanceRecord,
  ModuleId,
  RecordItem,
} from "@/types";

export default function useWorkspace() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [queryText, setQueryText] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingMachine, setEditingMachine] =
    useState<Machine | null>(null);
  const [machineDetail, setMachineDetail] =
    useState<Machine | null>(null);
  const [editingMaintenance, setEditingMaintenance] =
    useState<MaintenanceRecord | null>(null);
  const [editingRecord, setEditingRecord] =
    useState<RecordItem | null>(null);

  const openModule = useCallback((moduleId: ModuleId) => {
    setActive(moduleId);
    setMobileOpen(false);
    setQueryText("");
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((current) => !current);
  }, []);

  const closeAllEditors = useCallback(() => {
    setEditingMachine(null);
    setMachineDetail(null);
    setEditingMaintenance(null);
    setEditingRecord(null);
  }, []);

  return {
    active,
    queryText,
    mobileOpen,
    editingMachine,
    machineDetail,
    editingMaintenance,
    editingRecord,
    setQueryText,
    openModule,
    toggleMobile,
    setEditingMachine,
    setMachineDetail,
    setEditingMaintenance,
    setEditingRecord,
    closeAllEditors,
  };
}
