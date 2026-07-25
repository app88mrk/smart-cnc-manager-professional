"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listMachines,
  removeMachine,
  saveMachine as persistMachine,
} from "@/lib/machines";
import { Machine } from "@/types";

type UseMachinesOptions = {
  uid: string;
  enabled: boolean;
  onError: (message: string) => void;
};

type SaveMachineInput = {
  machine: Machine;
  photo: File | null;
};

export default function useMachines({
  uid,
  enabled,
  onError,
}: UseMachinesOptions) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);

  const refreshMachines = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setMachinesLoading(true);

    try {
      const rows = await listMachines(uid);
      setMachines(rows);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setMachinesLoading(false);
    }
  }, [enabled, onError, uid]);

  useEffect(() => {
    refreshMachines();
  }, [refreshMachines]);

  const saveMachine = useCallback(
    async ({ machine, photo }: SaveMachineInput) => {
      setMachinesLoading(true);

      try {
        await persistMachine(
          uid,
          {
            ...machine,
            updatedAt: new Date().toISOString(),
          },
          photo
        );

        await refreshMachines();
      } catch (error) {
        const message = errorMessage(error);
        onError(message);
        throw error;
      } finally {
        setMachinesLoading(false);
      }
    },
    [onError, refreshMachines, uid]
  );

  const deleteMachine = useCallback(
    async (machine: Machine) => {
      setMachinesLoading(true);

      try {
        await removeMachine(uid, machine);
        await refreshMachines();
      } catch (error) {
        const message = errorMessage(error);
        onError(message);
        throw error;
      } finally {
        setMachinesLoading(false);
      }
    },
    [onError, refreshMachines, uid]
  );

  return {
    machines,
    machinesLoading,
    refreshMachines,
    saveMachine,
    deleteMachine,
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Si è verificato un errore.";
}
