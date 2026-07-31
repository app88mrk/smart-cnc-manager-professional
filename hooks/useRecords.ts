"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listRecords,
  removeRecord,
  removeRecords as persistRemovedRecords,
  replaceRecords as persistRecords,
  saveRecord as persistRecord,
  saveRecords as persistNewRecords,
} from "@/lib/records";
import { RecordItem } from "@/types";

type UseRecordsOptions = {
  uid: string;
  enabled: boolean;
  onError: (message: string) => void;
};

type SaveRecordInput = {
  record: RecordItem;
  attachment: File | null;
  background?: boolean;
  onUploadProgress?: (percent: number) => void;
};

export default function useRecords({
  uid,
  enabled,
  onError,
}: UseRecordsOptions) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const refreshRecords = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setRecordsLoading(true);

    try {
      setRecords(await listRecords(uid));
    } catch (error) {
      onError(errorMessage(error));
      throw error;
    } finally {
      setRecordsLoading(false);
    }
  }, [enabled, onError, uid]);

  useEffect(() => {
    refreshRecords().catch(() => {
      // L'errore viene mostrato tramite onError.
    });
  }, [refreshRecords]);

  const saveRecord = useCallback(
    async ({
      record,
      attachment,
      background = false,
      onUploadProgress,
    }: SaveRecordInput) => {
      if (!background) setRecordsLoading(true);

      try {
        await persistRecord(
          uid,
          {
            ...record,
            updatedAt: new Date().toISOString(),
          },
          attachment,
          onUploadProgress
        );
        setRecords(await listRecords(uid));
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        if (!background) setRecordsLoading(false);
      }
    },
    [onError, uid]
  );

  const deleteRecord = useCallback(
    async (record: RecordItem) => {
      setRecordsLoading(true);

      try {
        await removeRecord(uid, record);
        setRecords(await listRecords(uid));
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        setRecordsLoading(false);
      }
    },
    [onError, uid]
  );

  const deleteRecords = useCallback(
    async (recordsToDelete: RecordItem[]) => {
      setRecordsLoading(true);

      try {
        await persistRemovedRecords(uid, recordsToDelete);
        setRecords(await listRecords(uid));
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        setRecordsLoading(false);
      }
    },
    [onError, uid]
  );

  const saveRecords = useCallback(
    async (
      nextRecords: RecordItem[],
      onProgress?: (percent: number) => void
    ) => {
      setRecordsLoading(true);

      try {
        await persistNewRecords(
          uid,
          nextRecords.map((record) => ({
            ...record,
            updatedAt: new Date().toISOString(),
          })),
          onProgress
        );
        setRecords(await listRecords(uid));
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        setRecordsLoading(false);
      }
    },
    [onError, uid]
  );

  const replaceRecords = useCallback(
    async (nextRecords: RecordItem[]) => {
      setRecordsLoading(true);

      try {
        await persistRecords(uid, nextRecords);
        setRecords(await listRecords(uid));
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        setRecordsLoading(false);
      }
    },
    [onError, uid]
  );

  return {
    records,
    recordsLoading,
    refreshRecords,
    saveRecord,
    saveRecords,
    deleteRecord,
    deleteRecords,
    replaceRecords,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Si è verificato un errore.";
}
