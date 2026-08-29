/**
 * The Render Quest mark: an eye, a near plane, and a far plane — the diagram
 * every graphics course draws in its first week.
 */
export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <path
        d="M12.6 11.2 L25.8 4.6 L25.8 27.4 L12.6 20.8 Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M5.6 16 L25.8 4.6 M5.6 16 L25.8 27.4"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M25.8 4.6 L25.8 27.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12.6 11.2 L12.6 20.8"
        stroke="#e8ebf0"
        strokeWidth="2.9"
        strokeLinecap="round"
      />
      <circle cx="5.6" cy="16" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-2.5 ${className}`}>
      <Mark className="h-7 w-7 shrink-0 text-accent" />
      <span className="whitespace-nowrap text-[0.95rem] font-semibold tracking-tight text-fg">
        Render<span className="text-fg-muted"> Quest</span>
      </span>
    </span>
  );
}
