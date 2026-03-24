export default function Loading() {
  return (
    <main className="loading-screen" aria-label="Loading Defender Drivers">
      <div className="loading-minimal">
        <div className="loading-b2 loading-b2-minimal" aria-hidden="true">
          <svg viewBox="0 0 160 72" fill="none" role="presentation" className="loading-b2-shape">
            <path
              d="M80 5L156 38L140 50L116 36L102 44L92 37L80 48L68 37L58 44L44 36L20 50L4 38L80 5Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <p className="loading-minimal-text">Loading...</p>
      </div>
    </main>
  );
}
