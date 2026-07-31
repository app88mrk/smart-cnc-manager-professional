import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import { RecordItem } from "@/types";

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const localKey = (uid: string) => `smart-cnc-records-${uid}`;

function readLocal(uid: string): RecordItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(
      localStorage.getItem(localKey(uid)) || "[]"
    ) as RecordItem[];
  } catch {
    return [];
  }
}

function writeLocal(uid: string, records: RecordItem[]) {
  localStorage.setItem(localKey(uid), JSON.stringify(records));
}

export async function listRecords(uid: string): Promise<RecordItem[]> {
  if (!db) {
    return readLocal(uid);
  }

  const snapshot = await getDocs(
    query(
      collection(db, "users", uid, "records"),
      orderBy("updatedAt", "desc")
    )
  );

  return snapshot.docs.map(
    (item) => ({ id: item.id, ...item.data() }) as RecordItem
  );
}

export async function saveRecord(
  uid: string,
  record: RecordItem,
  attachment?: File | null,
  onUploadProgress?: (percent: number) => void
): Promise<RecordItem> {
  let saved = { ...record };

  if (attachment) {
    if (!storage) {
      throw new Error(
        "Configura Firebase per caricare e conservare gli allegati."
      );
    }

    if (!attachment.size) {
      throw new Error("Il file selezionato è vuoto.");
    }

    if (attachment.size > MAX_FILE_SIZE) {
      throw new Error("Il file supera il limite di 500 MB.");
    }

    if (saved.filePath) {
      try {
        await deleteObject(ref(storage, saved.filePath));
      } catch {
        // Il vecchio file potrebbe essere già stato rimosso.
      }
    }

    const safeName = attachment.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    );
    const filePath =
      `users/${uid}/records/${saved.id}/` +
      `${Date.now()}-${safeName}`;
    const fileReference = ref(storage, filePath);

    const uploadTask = uploadBytesResumable(fileReference, attachment, {
      contentType:
        attachment.type || "application/octet-stream",
    });

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = snapshot.totalBytes
            ? Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              )
            : 0;
          onUploadProgress?.(percent);
        },
        reject,
        resolve
      );
    });
    onUploadProgress?.(100);

    saved = {
      ...saved,
      fileName: attachment.name,
      fileUrl: await getDownloadURL(fileReference),
      filePath,
      fileType:
        attachment.type || "application/octet-stream",
      fileSize: attachment.size,
    };
  }

  if (db) {
    await setDoc(
      doc(db, "users", uid, "records", saved.id),
      saved
    );
  } else {
    const records = readLocal(uid);
    const index = records.findIndex(
      (item) => item.id === saved.id
    );

    if (index >= 0) {
      records[index] = saved;
    } else {
      records.unshift(saved);
    }

    writeLocal(uid, records);
  }

  return saved;
}

export async function saveRecords(
  uid: string,
  incomingRecords: RecordItem[],
  onProgress?: (percent: number) => void
): Promise<void> {
  if (!incomingRecords.length) {
    onProgress?.(100);
    return;
  }

  onProgress?.(0);

  if (!db) {
    const byId = new Map(
      readLocal(uid).map((record) => [record.id, record])
    );

    incomingRecords.forEach((record) => {
      byId.set(record.id, record);
    });
    writeLocal(uid, Array.from(byId.values()));
    onProgress?.(100);
    return;
  }

  const chunks = chunkRecords(incomingRecords, 400);
  let completed = 0;

  for (const chunk of chunks) {
    const batch = writeBatch(db);

    chunk.forEach((record) => {
      batch.set(
        doc(db!, "users", uid, "records", record.id),
        record
      );
    });
    await batch.commit();
    completed += chunk.length;
    onProgress?.(
      Math.round((completed / incomingRecords.length) * 100)
    );
  }
}

export async function removeRecord(
  uid: string,
  record: RecordItem
): Promise<void> {
  if (storage && record.filePath) {
    try {
      await deleteObject(ref(storage, record.filePath));
    } catch {
      // Il file potrebbe essere già stato rimosso.
    }
  }

  if (db) {
    await deleteDoc(
      doc(db, "users", uid, "records", record.id)
    );
  } else {
    writeLocal(
      uid,
      readLocal(uid).filter((item) => item.id !== record.id)
    );
  }
}

export async function removeRecords(
  uid: string,
  records: RecordItem[]
): Promise<void> {
  if (!records.length) return;

  if (storage) {
    await Promise.all(
      records
        .filter((record) => record.filePath)
        .map(async (record) => {
          try {
            await deleteObject(ref(storage!, record.filePath!));
          } catch {
            // Il file potrebbe essere già stato rimosso.
          }
        })
    );
  }

  if (!db) {
    const ids = new Set(records.map((record) => record.id));
    writeLocal(
      uid,
      readLocal(uid).filter((record) => !ids.has(record.id))
    );
    return;
  }

  for (const chunk of chunkRecords(records, 400)) {
    const batch = writeBatch(db);
    chunk.forEach((record) => {
      batch.delete(doc(db!, "users", uid, "records", record.id));
    });
    await batch.commit();
  }
}

export async function replaceRecords(
  uid: string,
  records: RecordItem[]
): Promise<void> {
  if (!db) {
    writeLocal(uid, records);
    return;
  }

  const firestore = db;
  const snapshot = await getDocs(
    collection(firestore, "users", uid, "records")
  );
  const incomingIds = new Set(records.map((item) => item.id));

  await Promise.all([
    ...snapshot.docs
      .filter((item) => !incomingIds.has(item.id))
      .map((item) => deleteDoc(item.ref)),
    ...records.map((item) =>
      setDoc(
        doc(firestore, "users", uid, "records", item.id),
        item
      )
    ),
  ]);
}

function chunkRecords(records: RecordItem[], size: number) {
  const chunks: RecordItem[][] = [];

  for (let index = 0; index < records.length; index += size) {
    chunks.push(records.slice(index, index + size));
  }

  return chunks;
}
