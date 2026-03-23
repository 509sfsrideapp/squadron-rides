type AppLoadingStateProps = {
  title?: string;
  caption?: string;
  compact?: boolean;
};

export default function AppLoadingState({
  title = "Mission Loading",
  caption = "Routing your ride operations through Global Strike Command.",
  compact = false,
}: AppLoadingStateProps) {
  return (
    <div className={`loading-state ${compact ? "loading-state-compact" : ""}`} aria-label={title}>
      <div className="loading-state-visual" aria-hidden="true">
        <div className="loading-state-track" />
        <div className="loading-state-b2">
          <svg viewBox="0 0 160 72" fill="none" role="presentation">
            <path
              d="M80 8L154 38L140 50L113 31L99 42L90 35L80 44L70 35L61 42L47 31L20 50L6 38L80 8Z"
              fill="currentColor"
            />
            <path
              d="M80 17L135 39L126 46L111 35L98 43L90 37L80 46L70 37L62 43L49 35L34 46L25 39L80 17Z"
              fill="rgba(255,255,255,0.12)"
            />
          </svg>
        </div>
        <div className="loading-state-target">
          <span />
        </div>
      </div>
      <div>
        <p className="loading-state-title">{title}</p>
        <p className="loading-state-caption">{caption}</p>
      </div>
    </div>
  );
}
