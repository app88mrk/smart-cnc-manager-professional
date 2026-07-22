import { ModuleId, RecordItem } from "@/types";
import { db, firebaseConfigured, storage } from "@/lib/firebase";
import {
  collection, deleteDoc, doc, getDocs, orderBy, query, setDoc
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

const KEY = "smart-cnc-manager-professional";
const seed: RecordItem[] = [
  {id:"m1",module:"machines",title:"DMG Mori CMX 1100 V",subtitle:"Fresatrice verticale",status:"Operativa",machine:"CMX 1100 V",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
  {id:"a1",module:"alarms",title:"Alarm 401",subtitle:"Sovraccarico asse X",status:"Risolto",machine:"CMX 1100 V",notes:"Controllare lubrificazione e guide.",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
  {id:"n1",module:"maintenance",title:"Controllo lubrificazione",subtitle:"Intervento mensile",status:"Pianificata",machine:"CMX 1100 V",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
];

function readLocal(): RecordItem[] {
  if (typeof window === "undefined") return seed;
  const raw = localStorage.getItem(KEY);
  if (!raw) { localStorage.setItem(KEY, JSON.stringify(seed)); return seed; }
  try { return JSON.parse(raw) as RecordItem[]; } catch { return seed; }
}
function writeLocal(items: RecordItem[]) { localStorage.setItem(KEY, JSON.stringify(items)); }
function userCollection(uid: string) {
  if (!db) throw new Error("Firestore non configurato");
  return collection(db, "users", uid, "records");
}

export const repository = {
  async list(uid?: string): Promise<RecordItem[]> {
    if (!firebaseConfigured || !uid) return readLocal();
    const snapshot = await getDocs(query(userCollection(uid), orderBy("updatedAt", "desc")));
    return snapshot.docs.map(d => d.data() as RecordItem);
  },
  async save(item: RecordItem, uid?: string): Promise<void> {
    if (!firebaseConfigured || !uid) {
      const all=readLocal(); const i=all.findIndex(x=>x.id===item.id);
      if(i>=0) all[i]=item; else all.unshift(item); writeLocal(all); return;
    }
    if (!db) throw new Error("Firestore non disponibile");
    await setDoc(doc(db, "users", uid, "records", item.id), item);
  },
  async remove(item: RecordItem, uid?: string): Promise<void> {
    if (!firebaseConfigured || !uid) { writeLocal(readLocal().filter(x=>x.id!==item.id)); return; }
    if (!db) throw new Error("Firestore non disponibile");
    if (item.filePath && storage) {
      try { await deleteObject(ref(storage, String(item.filePath))); } catch { /* file già assente */ }
    }
    await deleteDoc(doc(db, "users", uid, "records", item.id));
  },
  async upload(file: File, uid: string, module: ModuleId, recordId: string, onProgress?: (value:number)=>void) {
    if (!storage) throw new Error("Firebase Storage non configurato");
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`users/${uid}/${module}/${recordId}/${Date.now()}-${safeName}`;
    const task=uploadBytesResumable(ref(storage,path),file,{contentType:file.type||"application/octet-stream"});
    await new Promise<void>((resolve,reject)=>task.on("state_changed",s=>onProgress?.(Math.round((s.bytesTransferred/s.totalBytes)*100)),reject,()=>resolve()));
    return {fileName:file.name,filePath:path,fileUrl:await getDownloadURL(task.snapshot.ref),fileSize:file.size,fileType:file.type};
  },
  async export(uid?: string) { return JSON.stringify(await this.list(uid),null,2); },
  async import(raw:string, uid?:string) {
    const parsed=JSON.parse(raw) as RecordItem[];
    if(!Array.isArray(parsed)) throw new Error("Backup non valido");
    if(!firebaseConfigured||!uid){writeLocal(parsed);return;}
    await Promise.all(parsed.map(item=>this.save(item,uid)));
  }
};
