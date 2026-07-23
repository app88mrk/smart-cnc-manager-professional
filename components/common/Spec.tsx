type SpecProps = {
  label: string;
  value?: string;
};

export default function Spec({ label, value }: SpecProps) {
  return (
    <div>
      <span>{label}</span>
      <b>{value || "—"}</b>
    </div>
  );
}