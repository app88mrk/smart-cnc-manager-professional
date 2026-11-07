"use client";
import { useEffect } from "react";
type Props={close:()=>void};
export default function AcademyPage({close}:Props){
  useEffect(()=>{const onMessage=(event:MessageEvent)=>{if(event.data?.type==="academy-go-dashboard") close();};window.addEventListener("message",onMessage);return()=>window.removeEventListener("message",onMessage);},[close]);
  return <div className="academyFullscreen"><button className="academyExit" onClick={close} title="Torna all'app">×</button><iframe title="Accademia CNC FANUC 32i" src="/accademia-cnc.html" className="academyFrame" /></div>;
}
