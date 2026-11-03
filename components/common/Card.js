// Standard app card. `icon` is a lucide-react component shown in a tinted tile next to the title.
export default function Card({ title, subtitle, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="truncate font-semibold">{title}</h2>}
              {subtitle && <p className="truncate text-xs text-neutral-500">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
