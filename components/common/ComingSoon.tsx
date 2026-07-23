import { modules } from "@/lib/modules";
import { ModuleId } from "@/types";

type ComingSoonProps = {
  active: ModuleId;
};

export default function ComingSoon({ active }: ComingSoonProps) {
  const module = modules.find((m) => m.id === active)!;

  return (
    <>
      <div className="pageHead">
        <div>
          <p>PROSSIMO MODULO</p>
          <h1>{module.label}</h1>
          <span>{module.description}</span>
        </div>
      </div>

      <div className="empty">
        <strong>Modulo in preparazione</strong>

        <span>
          La base Macchine è pronta; questo modulo verrà collegato alle
          singole schede.
        </span>
      </div>
    </>
  );
}