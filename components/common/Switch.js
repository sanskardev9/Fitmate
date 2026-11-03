// On/off switch. The knob is pinned to the track's left edge and slides by an exact distance,
// so it can never leave the track.
export default function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${checked ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"}`}
    >
      <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}
