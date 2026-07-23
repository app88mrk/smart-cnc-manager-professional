type KpiProps = {
  label: string;
  value: number;
  icon: string;
};

export default function Kpi({ label, value, icon }: KpiProps) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <i>{icon}</i>
      </div>
    </div>
  );
}