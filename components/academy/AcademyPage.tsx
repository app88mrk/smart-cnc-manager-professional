"use client";

type Props={close:()=>void};
export default function AcademyPage({close}:Props){
  return <div className="academyFullscreen"><button className="academyExit" onClick={close} title="Torna all'app">×</button><iframe title="Accademia CNC FANUC 32i" src="/accademia-cnc.html" className="academyFrame" /></div>;
}
