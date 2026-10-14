type FieldProps = {
  label: string;
  value: string;
  set: (value: string) => void;
  required?: boolean;
  type?: string;
  full?: boolean;
};

export default function Field({
  label,
  value,
  set,
  required = false,
  type = "text",
  full = false,
}: FieldProps) {
  return (
    <label className={full ? "full" : ""}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
        required={required}
      />
    </label>
  );
}