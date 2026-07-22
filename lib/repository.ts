import { RecordItem, ModuleId } from "@/types";
const KEY="smart-cnc-manager-professional";
const seed: RecordItem[]=[
 {id:"m1",module:"machines",title:"DMG Mori CMX 1100 V",subtitle:"Fresatrice verticale",status:"Operativa",machine:"CMX 1100 V",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
 {id:"a1",module:"alarms",title:"Alarm 401",subtitle:"Sovraccarico asse X",status:"Risolto",machine:"CMX 1100 V",notes:"Controllare lubrificazione e guide.",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
 {id:"n1",module:"maintenance",title:"Controllo lubrificazione",subtitle:"Intervento mensile",status:"Pianificata",machine:"CMX 1100 V",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
];
function read():RecordItem[]{ if(typeof window==="undefined") return seed; const raw=localStorage.getItem(KEY); if(!raw){localStorage.setItem(KEY,JSON.stringify(seed));return seed;} try{return JSON.parse(raw)}catch{return seed} }
function write(items:RecordItem[]){localStorage.setItem(KEY,JSON.stringify(items))}
export const repository={
 list(module?:ModuleId){const all=read();return module&&module!=="dashboard"?all.filter(x=>x.module===module):all},
 save(item:RecordItem){const all=read();const i=all.findIndex(x=>x.id===item.id);if(i>=0)all[i]=item;else all.unshift(item);write(all)},
 remove(id:string){write(read().filter(x=>x.id!==id))},
 export(){return JSON.stringify(read(),null,2)},
 import(raw:string){const parsed=JSON.parse(raw) as RecordItem[];write(parsed)}
};
