// Page title block shared by every app screen (same type scale as the website).
export default function PageHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <header className="animate-fade-up mb-6 flex items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 sm:flex dark:text-emerald-400">
            <Icon className="h-6 w-6" strokeWidth={1.8} />
          </span>
        )}
        <div className="min-w-0">
          {subtitle && <p className="truncate text-sm text-neutral-500">{subtitle}</p>}
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
