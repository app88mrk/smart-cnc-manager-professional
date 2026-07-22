import { db, storage } from "@/lib/firebase";
import { MachineDocument } from "@/types";
import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const localKey = (uid: string, machineId: string) => `smart-cnc-documents-${uid}-${machineId}`;

function readLocal(uid: string, machineId: string): MachineDocument[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(localKey(uid, machineId)) || "[]") as MachineDocument[]; }
  catch { return []; }
}

function writeLocal(uid: string, machineId: string, documents: MachineDocument[]) {
  localStorage.setItem(localKey(uid, machineId), JSON.stringify(documents));
}

export async function listMachineDocuments(uid: string, machineId: string): Promise<MachineDocument[]> {
  if (!db) return readLocal(uid, machineId);
  const snap = await getDocs(query(collection(db, "users", uid, "machines", machineId, "documents"), orderBy("createdAt", "desc")));
  return snap.docs.map(item => ({ id: item.id, ...item.data() } as MachineDocument));
}

export async function uploadMachineDocument(uid: string, machineId: string, file: File): Promise<MachineDocument> {
  if (!db || !storage) throw new Error("Configura Firebase per caricare e conservare gli allegati.");
  if (!file.size) throw new Error("Il file selezionato è vuoto.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Il file supera il limite di 100 MB.");

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `users/${uid}/machines/${machineId}/documents/${id}/${safeName}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });

  const createdAt = new Date().toISOString();
  const document: MachineDocument = {
    id,
    machineId,
    name: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    storagePath,
    downloadUrl: await getDownloadURL(fileRef),
    createdAt,
    updatedAt: createdAt,
  };
  await setDoc(doc(db, "users", uid, "machines", machineId, "documents", id), document);
  return document;
}

export async function removeMachineDocument(uid: string, document: MachineDocument): Promise<void> {
  if (storage && document.storagePath) {
    try { await deleteObject(ref(storage, document.storagePath)); } catch { /* file may already be gone */ }
  }
  if (db) {
    await deleteDoc(doc(db, "users", uid, "machines", document.machineId, "documents", document.id));
  } else {
    writeLocal(uid, document.machineId, readLocal(uid, document.machineId).filter(item => item.id !== document.id));
  }
}
