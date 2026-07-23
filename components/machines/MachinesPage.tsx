"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Machine } from "@/types";

interface MachinesPageProps {
  machines: Machine[];
  openNew: () => void;
  openEdit: (machine: Machine) => void;
  openDetail: (machine: Machine) => void;
  onDelete: (machine: Machine) => void;
}

export default function MachinesPage({
  machines,
  openNew,
  openEdit,
  openDetail,
  onDelete,
}: MachinesPageProps) {
  return (
    <>
      <div className="pageHead">
        <div>
          <p>PARCO MACCHINE</p>
          <h1>Macchine</h1>
          <span>Schede tecniche, foto e dati identificativi.</span>
        </div>
        <button className="primary" onClick={openNew}>
          <Plus size={18} /> Nuova macchina
        </button>
      </div>

      <section className="machineGrid">
        {machines.length ? (
          machines.map((machine) => (
            <article className="machineCard" key={machine.id}>
              <button className="machinePhoto" onClick={() => openDetail(machine)}>
                {machine.photoUrl ? (
                  <img src={machine.photoUrl} alt={`${machine.brand} ${machine.model}`} />
                ) : (
                  <span>▦</span>
                )}
              </button>

              <div className="machineBody">
                <div className="machineTop">
                  <span className={`statusBadge ${statusClass(machine.status)}`}>
                    {machine.status}
                  </span>

                  <div className="cardActions">
                    <button onClick={() => openEdit(machine)} title="Modifica">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => onDelete(machine)} title="Elimina">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <button className="machineTitle" onClick={() => openDetail(machine)}>
                  <h3>{machine.brand || "Marca"} {machine.model || "Modello"}</h3>
                  <p>
                    {machine.serialNumber
                      ? `Matricola ${machine.serialNumber}`
                      : "Matricola non inserita"}
                  </p>
                </button>

                <dl>
                  <div><dt>Controllo</dt><dd>{machine.cncControl || "—"}</dd></div>
                  <div><dt>Reparto</dt><dd>{machine.department || "—"}</dd></div>
                </dl>

                <button className="openDetail" onClick={() => openDetail(machine)}>
                  Apri scheda
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            <strong>Nessuna macchina trovata</strong>
            <span>Crea la prima scheda oppure modifica la ricerca.</span>
            <button className="primary" onClick={openNew}>
              <Plus size={17} /> Nuova macchina
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-");
}
