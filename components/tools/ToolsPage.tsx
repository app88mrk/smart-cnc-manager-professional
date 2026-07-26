"use client";

import {
  type ReactNode,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Clock3,
  Hash,
  LoaderCircle,
  MapPin,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  formatToolNumber,
  getToolAlert,
  isLifeExpired,
  isLowStock,
  isOutOfStock,
  normalizeToolDetails,
  parseToolNumber,
  remainingToolHours,
  toolCategories,
  toolLifePercentage,
  toolMatchesFilter,
  ToolAlert,
} from "@/lib/tools";
import {
  Machine,
  RecordItem,
  ToolCategory,
} from "@/types";

type ToolsPageProps = {
  records: RecordItem[];
  machines: Machine[];
  loading: boolean;
  openNew: () => void;
  openEdit: (record: RecordItem) => void;
  onDelete: (record: RecordItem) => void;
};

type AlertFilter = "all" | ToolAlert;

export default function ToolsPage({
  records,
  machines,
  loading,
  openNew,
  openEdit,
  onDelete,
}: ToolsPageProps) {
  const [category, setCategory] = useState<
    "all" | ToolCategory
  >("all");
  const [status, setStatus] = useState("all");
  const [alertFilter, setAlertFilter] =
    useState<AlertFilter>("all");

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(records.map((record) => record.status))
      ),
    [records]
  );

  const visibleRecords = useMemo(
    () =>
      records.filter((record) => {
        const tool = normalizeToolDetails(record);

        return (
          (category === "all" ||
            tool.category === category) &&
          (status === "all" || record.status === status) &&
          toolMatchesFilter(record, alertFilter)
        );
      }),
    [alertFilter, category, records, status]
  );

  const lowStock = records.filter(isLowStock).length;
  const expiredLife = records.filter(isLifeExpired).length;
  const available = records.filter(
    (record) =>
      record.status === "Disponibile" &&
      !isOutOfStock(record)
  ).length;

  const machineName = (record: RecordItem) => {
    const machine = machines.find(
      (item) => item.id === record.machineId
    );

    return machine
      ? `${machine.brand} ${machine.model}`
      : record.machine;
  };

  return (
    <>
      <div className="pageHead">
        <div>
          <p>GESTIONE UTENSILI PROFESSIONALE</p>
          <h1>Utensili</h1>
          <span>
            Anagrafica tecnica, scorte e controllo della vita
            utensile.
          </span>
        </div>

        <button className="primary" onClick={openNew}>
          <Plus size={18} />
          Nuovo utensile
        </button>
      </div>

      <section className="toolStats">
        <ToolStat
          label="Utensili registrati"
          value={records.length}
          icon={<Package size={20} />}
        />
        <ToolStat
          label="Disponibili"
          value={available}
          icon={<Package size={20} />}
          tone="success"
        />
        <ToolStat
          label="Scorta bassa"
          value={lowStock}
          icon={<AlertTriangle size={20} />}
          tone={lowStock ? "warning" : "default"}
        />
        <ToolStat
          label="Vita esaurita"
          value={expiredLife}
          icon={<Clock3 size={20} />}
          tone={expiredLife ? "danger" : "default"}
        />
      </section>

      <section className="toolFilters" aria-label="Filtri utensili">
        <label>
          <span>Categoria</span>
          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value as "all" | ToolCategory
              )
            }
          >
            <option value="all">Tutte le categorie</option>
            {toolCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Stato</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Tutti gli stati</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <div className="toolAlertFilters">
          <span>Priorità</span>
          <div>
            {[
              ["all", "Tutti"],
              ["critical", "Critici"],
              ["warning", "Attenzione"],
              ["ok", "Regolari"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={
                  alertFilter === value ? "active" : ""
                }
                onClick={() =>
                  setAlertFilter(value as AlertFilter)
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <strong className="toolResultCount">
          {visibleRecords.length} risultati
        </strong>
      </section>

      {loading && (
        <div className="inlineLoading" role="status">
          <LoaderCircle className="spinner" size={18} />
          Aggiornamento utensili…
        </div>
      )}

      <section className="toolGrid">
        {visibleRecords.length ? (
          visibleRecords.map((record) => {
            const tool = normalizeToolDetails(record);
            const alert = getToolAlert(record);
            const lifePercentage =
              toolLifePercentage(record);
            const remainingHours =
              remainingToolHours(record);
            const quantity = parseToolNumber(tool.quantity);
            const minimum = parseToolNumber(tool.minStock);

            return (
              <article
                className={`toolCard ${alert}`}
                key={record.id}
              >
                <div className="toolCardHead">
                  <div>
                    <span className="toolCode">
                      <Hash size={13} />
                      {tool.code || "Senza codice"}
                    </span>
                    <span className="toolCategory">
                      {tool.category}
                    </span>
                  </div>

                  <div className="cardActions">
                    <button
                      onClick={() => openEdit(record)}
                      title="Modifica utensile"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(record)}
                      title="Elimina utensile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="toolStatusRow">
                  <span className="statusBadge">
                    {record.status}
                  </span>
                  {alert !== "ok" && (
                    <span className={`toolAlert ${alert}`}>
                      <AlertTriangle size={13} />
                      {alertLabel(record)}
                    </span>
                  )}
                </div>

                <h3>{record.title}</h3>
                <p className="toolManufacturer">
                  {[tool.manufacturer, tool.material, tool.coating]
                    .filter(Boolean)
                    .join(" · ") || "Specifiche da completare"}
                </p>

                <dl className="toolSpecs">
                  <div>
                    <dt>Diametro</dt>
                    <dd>
                      {tool.diameter
                        ? `Ø ${formatToolNumber(
                            parseToolNumber(tool.diameter)
                          )} mm`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Attacco</dt>
                    <dd>{tool.holder || "—"}</dd>
                  </div>
                  <div>
                    <dt>Taglienti</dt>
                    <dd>{tool.fluteCount || "—"}</dd>
                  </div>
                  <div>
                    <dt>Macchina</dt>
                    <dd>{machineName(record) || "Generico"}</dd>
                  </div>
                </dl>

                <div className="toolControl">
                  <div className="toolControlHead">
                    <span>Scorta</span>
                    <b>
                      {formatToolNumber(quantity)}
                      {minimum > 0
                        ? ` / min ${formatToolNumber(minimum)}`
                        : ""}
                    </b>
                  </div>
                  <div
                    className={`stockBar ${
                      isLowStock(record) ? "low" : ""
                    }`}
                  >
                    <i
                      style={{
                        width: `${stockPercentage(
                          quantity,
                          minimum
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="toolControl">
                  <div className="toolControlHead">
                    <span>Vita utensile</span>
                    <b>
                      {remainingHours === null
                        ? "Non configurata"
                        : `${formatToolNumber(
                            remainingHours
                          )} h residue`}
                    </b>
                  </div>
                  <div
                    className={`lifeBar ${
                      lifePercentage >= 100 ? "expired" : ""
                    }`}
                  >
                    <i style={{ width: `${lifePercentage}%` }} />
                  </div>
                </div>

                <div className="toolCardFooter">
                  <span>
                    <MapPin size={14} />
                    {tool.location || "Posizione non indicata"}
                  </span>
                  {tool.unitCost && (
                    <b>{formatCurrency(tool.unitCost)}</b>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty">
            <strong>
              {records.length
                ? "Nessun utensile corrisponde ai filtri"
                : "Nessun utensile registrato"}
            </strong>
            <span>
              {records.length
                ? "Modifica i filtri per visualizzare altri utensili."
                : "Crea la prima scheda tecnica utensile."}
            </span>
            {!records.length && (
              <button className="primary" onClick={openNew}>
                <Plus size={17} />
                Nuovo utensile
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}

type ToolStatProps = {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
};

function ToolStat({
  label,
  value,
  icon,
  tone = "default",
}: ToolStatProps) {
  return (
    <div className={`toolStat ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <i>{icon}</i>
    </div>
  );
}

function alertLabel(record: RecordItem) {
  if (isOutOfStock(record)) {
    return "Scorta esaurita";
  }

  if (isLifeExpired(record)) {
    return "Vita esaurita";
  }

  if (isLowStock(record)) {
    return "Scorta bassa";
  }

  return "Da riaffilare";
}

function stockPercentage(quantity: number, minimum: number) {
  if (minimum <= 0) {
    return quantity > 0 ? 100 : 0;
  }

  return Math.min(
    100,
    Math.round((quantity / Math.max(minimum * 2, 1)) * 100)
  );
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(parseToolNumber(value));
}
