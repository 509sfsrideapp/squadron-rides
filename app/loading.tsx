export default function Loading() {
  return (
    <main className="loading-screen" aria-label="Loading Defender Drivers">
      <div className="loading-frame">
        <div className="loading-header">
          <p className="loading-kicker">Defender Drivers</p>
          <h1>Mission Loading</h1>
          <p className="loading-copy">
            Routing your ride operations through Global Strike Command.
          </p>
        </div>

        <div className="loading-runway" aria-hidden="true">
          <div className="loading-origin">
            <div className="loading-origin-ring" />
            <div className="loading-origin-core">
              <span>AFGSC</span>
            </div>
          </div>

          <div className="loading-track">
            <div className="loading-track-line" />
            <div className="loading-b2">
              <svg viewBox="0 0 160 72" fill="none" role="presentation">
                <path
                  d="M80 10L128 24L154 36L128 40L102 46L92 56H68L58 46L32 40L6 36L32 24L80 10Z"
                  fill="currentColor"
                />
                <path
                  d="M80 21L110 29L127 36L108 38L92 41L86 49H74L68 41L52 38L33 36L50 29L80 21Z"
                  fill="rgba(255,255,255,0.16)"
                />
              </svg>
            </div>
          </div>

          <div className="loading-target">
            <div className="loading-target-ring loading-target-ring-outer" />
            <div className="loading-target-ring loading-target-ring-mid" />
            <div className="loading-target-ring loading-target-ring-inner" />
            <div className="loading-target-dot" />
          </div>
        </div>

        <div className="loading-progress" aria-hidden="true">
          <span className="loading-progress-label">Establishing route</span>
          <div className="loading-progress-bar">
            <div className="loading-progress-fill" />
          </div>
        </div>
      </div>
    </main>
  );
}
