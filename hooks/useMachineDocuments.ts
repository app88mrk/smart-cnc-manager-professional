"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listMachineDocuments,
  removeMachineDocument,
  uploadMachineDocument,
} from "@/lib/documents";
import { MachineDocument } from "@/types";

type UseMachineDocumentsOptions = {
  uid: string;
  machineId: string;
  onError: (message: string) => void;
};

export default function useMachineDocuments({
  uid,
  machineId,
  onError,
}: UseMachineDocumentsOptions) {
  const [documents, setDocuments] = useState<MachineDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsBusy, setDocumentsBusy] = useState(false);

  const loadDocuments = useCallback(async () => {
    const rows = await listMachineDocuments(uid, machineId);
    setDocuments(rows);
  }, [machineId, uid]);

  const refreshDocuments = useCallback(async () => {
    setDocumentsLoading(true);

    try {
      await loadDocuments();
    } catch (error) {
      onError(errorMessage(error));
      throw error;
    } finally {
      setDocumentsLoading(false);
    }
  }, [loadDocuments, onError]);

  useEffect(() => {
    refreshDocuments().catch(() => {
      // L'errore viene mostrato tramite onError.
    });
  }, [refreshDocuments]);

  const uploadDocuments = useCallback(
    async (files: File[]) => {
      if (!files.length) {
        return;
      }

      setDocumentsBusy(true);

      try {
        for (const file of files) {
          await uploadMachineDocument(uid, machineId, file);
        }

        await loadDocuments();
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        setDocumentsBusy(false);
      }
    },
    [loadDocuments, machineId, onError, uid]
  );

  const deleteDocument = useCallback(
    async (document: MachineDocument) => {
      setDocumentsBusy(true);

      try {
        await removeMachineDocument(uid, document);
        await loadDocuments();
      } catch (error) {
        onError(errorMessage(error));
        throw error;
      } finally {
        setDocumentsBusy(false);
      }
    },
    [loadDocuments, onError, uid]
  );

  return {
    documents,
    documentsLoading,
    documentsBusy,
    refreshDocuments,
    uploadDocuments,
    deleteDocument,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Si è verificato un errore.";
}
