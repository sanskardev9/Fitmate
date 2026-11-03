// Small pill toggle, e.g. Reps | Sec | Min.
export default function Segmented({ options, value, onChange, className = "" }) {
  return (
    <div className={`inline-flex rounded-lg bg-neutral-200 p-0.5 text-xs dark:bg-neutral-800 ${className}`}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-md px-2.5 py-1 ${value === v ? "bg-white font-semibold shadow-sm dark:bg-neutral-700" : "text-neutral-500"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
