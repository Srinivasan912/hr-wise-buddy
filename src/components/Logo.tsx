export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Attendance management">
        <defs>
          <linearGradient id="lg-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--primary)" />
            <stop offset="1" stopColor="var(--primary-glow)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#lg-g)" />
        <path d="M10 17.5l4 4 8-9" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="9" r="2.2" fill="white" />
      </svg>
      {withText && <span className="font-semibold tracking-tight text-foreground">Techno<span className="text-primary">HR</span></span>}
    </div>
  );
}
