import { db, storage } from "@/lib/firebase";
import { Machine } from "@/types";
import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

const localKey = (uid: string) => `smart-cnc-machines-${uid}`;

function readLocal(uid: string): Machine[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(localKey(uid)) || "[]") as Machine[]; }
  catch { return []; }
}
function writeLocal(uid: string, machines: Machine[]) {
  localStorage.setItem(localKey(uid), JSON.stringify(machines));
}

export async function listMachines(uid: string): Promise<Machine[]> {
  if (!db) return readLocal(uid);
  const snap = await getDocs(query(collection(db, "users", uid, "machines"), orderBy("updatedAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Machine));
}

export async function saveMachine(uid: string, machine: Machine, photo?: File | null): Promise<Machine> {
  let saved = { ...machine };
  if (photo && storage) {
    if (saved.photoPath) {
      try { await deleteObject(ref(storage, saved.photoPath)); } catch { /* old file may not exist */ }
    }
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `users/${uid}/machines/${saved.id}/photo/${Date.now()}-${safeName}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, photo, { contentType: photo.type || "application/octet-stream" });
    saved = { ...saved, photoUrl: await getDownloadURL(fileRef), photoPath: path };
  }
  if (db) {
    await setDoc(doc(db, "users", uid, "machines", saved.id), saved);
  } else {
    const all = readLocal(uid);
    const index = all.findIndex(item => item.id === saved.id);
    if (index >= 0) all[index] = saved; else all.unshift(saved);
    writeLocal(uid, all);
  }
  return saved;
}

export async function removeMachine(uid: string, machine: Machine): Promise<void> {
  if (machine.photoPath && storage) {
    try { await deleteObject(ref(storage, machine.photoPath)); } catch { /* already removed */ }
  }
  if (db) await deleteDoc(doc(db, "users", uid, "machines", machine.id));
  else writeLocal(uid, readLocal(uid).filter(item => item.id !== machine.id));
}
