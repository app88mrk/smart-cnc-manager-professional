import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
export type Cycle={id:string;name:string;machine:string;material:string;program:string;notes:string;updatedAt:string};
const key=(uid:string)=>`smart-cnc-cycles-${uid}`;
function local(uid:string):Cycle[]{try{return JSON.parse(localStorage.getItem(key(uid))||"[]")}catch{return[]}}
function write(uid:string,items:Cycle[]){localStorage.setItem(key(uid),JSON.stringify(items))}
export async function listCycles(uid:string):Promise<Cycle[]>{if(!db)return local(uid);const s=await getDocs(query(collection(db,"users",uid,"cycles"),orderBy("updatedAt","desc")));return s.docs.map(x=>({id:x.id,...x.data()}) as Cycle)}
export async function saveCycle(uid:string,cycle:Cycle){if(db)await setDoc(doc(db,"users",uid,"cycles",cycle.id),cycle);else{const items=local(uid);write(uid,[cycle,...items.filter(x=>x.id!==cycle.id)])}}
export async function deleteCycle(uid:string,id:string){if(db)await deleteDoc(doc(db,"users",uid,"cycles",id));else write(uid,local(uid).filter(x=>x.id!==id))}
