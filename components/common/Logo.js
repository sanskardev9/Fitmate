const MARK_PATHS = ["M176 256h160", "M176 176v160", "M336 176v160", "M120 216v80", "M392 216v80"];

// `animated` draws the dumbbell stroke by stroke, then the tile settles in.
export function LogoMark({ className = "h-10 w-10", animated = false }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="120" fill="#059669" className={animated ? "origin-center animate-scale-in" : ""} />
      {MARK_PATHS.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="#fff"
          strokeWidth="36"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray={animated ? 1 : undefined}
          className={animated ? "animate-draw" : ""}
          style={animated ? { animationDelay: `${250 + i * 120}ms` } : undefined}
        />
      ))}
    </svg>
  );
}

export default function Logo({ size = "md", animated = false }) {
  const big = size === "lg";
  return (
    <div className={`flex items-center ${big ? "flex-col gap-4" : "gap-2"}`}>
      <LogoMark className={big ? "h-20 w-20" : "h-8 w-8"} animated={animated} />
      <div className={big ? "text-center" : ""}>
        <p className={`font-bold tracking-tight ${big ? "text-3xl" : "text-lg"} ${animated ? "animate-fade-up [animation-delay:700ms]" : ""}`}>
          Fit<span className="text-emerald-600 dark:text-emerald-400">Mate</span>
        </p>
        {big && (
          <p className={`mt-1 text-sm text-neutral-500 ${animated ? "animate-fade-up [animation-delay:850ms]" : ""}`}>
            Your Fitness. Your Nutrition. Your Progress.
          </p>
        )}
      </div>
    </div>
  );
}
