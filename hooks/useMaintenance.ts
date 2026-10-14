"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listMaintenance,
  removeMaintenance,
  saveMaintenance as persistMaintenance,
} from "@/lib/maintenance";
import { MaintenanceRecord } from "@/types";

type UseMaintenanceOptions = {
  uid: string;
  enabled: boolean;
  onError: (message: string) => void;
};

export default function useMaintenance({
  uid,
  enabled,
  onError,
}: UseMaintenanceOptions) {
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const refreshMaintenance = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setMaintenanceLoading(true);

    try {
      const rows = await listMaintenance(uid);
      setMaintenance(rows);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setMaintenanceLoading(false);
    }
  }, [enabled, onError, uid]);

  useEffect(() => {
    refreshMaintenance();
  }, [refreshMaintenance]);

  const saveMaintenance = useCallback(
    async (record: MaintenanceRecord) => {
      setMaintenanceLoading(true);

      try {
        await persistMaintenance(uid, {
          ...record,
          updatedAt: new Date().toISOString(),
        });

        await refreshMaintenance();
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        setMaintenanceLoading(false);
      }
    },
    [onError, refreshMaintenance, uid]
  );

  const deleteMaintenance = useCallback(
    async (record: MaintenanceRecord) => {
      setMaintenanceLoading(true);

      try {
        await removeMaintenance(uid, record.id);
        await refreshMaintenance();
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        setMaintenanceLoading(false);
      }
    },
    [onError, refreshMaintenance, uid]
  );

  return {
    maintenance,
    maintenanceLoading,
    refreshMaintenance,
    saveMaintenance,
    deleteMaintenance,
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Si è verificato un errore.";
}
