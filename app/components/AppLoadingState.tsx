type AppLoadingStateProps = {
  compact?: boolean;
};

export default function AppLoadingState({ compact = false }: AppLoadingStateProps) {
  return (
    <div className={`loading-state ${compact ? "loading-state-compact" : ""}`} aria-label="Loading">
      <div className="loading-state-minimal">
        <div className="loading-state-b2 loading-b2-minimal" aria-hidden="true">
          <svg viewBox="0 0 160 72" fill="none" role="presentation" className="loading-b2-shape">
            <path
              d="M80 5L156 38L140 50L116 36L102 44L92 37L80 48L68 37L58 44L44 36L20 50L4 38L80 5Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <p className="loading-minimal-text">Loading...</p>
      </div>
    </div>
  );
}
