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
                  d="M80 8L154 38L140 50L113 31L99 42L90 35L80 44L70 35L61 42L47 31L20 50L6 38L80 8Z"
                  fill="currentColor"
                />
                <path
                  d="M80 17L135 39L126 46L111 35L98 43L90 37L80 46L70 37L62 43L49 35L34 46L25 39L80 17Z"
                  fill="rgba(255,255,255,0.12)"
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
