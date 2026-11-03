import { WEEKDAYS } from "@/lib/utils";

export default function WeekdayPicker({ value, onChange }) {
  function toggle(d) {
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort());
  }
  return (
    <div className="flex gap-1">
      {WEEKDAYS.map((label, d) => (
        <button
          key={label}
          type="button"
          onClick={() => toggle(d)}
          className={`flex-1 rounded-lg py-2 text-xs font-medium ${
            value.includes(d) ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          }`}
        >
          {label[0]}
          <span className="hidden sm:inline">{label.slice(1)}</span>
        </button>
      ))}
    </div>
  );
}
