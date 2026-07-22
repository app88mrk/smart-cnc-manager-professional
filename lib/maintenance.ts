import { db } from "@/lib/firebase";
import { MaintenanceRecord } from "@/types";
import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";

const localKey = (uid: string) => `smart-cnc-maintenance-${uid}`;
function readLocal(uid: string): MaintenanceRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(localKey(uid)) || "[]") as MaintenanceRecord[]; } catch { return []; }
}
function writeLocal(uid: string, records: MaintenanceRecord[]) { localStorage.setItem(localKey(uid), JSON.stringify(records)); }

export async function listMaintenance(uid: string): Promise<MaintenanceRecord[]> {
  if (!db) return readLocal(uid);
  const snap = await getDocs(query(collection(db, "users", uid, "maintenance"), orderBy("scheduledDate", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord));
}
export async function saveMaintenance(uid: string, record: MaintenanceRecord): Promise<void> {
  if (db) await setDoc(doc(db, "users", uid, "maintenance", record.id), record);
  else {
    const all = readLocal(uid); const i = all.findIndex(x => x.id === record.id);
    if (i >= 0) all[i] = record; else all.unshift(record); writeLocal(uid, all);
  }
}
export async function removeMaintenance(uid: string, id: string): Promise<void> {
  if (db) await deleteDoc(doc(db, "users", uid, "maintenance", id));
  else writeLocal(uid, readLocal(uid).filter(x => x.id !== id));
}
