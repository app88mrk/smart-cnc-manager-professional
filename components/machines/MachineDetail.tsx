"use client";

import { Pencil, X } from "lucide-react";
import Spec from "@/components/common/Spec";
import MachineDocuments from "@/components/machines/MachineDocuments";
import MachineMaintenance from "@/components/machines/MachineMaintenance";
import { Machine, MaintenanceRecord } from "@/types";

interface MachineDetailProps {
  uid: string;
  machine: Machine;
  maintenance: MaintenanceRecord[];
  close: () => void;
  edit: () => void;
  addMaintenance: () => void;
  onError: (message: string) => void;
}

export default function MachineDetail({
  uid,
  machine,
  maintenance,
  close,
  edit,
  addMaintenance,
  onError,
}: MachineDetailProps) {
  return (
    <div className="modal">
      <div className="detailCard">
        <div className="detailHero">
          {machine.photoUrl ? (
            <img src={machine.photoUrl} alt={`${machine.brand} ${machine.model}`} />
          ) : (
            <div className="detailPlaceholder">▦</div>
          )}
          <button onClick={close}><X /></button>
        </div>

        <div className="detailContent">
          <div className="detailHeading">
            <div>
              <span className={`statusBadge ${statusClass(machine.status)}`}>
                {machine.status}
              </span>
              <h2>{machine.brand} {machine.model}</h2>
              <p>{machine.serialNumber ? `Matricola ${machine.serialNumber}` : "Matricola non inserita"}</p>
            </div>
            <button className="primary" onClick={edit}>
              <Pencil size={17} /> Modifica
            </button>
          </div>

          <section className="specGrid">
            <Spec label="Anno" value={machine.year} />
            <Spec label="Controllo CNC" value={machine.cncControl} />
            <Spec label="Corsa X" value={unit(machine.travelX)} />
            <Spec label="Corsa Y" value={unit(machine.travelY)} />
            <Spec label="Corsa Z" value={unit(machine.travelZ)} />
            <Spec label="Mandrino" value={machine.spindle} />
            <Spec label="Attacco utensile" value={machine.toolTaper} />
            <Spec label="Magazzino" value={machine.toolMagazine} />
            <Spec label="Reparto" value={machine.department} />
          </section>

          {machine.notes && (
            <div className="notesBox">
              <b>Note tecniche</b>
              <p>{machine.notes}</p>
            </div>
          )}

          <MachineMaintenance records={maintenance} add={addMaintenance} />
          <MachineDocuments uid={uid} machineId={machine.id} onError={onError} />
        </div>
      </div>
    </div>
  );
}

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function unit(value: string) {
  return value ? `${value} mm` : "—";
}
